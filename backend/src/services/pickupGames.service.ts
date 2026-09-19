// src/services/pickupGames.service.ts
import { randomUUID } from 'crypto';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import pool from '../config/database';
import type {
  CreatePickupGameDTO,
  PickupGameRow,
} from '../models/pickupGame.model';
import { geocodeAddress } from '../services/geocoding.service';

export interface RegionStats {
  totalAthletes: number;
  activeCourts: number;
  liveGames: number;
  topRegion: string;
  stateCourts: number;
  stateAthletes: number;
  densityLevel: 'Low' | 'Moderate' | 'High' | 'Extreme';
  mapCenter: { lat: number; lng: number };
}

interface CountRow extends RowDataPacket {
  cnt: number;
}

interface RegionRow extends RowDataPacket {
  state: string | null;
  game_count: number;
}

interface CoordRow extends RowDataPacket {
  avgLat: number | string | null;
  avgLng: number | string | null;
}

export class PickupGamesService {
  /** Create a new pickup game */
  static async createGame(dto: CreatePickupGameDTO): Promise<PickupGameRow> {

    let lat = dto.lat ?? null;
    let lng = dto.lng ?? null;

    if ((lat === null || lng === null) && dto.location) {
      console.log('⏳ Backend geocoding location:', dto.location);
      try {
        const coords = await geocodeAddress(dto.location);
        if (coords) {
          lat = coords.lat;
          lng = coords.lng;
          console.log('✅ Backend geocoded:', coords);
        } else {
          console.warn('⚠️ Could not geocode:', dto.location);
        }
      } catch (err) {
        console.error('❌ Geocoding error:', err);
        // Continue with null — game still saves
      }
    }
    const sql = `
      INSERT INTO pickup_games
        (id, title, sport, competitive_level, location, lat, lng,
        date, time, creator_id, max_players, current_players, description, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'open')
    `;
    
    const values = [
      dto.id,
      dto.title,
      dto.sport,
      dto.competitiveLevel,
      dto.location,
      lat,                       // ✅ geocoded or null
      lng,           // ✅
      dto.date,
      dto.time,
      dto.creatorId,
      dto.maxPlayers,
      dto.description,
    ];

    await pool.execute<ResultSetHeader>(sql, values);

    const row = await PickupGamesService.getGameById(dto.id);
    if (!row) throw new Error('Failed to load created pickup game');
    return row;
  }

  /** Get single game by id (with creator info) */
  static async getGameById(id: string): Promise<PickupGameRow | null> {
    const [rows] = await pool.execute<PickupGameRow[]>(
      `SELECT pg.*, a.name AS creator_name, a.profilepicture AS creator_picture
       FROM pickup_games pg
       LEFT JOIN athletes a ON a.id = pg.creator_id
       WHERE pg.id = ?`,
      [id]
    );
    return rows[0] ?? null;
  }

  /** List all open games with filters */
  static async listOpenGames(filters: {
    search?: string;
    sport?: string;
    level?: string;
    date?: string;
  }): Promise<PickupGameRow[]> {
    const where: string[] = [`pg.status = 'open'`];
    const params: any[] = [];

    if (filters.search) {
      where.push(`(pg.title LIKE ? OR pg.location LIKE ?)`);
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }
    if (filters.sport && filters.sport !== 'all') {
      where.push(`pg.sport = ?`);
      params.push(filters.sport);
    }
    if (filters.level && filters.level !== 'all') {
      where.push(`pg.competitive_level = ?`);
      params.push(filters.level);
    }
    if (filters.date) {
      where.push(`pg.date = ?`);
      params.push(filters.date);
    }

    const [rows] = await pool.execute<PickupGameRow[]>(
      `SELECT pg.*, a.name AS creator_name, a.profilepicture AS creator_picture
       FROM pickup_games pg
       LEFT JOIN athletes a ON a.id = pg.creator_id
       WHERE ${where.join(' AND ')}
       ORDER BY pg.date ASC, pg.time ASC`,
      params
    );

    return rows;
  }

  /** ✅ NEW: Get region statistics for the map + inspector */
  static async getRegionStats(): Promise<RegionStats> {
    // 1. Total athletes
    const [athleteRows] = await pool.execute<CountRow[]>(
      `SELECT COUNT(*) AS cnt FROM athletes`
    );
    const totalAthletes = Number(athleteRows[0]?.cnt) || 0;

    // 2. Active courts — unique locations in open games
    const [courtRows] = await pool.execute<CountRow[]>(
      `SELECT COUNT(DISTINCT location) AS cnt
      FROM pickup_games WHERE status = 'open'`
    );
    const activeCourts = Number(courtRows[0]?.cnt) || 0;

    // 3. Live games — today + future
    const [gameRows] = await pool.execute<CountRow[]>(
      `SELECT COUNT(*) AS cnt
      FROM pickup_games
      WHERE status = 'open' AND date >= CURDATE()`
    );
    const liveGames = Number(gameRows[0]?.cnt) || 0;

    // 4. Top region — state with most games
    const [topRegionRows] = await pool.execute<RegionRow[]>(
      `SELECT a.state, COUNT(pg.id) AS game_count
      FROM pickup_games pg
      JOIN athletes a ON a.id = pg.creator_id
      WHERE pg.status = 'open' AND a.state IS NOT NULL
      GROUP BY a.state
      ORDER BY game_count DESC
      LIMIT 1`
    );
    const topRegion = topRegionRows[0]?.state ?? 'NY';

    // 5. State-level totals
    const [stateCourtRows] = await pool.execute<CountRow[]>(
      `SELECT COUNT(DISTINCT pg.location) AS cnt
      FROM pickup_games pg
      JOIN athletes a ON a.id = pg.creator_id
      WHERE a.state = ?`,
      [topRegion]
    );
    const stateCourts = Number(stateCourtRows[0]?.cnt) || 0;

    const [stateAthleteRows] = await pool.execute<CountRow[]>(
      `SELECT COUNT(*) AS cnt FROM athletes WHERE state = ?`,
      [topRegion]
    );
    const stateAthletes = Number(stateAthleteRows[0]?.cnt) || 0;

    // 6. Density based on live games
    let densityLevel: RegionStats['densityLevel'] = 'Low';
    if (liveGames > 20) densityLevel = 'Extreme';
    else if (liveGames > 10) densityLevel = 'High';
    else if (liveGames > 3) densityLevel = 'Moderate';

    // 7. Map center — average of coordinates
    let mapCenter = { lat: 40.7128, lng: -74.006 };   // fallback

    try {
      const [coordRows] = await pool.execute<CoordRow[]>(
        `SELECT AVG(lat) AS avgLat, AVG(lng) AS avgLng
        FROM pickup_games
        WHERE lat IS NOT NULL AND lng IS NOT NULL`
      );

      const avgLat = Number(coordRows[0]?.avgLat);
      const avgLng = Number(coordRows[0]?.avgLng);

      if (!isNaN(avgLat) && !isNaN(avgLng) && avgLat !== 0 && avgLng !== 0) {
        mapCenter = { lat: avgLat, lng: avgLng };
      }
    } catch {
      // lat/lng columns missing — use default
    }

    return {
      totalAthletes,
      activeCourts,
      liveGames,
      topRegion,
      stateCourts,
      stateAthletes,
      densityLevel,
      mapCenter,
    };
  }

  /** Build DTO from raw request body */
  static buildDTO(body: {
    gameTitle: string;
    sport: string;
    competitiveLevel?: string;
    venue: string;
    date: string;
    time: string;
    maxPlayers?: number;
    description?: string;
    creatorId: string;
  }): CreatePickupGameDTO {
    return {
      id: randomUUID(),
      title: body.gameTitle.trim(),
      sport: body.sport,
      competitiveLevel: body.competitiveLevel ?? 'casual',   // ✅ 'casual' (modal default)
      location: body.venue,
      date: body.date,
      time: body.time,
      creatorId: body.creatorId,
      maxPlayers: Number(body.maxPlayers) || 10,
      description: body.description?.trim() || null,
    };
  }


  /* ─── Join a game ─── */
static async joinGame(
  gameId: string,
  athleteId: string
): Promise<{ success: boolean; message: string }> {
  // Check game exists and is open
  
  const [gameRows] = await pool.execute<any[]>(
    `SELECT id, max_players, current_players, status 
     FROM pickup_games WHERE id = ?`,
    [gameId]
  );

  if (!gameRows[0]) {
    throw new Error('Game not found');
  }

  const game = gameRows[0];

  if (game.status !== 'open') {
    throw new Error('Game is not open for joining');
  }

  if (game.current_players >= game.max_players) {
    throw new Error('Game is full');
  }

  // Check if already joined
  const [existing] = await pool.execute<any[]>(
    `SELECT id FROM game_participants 
     WHERE game_id = ? AND athlete_id = ?`,
    [gameId, athleteId]
  );

  if (existing[0]) {
    throw new Error('Already joined this game');
  }

  // Insert participant
  await pool.execute(
    `INSERT INTO game_participants (game_id, athlete_id) VALUES (?, ?)`,
    [gameId, athleteId]
  );

  // Increment current_players
  await pool.execute(
    `UPDATE pickup_games 
     SET current_players = current_players + 1,
         status = CASE WHEN current_players + 1 >= max_players THEN 'full' ELSE 'open' END
     WHERE id = ?`,
    [gameId]
  );

  return { success: true, message: 'Joined successfully' };
}

/* ─── Leave a game ─── */
static async leaveGame(
  gameId: string,
  athleteId: string
): Promise<{ success: boolean; message: string }> {
  const [result] = await pool.execute<any>(
    `DELETE FROM game_participants 
     WHERE game_id = ? AND athlete_id = ?`,
    [gameId, athleteId]
  );

  if (result.affectedRows === 0) {
    throw new Error('Not a participant');
  }

  // Decrement current_players
  await pool.execute(
    `UPDATE pickup_games 
     SET current_players = GREATEST(0, current_players - 1),
         status = 'open'
     WHERE id = ?`,
    [gameId]
  );

  return { success: true, message: 'Left successfully' };
}

/* ─── Get participants for a game ─── */
static async getParticipants(gameId: string): Promise<any[]> {
  const [rows] = await pool.execute<any[]>(
    `SELECT 
       gp.id,
       gp.joined_at,
       a.id AS athlete_id,
       a.name,
       a.profilepicture,
       a.userhandle,
       a.position,
       a.primary_sport
     FROM game_participants gp
     JOIN athletes a ON a.id = gp.athlete_id
     WHERE gp.game_id = ?
     ORDER BY gp.joined_at ASC`,
    [gameId]
  );
  return rows;
}

  /* ─── Get participants for multiple games (bulk) ─── */
  static async getParticipantsForGames(
    gameIds: string[]
  ): Promise<Record<string, any[]>> {
    if (!gameIds.length) return {};

    const placeholders = gameIds.map(() => '?').join(',');
    const [rows] = await pool.execute<any[]>(
      `SELECT 
        gp.game_id,
        gp.id,
        gp.joined_at,
        a.id AS athlete_id,
        a.name,
        a.profilepicture,
        a.userhandle,
        a.position,
        a.primary_sport
      FROM game_participants gp
      JOIN athletes a ON a.id = gp.athlete_id
      WHERE gp.game_id IN (${placeholders})
      ORDER BY gp.joined_at ASC`,
      gameIds
    );

    const result: Record<string, any[]> = {};
    rows.forEach((row) => {
      if (!result[row.game_id]) result[row.game_id] = [];
      result[row.game_id].push(row);
    });

    return result;
  }

  /* ─── Get joined game IDs for a user ─── */
  static async getUserJoinedGames(athleteId: string): Promise<string[]> {
    const [rows] = await pool.execute<any[]>(
      `SELECT game_id FROM game_participants WHERE athlete_id = ?`,
      [athleteId]
    );
    return rows.map((r) => r.game_id);
  }
}
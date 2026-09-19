// backend/src/services/regional.service.ts
import pool from '../config/database';
import { RowDataPacket } from 'mysql2';

/* ═══════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════ */
export interface RegionalStats {
  city: string;
  state: string;
  rank: number;
  totalAthletes: number;
  avgXp: number;
  userXp: number;
  percentile: number;
  topSport: string;
  userLevel: number;
}

export interface LocalTournament {
  id: string;
  title: string;
  sport: string;
  city: string;
  state: string;
  courtName: string;
  address: string;
  description: string;
  startDate: string;
  endDate: string;
  status: string;
  format: string;
  organizerName: string;
  organizerAvatar: string;
  maxTeams: number;
  currentTeams: number;
  prizePool: string;
  entryFee: string;
  bannerUrl: string | null;
}

export interface LocalActivityItem {
  id: string;
  type: 'pickup' | 'tournament' | 'announcement';
  sport: string;
  title: string;
  description: string;
  location: string;
  city: string;
  state: string;
  time: string;
  attendeesCount?: number;
  gameId?: string;
  isHot?: boolean;
}

/* ═══════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════ */
function formatRelativeTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const diffMs = Date.now() - d.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hr ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } catch {
    return 'Recently';
  }
}

export class RegionalService {
  /* ═══════════════════════════════════════════
     REGIONAL STATS — rank user in their city
     ═══════════════════════════════════════════ */
  static async getRegionalStats(
    athleteId: string,
    sport?: string
  ): Promise<RegionalStats> {
    // Get user's location + XP
    const [userRows] = await pool.execute<RowDataPacket[]>(
      `SELECT city, state, valuexp, level, primary_sport 
       FROM athletes WHERE id = ?`,
      [athleteId]
    );

    if (userRows.length === 0) throw new Error('Athlete not found');

    const user = userRows[0];
    const userCity = user.city || 'New York';
    const userState = user.state || 'NY';
    const userXp = Number(user.valuexp) || 0;
    const topSport = sport || user.primary_sport || 'basketball';

    // Get all athletes in same city (optionally filter by sport)
    const [cityAthletes] = await pool.execute<RowDataPacket[]>(
      `SELECT id, valuexp FROM athletes 
       WHERE LOWER(city) = LOWER(?) 
         AND LOWER(state) = LOWER(?)
         ${sport ? 'AND primary_sport = ?' : ''}
       ORDER BY valuexp DESC`,
      sport ? [userCity, userState, sport] : [userCity, userState]
    );

    const totalAthletes = cityAthletes.length;
    const userRankIdx = cityAthletes.findIndex((a) => a.id === athleteId);
    const rank = userRankIdx >= 0 ? userRankIdx + 1 : totalAthletes + 1;

    const avgXp =
      totalAthletes > 0
        ? Math.round(
            cityAthletes.reduce((sum, a) => sum + (Number(a.valuexp) || 0), 0) /
              totalAthletes
          )
        : 0;

    const percentile =
      totalAthletes > 0
        ? Math.round(((totalAthletes - rank + 1) / totalAthletes) * 100)
        : 0;

    console.log(
      `📊 [RegionalService] ${userCity}, ${userState} | Rank: ${rank}/${totalAthletes} | Sport: ${topSport}`
    );

    return {
      city: userCity,
      state: userState,
      rank,
      totalAthletes,
      avgXp,
      userXp,
      percentile,
      topSport,
      userLevel: user.level || 1,
    };
  }

  /* ═══════════════════════════════════════════
     LOCAL TOURNAMENTS
     ═══════════════════════════════════════════ */
  static async getLocalTournaments(
    city: string,
    state: string,
    sport: string = 'all',
    limit: number = 10
  ): Promise<LocalTournament[]> {
    let query = `
      SELECT 
        id, title, sport, city, state,
        court_name, address, description,
        start_date, end_date, format, status,
        organizer_name, organizer_avatar,
        max_teams, current_teams,
        prize_pool, entry_fee, banner_url
      FROM tournaments
      WHERE is_active = 1
        AND LOWER(city) LIKE LOWER(?)
        AND LOWER(state) = LOWER(?)
    `;

    const params: any[] = [`%${city}%`, state];

    if (sport && sport !== 'all') {
      query += ` AND sport = ?`;
      params.push(sport);
    }

    // Show upcoming or in-progress first
    query += ` AND (status = 'upcoming' OR status = 'in_progress')`;
    query += ` ORDER BY 
                 CASE status WHEN 'in_progress' THEN 1 WHEN 'upcoming' THEN 2 ELSE 3 END,
                 start_date ASC 
               LIMIT ?`;
    params.push(limit);

    const [rows] = await pool.execute<RowDataPacket[]>(query, params);

    return rows.map((r: any) => ({
      id: r.id,
      title: r.title,
      sport: r.sport,
      city: r.city,
      state: r.state,
      courtName: r.court_name || '',
      address: r.address || '',
      description: r.description || '',
      startDate: r.start_date,
      endDate: r.end_date || r.start_date,
      status: r.status,
      format: r.format || 'single_elimination',
      organizerName: r.organizer_name || 'Playground League',
      organizerAvatar: r.organizer_avatar || '',
      maxTeams: r.max_teams || 8,
      currentTeams: r.current_teams || 0,
      prizePool: r.prize_pool || 'Trophy Only',
      entryFee: r.entry_fee || 'Free',
      bannerUrl: r.banner_url,
    }));
  }

  /* ═══════════════════════════════════════════
     LOCAL ACTIVITY FEED
     Combines: pickup games + tournaments + announcements
     ═══════════════════════════════════════════ */
  static async getLocalActivity(
    city: string,
    state: string,
    sport: string = 'all',
    limit: number = 20
  ): Promise<LocalActivityItem[]> {
    const items: LocalActivityItem[] = [];

    /* ─── 1. Fetch local pickup games ─── */
    let gamesQuery = `
      SELECT 
        pg.id, pg.title, pg.sport, pg.location,
        pg.date, pg.time, pg.max_players, pg.current_players,
        pg.created_at,
        a.id AS creator_id, a.name AS creator_name
      FROM pickup_games pg
      LEFT JOIN athletes a ON a.id = pg.creator_id
      WHERE pg.status = 'open'
        AND (LOWER(pg.location) LIKE LOWER(?) OR pg.lat IS NOT NULL)
    `;

    const gamesParams: any[] = [`%${city}%`];
    if (sport && sport !== 'all') {
      gamesQuery += ` AND pg.sport = ?`;
      gamesParams.push(sport);
    }
    gamesQuery += ` ORDER BY pg.created_at DESC LIMIT ?`;
    gamesParams.push(Math.min(limit, 8));

    const [games] = await pool.execute<RowDataPacket[]>(gamesQuery, gamesParams);

    games.forEach((g: any) => {
      items.push({
        id: `game_${g.id}`,
        type: 'pickup',
        sport: g.sport,
        title: g.title || `${g.sport} Pickup Match`,
        description: `${g.current_players || 0}/${g.max_players || 10} players joined at ${g.location}`,
        location: g.location,
        city,
        state,
        time: formatRelativeTime(g.created_at),
        attendeesCount: g.current_players || 0,
        gameId: g.id,
        isHot: true,
      });
    });

    /* ─── 2. Fetch local tournaments ─── */
    let tourneyQuery = `
      SELECT 
        id, title, sport, court_name, city, state,
        start_date, description, current_teams, max_teams, created_at
      FROM tournaments
      WHERE is_active = 1
        AND LOWER(city) LIKE LOWER(?)
        AND LOWER(state) = LOWER(?)
    `;

    const tourneyParams: any[] = [`%${city}%`, state];
    if (sport && sport !== 'all') {
      tourneyQuery += ` AND sport = ?`;
      tourneyParams.push(sport);
    }
    tourneyQuery += ` ORDER BY start_date ASC LIMIT ?`;
    tourneyParams.push(Math.min(limit, 5));

    const [tourneys] = await pool.execute<RowDataPacket[]>(
      tourneyQuery,
      tourneyParams
    );

    tourneys.forEach((t: any) => {
      items.push({
        id: `tourney_${t.id}`,
        type: 'tournament',
        sport: t.sport,
        title: t.title,
        description:
          t.description ||
          `${t.current_teams || 0}/${t.max_teams || 16} teams registered`,
        location: `${t.court_name || 'Local Arena'}, ${t.city}`,
        city: t.city,
        state: t.state,
        time: `Starts ${new Date(t.start_date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })}`,
        attendeesCount: t.current_teams || 0,
        isHot: true,
      });
    });

    /* ─── 3. Fetch announcements ─── */
    let announceQuery = `
      SELECT id, title, description, sport, city, state, location, is_hot, created_at
      FROM local_announcements
      WHERE is_active = 1
        AND LOWER(city) LIKE LOWER(?)
        AND LOWER(state) = LOWER(?)
    `;

    const announceParams: any[] = [`%${city}%`, state];
    if (sport && sport !== 'all') {
      announceQuery += ` AND sport = ?`;
      announceParams.push(sport);
    }
    announceQuery += ` ORDER BY created_at DESC LIMIT ?`;
    announceParams.push(Math.min(limit, 5));

    const [announcements] = await pool.execute<RowDataPacket[]>(
      announceQuery,
      announceParams
    );

    announcements.forEach((a: any) => {
      items.push({
        id: `announce_${a.id}`,
        type: 'announcement',
        sport: a.sport,
        title: a.title,
        description: a.description || '',
        location: a.location || `${a.city}, ${a.state}`,
        city: a.city,
        state: a.state,
        time: formatRelativeTime(a.created_at),
        isHot: a.is_hot === 1,
      });
    });

    // Sort: hot first, then by type priority (pickup > tourney > announcement)
    items.sort((a, b) => {
      if (a.isHot && !b.isHot) return -1;
      if (!a.isHot && b.isHot) return 1;
      return 0;
    });

    return items.slice(0, limit);
  }
}
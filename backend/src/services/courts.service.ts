// backend/src/services/courts.service.ts
import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

function mapCourt(row: any) {
  return {
    id: row.id,
    name: row.name,
    sport: row.sport,
    city: row.city,
    state: row.state,
    address: row.address,
    lat: row.lat !== null ? Number(row.lat) : null,
    lng: row.lng !== null ? Number(row.lng) : null,
    imageUrl: row.image_url,
    rating: row.rating !== null ? Number(row.rating) : 4.5,
    activePlayersNow: Number(row.active_players_now) || 0,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // Derived fields (for UI compatibility)
    status: row.is_active === 1 ? 'verified' : 'pending',
    distanceKm: 0,
    isIndoor: false,
    lighting: false,
    waterFountain: false,
    parkingAvailable: false,
    rimCondition: 'Pro Breakaway Glass',
    surfaceType: 'Asphalt',
  };
}

export class CourtsService {
  /* GET ALL COURTS with filters */
  static async list(filters: {
    sport?: string;
    city?: string;
    state?: string;
    search?: string;
  } = {}): Promise<any[]> {
    let sql = `SELECT * FROM courts WHERE is_active = 1`;
    const params: any[] = [];

    if (filters.sport && filters.sport !== 'all') {
      sql += ` AND sport = ?`;
      params.push(filters.sport);
    }
    if (filters.state && filters.state !== 'all') {
      sql += ` AND state = ?`;
      params.push(filters.state);
    }
    if (filters.city) {
      sql += ` AND city LIKE ?`;
      params.push(`%${filters.city}%`);
    }
    if (filters.search) {
      sql += ` AND (name LIKE ? OR address LIKE ? OR city LIKE ?)`;
      const s = `%${filters.search}%`;
      params.push(s, s, s);
    }

    sql += ` ORDER BY rating DESC, name ASC`;

    const [rows] = await pool.execute<RowDataPacket[]>(sql, params);
    return rows.map(mapCourt);
  }

  /* GET ONE */
  static async getById(id: string): Promise<any | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM courts WHERE id = ?`,
      [id]
    );
    if (rows.length === 0) return null;
    return mapCourt(rows[0]);
  }

  /* CREATE */
  static async create(input: any): Promise<any> {
    const id = input.id || `court_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    await pool.execute<ResultSetHeader>(
      `INSERT INTO courts
        (id, name, sport, city, state, address, lat, lng, image_url, rating, active_players_now, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.name,
        input.sport || 'basketball',
        input.city,
        input.state,
        input.address || null,
        input.lat || null,
        input.lng || null,
        input.imageUrl || null,
        input.rating ?? 4.5,
        input.activePlayersNow ?? 0,
        input.isActive === false ? 0 : 1,
      ]
    );

    return this.getById(id);
  }

  /* UPDATE */
  static async update(id: string, updates: any): Promise<any | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const fields: string[] = [];
    const values: any[] = [];

    const map: Record<string, string> = {
      name: 'name',
      sport: 'sport',
      city: 'city',
      state: 'state',
      address: 'address',
      lat: 'lat',
      lng: 'lng',
      imageUrl: 'image_url',
      rating: 'rating',
      activePlayersNow: 'active_players_now',
      isActive: 'is_active',
    };

    Object.entries(updates).forEach(([key, value]) => {
      if (map[key] !== undefined) {
        fields.push(`${map[key]} = ?`);
        values.push(key === 'isActive' ? (value ? 1 : 0) : value);
      }
    });

    if (fields.length === 0) return existing;

    values.push(id);
    await pool.execute(
      `UPDATE courts SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`,
      values
    );

    return this.getById(id);
  }

  /* DELETE (soft) */
  static async delete(id: string): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE courts SET is_active = 0 WHERE id = ?`,
      [id]
    );
    return result.affectedRows > 0;
  }

  /* ✅ NEW: Find nearby athletes within geofence radius */
static async findNearbyAthletes(
  lat: number,
  lng: number,
  radiusMeters: number
): Promise<any[]> {
  // Haversine formula in SQL (distance in meters)
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT 
        id, name, email, profilepicture,
        lat, lng,
        (6371000 * acos(
          LEAST(1, GREATEST(-1,
            cos(radians(?)) * cos(radians(lat)) *
            cos(radians(lng) - radians(?)) +
            sin(radians(?)) * sin(radians(lat))
          ))
        )) AS distance_meters
     FROM athletes
     WHERE lat IS NOT NULL 
       AND lng IS NOT NULL
       AND last_seen_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
     HAVING distance_meters <= ?
     ORDER BY distance_meters ASC
     LIMIT 50`,
    [lat, lng, lat, radiusMeters]
  );
  return rows;
}

/* ✅ NEW: Send radar ping */
static async radarPing(
  courtId: string,
  senderAthleteId: string,
  message?: string
): Promise<{
  court: any;
  notifiedCount: number;
  nearbyAthletes: any[];
  notificationId: string;
}> {
  // 1. Get court
  const court = await this.getById(courtId);
  if (!court) throw new Error('Court not found');
  if (!court.lat || !court.lng) throw new Error('Court has no coordinates');

  // 2. Get sender info
  const [senderRows] = await pool.execute<RowDataPacket[]>(
    `SELECT id, name, profilepicture FROM athletes WHERE id = ?`,
    [senderAthleteId]
  );
  if (senderRows.length === 0) throw new Error('Sender not found');
  const sender = senderRows[0];

  // 3. Find nearby athletes (5km radius default)
  const radius = 5000; // meters
  const nearbyAthletes = await this.findNearbyAthletes(court.lat, court.lng, radius);

  // 4. Filter out sender
  const targets = nearbyAthletes.filter((a) => a.id !== senderAthleteId);

  // 5. Insert notification for each
  const { randomUUID } = await import('crypto');
  const insertedIds: string[] = [];

  for (const target of targets) {
    const notifId = `notif_${randomUUID()}`;
    await pool.execute(
      `INSERT INTO notifications 
        (id, user_id, type, title, message, sender_id, reference_id, status, is_read)
       VALUES (?, ?, 'system', ?, ?, ?, ?, 'info', 0)`,
      [
        notifId,
        target.id,
        `📡 ${sender.name} is at ${court.name}`,
        message ||
          `${sender.name} is nearby and wants to play! Tap to see the court.`,
        senderAthleteId,
        courtId,
      ]
    );
    insertedIds.push(notifId);
  }

  // 6. Log the ping in a table (optional — create `radar_pings` table)
  try {
    await pool.execute(
      `INSERT INTO radar_pings 
        (id, court_id, sender_id, notified_count, radius_meters, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [`ping_${randomUUID()}`, courtId, senderAthleteId, targets.length, radius]
    );
  } catch (err) {
    // Table might not exist — ignore
    console.warn('radar_pings table missing, skipping log');
  }

  return {
    court,
    notifiedCount: targets.length,
    nearbyAthletes: targets.map((a) => ({
      id: a.id,
      name: a.name,
      avatar: a.profilepicture,
      distanceMeters: Math.round(a.distance_meters),
    })),
    notificationId: insertedIds[0] || '',
  };
}
}
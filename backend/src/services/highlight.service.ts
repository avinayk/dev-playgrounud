// src/services/highlight.service.ts
import pool from '../config/database';
import { randomUUID } from 'crypto';

export interface HighlightDTO {
  id: string;
  athleteId: string;
  title: string;
  description: string;
  sport: string;
  videoUrl: string;
  thumbnailUrl: string | null;
  durationSeconds: number;
  views: number;
  likes: number;
  createdAt: string;
  updatedAt: string;
}

interface HighlightRow {
  id: string;
  athlete_id: string;
  title: string;
  description: string | null;
  sport: string;
  video_url: string;
  thumbnail_url: string | null;
  duration_seconds: number;
  views: number;
  likes: number;
  created_at: string;
  updated_at: string;
}

export class HighlightService {
  /* ─── Map row to DTO ─── */
  private static mapRow(r: HighlightRow): HighlightDTO {
    return {
      id: r.id,
      athleteId: r.athlete_id,
      title: r.title,
      description: r.description ?? '',
      sport: r.sport,
      videoUrl: r.video_url,
      thumbnailUrl: r.thumbnail_url,
      durationSeconds: Number(r.duration_seconds) || 30,
      views: Number(r.views) || 0,
      likes: Number(r.likes) || 0,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  /* ═══════════════════════════════════════════
     CREATE HIGHLIGHT
     ═══════════════════════════════════════════ */
  static async createHighlight(
    athleteId: string,
    data: {
      title: string;
      description?: string;
      sport: string;
      videoUrl: string;
      thumbnailUrl?: string;
      durationSeconds?: number;
    }
  ): Promise<HighlightDTO> {
    const id = randomUUID();

    await pool.execute(
      `INSERT INTO highlights 
         (id, athlete_id, title, description, sport, video_url, thumbnail_url, duration_seconds, views, likes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0)`,
      [
        id,
        athleteId,
        data.title,
        data.description ?? null,
        data.sport,
        data.videoUrl,
        data.thumbnailUrl ?? null,
        data.durationSeconds ?? 30,
      ]
    );

    const [rows] = await pool.execute<HighlightRow[]>(
      `SELECT * FROM highlights WHERE id = ?`,
      [id]
    );

    return this.mapRow(rows[0]);
  }

  /* ═══════════════════════════════════════════
     LIST HIGHLIGHTS (by athlete, optional sport filter)
     ═══════════════════════════════════════════ */
  static async listHighlights(
    athleteId: string,
    options: { sport?: string; limit?: number; offset?: number } = {}
  ): Promise<HighlightDTO[]> {
    const { sport, limit = 50, offset = 0 } = options;

    let query = `SELECT * FROM highlights 
                 WHERE athlete_id = ? AND is_deleted = 0`;
    const params: any[] = [athleteId];

    if (sport && sport !== 'all') {
      query += ` AND sport = ?`;
      params.push(sport);
    }

    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [rows] = await pool.execute<HighlightRow[]>(query, params);
    return rows.map(this.mapRow);
  }

  /* ═══════════════════════════════════════════
     LIST ALL (community feed)
     ═══════════════════════════════════════════ */
  static async listCommunityHighlights(
    options: { sport?: string; limit?: number; offset?: number } = {}
  ): Promise<HighlightDTO[]> {
    const { sport, limit = 50, offset = 0 } = options;

    let query = `SELECT * FROM highlights WHERE is_deleted = 0`;
    const params: any[] = [];

    if (sport && sport !== 'all') {
      query += ` AND sport = ?`;
      params.push(sport);
    }

    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [rows] = await pool.execute<HighlightRow[]>(query, params);
    return rows.map(this.mapRow);
  }

  /* ═══════════════════════════════════════════
     GET SINGLE
     ═══════════════════════════════════════════ */
  static async getHighlight(id: string): Promise<HighlightDTO | null> {
    const [rows] = await pool.execute<HighlightRow[]>(
      `SELECT * FROM highlights WHERE id = ? AND is_deleted = 0`,
      [id]
    );
    if (!rows[0]) return null;
    return this.mapRow(rows[0]);
  }

  /* ═══════════════════════════════════════════
     INCREMENT VIEW
     ═══════════════════════════════════════════ */
  static async incrementViews(id: string): Promise<void> {
    await pool.execute(
      `UPDATE highlights SET views = views + 1 WHERE id = ?`,
      [id]
    );
  }

  /* ═══════════════════════════════════════════
     TOGGLE LIKE
     ═══════════════════════════════════════════ */
  static async toggleLike(id: string, delta: 1 | -1): Promise<number> {
    await pool.execute(
      `UPDATE highlights SET likes = GREATEST(0, likes + ?) WHERE id = ?`,
      [delta, id]
    );

    const [rows] = await pool.execute<any[]>(
      `SELECT likes FROM highlights WHERE id = ?`,
      [id]
    );
    return Number(rows[0]?.likes) || 0;
  }

  /* ═══════════════════════════════════════════
     DELETE (soft delete)
     ═══════════════════════════════════════════ */
  static async deleteHighlight(
    id: string,
    requesterId: string
  ): Promise<void> {
    const [rows] = await pool.execute<HighlightRow[]>(
      `SELECT athlete_id FROM highlights WHERE id = ?`,
      [id]
    );

    if (!rows[0]) throw new Error('Highlight not found');
    if (rows[0].athlete_id !== requesterId) {
      throw new Error('Not authorized');
    }

    await pool.execute(
      `UPDATE highlights SET is_deleted = 1 WHERE id = ?`,
      [id]
    );
  }
}
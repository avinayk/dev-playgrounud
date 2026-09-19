// backend/src/services/tournaments.service.ts
import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import crypto from 'crypto';

/* ═══════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════ */
function parseJSON(v: any, fallback: any = null) {
  if (v == null) return fallback;
  if (typeof v === 'object') return v;
  try { return JSON.parse(v); } catch { return fallback; }
}

function stringifyJSON(v: any) {
  if (v == null) return null;
  return typeof v === 'string' ? v : JSON.stringify(v);
}

/**
 * Map DB row → API DTO matching frontend Tournament type
 */
function mapTournament(row: any) {
  return {
    id: row.id,
    title: row.title,
    sport: row.sport,
    city: row.city,
    state: row.state,
    courtId: row.court_id,
    courtName: row.court_name,
    address: row.address,
    description: row.description,
    startDate: row.start_date ? String(row.start_date).split('T')[0] : '',
    endDate: row.end_date ? String(row.end_date).split('T')[0] : null,
    registrationDeadline: row.registration_deadline ? String(row.registration_deadline) : null,
    format: row.format || 'single_elimination',
    status: row.status || 'upcoming',
    organizerId: row.organizer_id,
    organizerName: row.organizer_name,
    organizerAvatar: row.organizer_avatar,
    maxTeams: Number(row.max_teams) || 16,
    currentTeams: Number(row.current_teams) || 0,
    prizePool: row.prize_pool,
    entryFee: row.entry_fee,
    bannerUrl: row.banner_url,
    rules: row.rules,
    isActive: row.is_active === 1,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    registeredTeams: parseJSON(row.registered_teams, []),
    matches: parseJSON(row.matches, []),
    prizeDistribution: parseJSON(row.prize_distribution, null),
    mvpVotes: parseJSON(row.mvp_votes, {}),
    liveFeed: parseJSON(row.live_feed, []),
  };
}

/* ═══════════════════════════════════════════
   SERVICE
   ═══════════════════════════════════════════ */
export class TournamentsService {
  /* ─── LIST with filters ─── */
  static async list(filters: {
    sport?: string;
    status?: string;
    city?: string;
    state?: string;
    search?: string;
  } = {}): Promise<any[]> {
    let sql = `SELECT * FROM tournaments WHERE is_active = 1`;
    const params: any[] = [];

    if (filters.sport && filters.sport !== 'all') {
      sql += ` AND sport = ?`;
      params.push(filters.sport);
    }
    if (filters.status && filters.status !== 'all') {
      sql += ` AND status = ?`;
      params.push(filters.status);
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
      sql += ` AND (title LIKE ? OR court_name LIKE ? OR address LIKE ?)`;
      const s = `%${filters.search}%`;
      params.push(s, s, s);
    }
    sql += ` ORDER BY start_date DESC, created_at DESC`;

    const [rows] = await pool.execute<RowDataPacket[]>(sql, params);
    return rows.map(mapTournament);
  }

  /* ─── GET ONE ─── */
  static async getById(id: string): Promise<any | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM tournaments WHERE id = ?`,
      [id]
    );
    if (rows.length === 0) return null;
    return mapTournament(rows[0]);
  }

  /* ─── CREATE ─── */
  static async create(input: any): Promise<any> {
    const id = `tourney_${crypto.randomUUID()}`;

    // Auto-generate initial bracket for 4 teams
    let initialMatches: any[] = [];
    if ((input.maxTeams || 4) === 4) {
      const now = Date.now();
      initialMatches = [
        { id: `m_${now}_1`, round: 1, roundName: 'Semifinal #1', matchNumber: 1, status: 'scheduled', scheduledTime: '10:00 AM', score1: 0, score2: 0 },
        { id: `m_${now}_2`, round: 1, roundName: 'Semifinal #2', matchNumber: 2, status: 'scheduled', scheduledTime: '11:15 AM', score1: 0, score2: 0 },
        { id: `m_${now}_3`, round: 2, roundName: 'Championship Final 🏆', matchNumber: 3, status: 'scheduled', scheduledTime: '2:00 PM', score1: 0, score2: 0 },
      ];
    }

    await pool.execute<ResultSetHeader>(
      `INSERT INTO tournaments
        (id, title, sport, city, state, court_id, court_name, address, description,
         start_date, end_date, registration_deadline, format, status,
         organizer_id, organizer_name, organizer_avatar, max_teams, current_teams,
         prize_pool, entry_fee, banner_url, rules,
         registered_teams, matches, prize_distribution, mvp_votes, live_feed, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        id,
        input.title,
        input.sport,
        input.city,
        input.state,
        input.courtId || null,
        input.courtName || null,
        input.address || null,
        input.description || null,
        input.startDate,
        input.endDate || null,
        input.registrationDeadline || null,
        input.format || 'single_elimination',
        input.status || 'registration_open',
        input.organizerId || null,
        input.organizerName || null,
        input.organizerAvatar || null,
        input.maxTeams || 16,
        input.prizePool || null,
        input.entryFee || null,
        input.bannerUrl || null,
        input.rules || null,
        JSON.stringify([]),
        JSON.stringify(initialMatches),
        JSON.stringify(input.prizeDistribution || {}),
        JSON.stringify({}),
        JSON.stringify([]),
      ]
    );

    return this.getById(id);
  }

  /* ─── REGISTER TEAM ─── */
  static async registerTeam(tournamentId: string, team: any): Promise<any> {
    const t = await this.getById(tournamentId);
    if (!t) throw new Error('Tournament not found');

    const teams = t.registeredTeams || [];

    // Check duplicate
    if (teams.some((tm: any) => tm.name.toLowerCase() === team.name.toLowerCase())) {
      throw new Error('Team name already registered');
    }

    // Check capacity
    if (teams.length >= t.maxTeams) {
      throw new Error('Tournament is full');
    }

    // Add new team
    const newTeam = {
      id: team.id || `team_${crypto.randomUUID()}`,
      name: team.name,
      captainName: team.captainName,
      captainAthleteId: team.captainAthleteId || null,
      seed: teams.length + 1,
      members: team.members || [],
      wins: 0,
      losses: 0,
      pointsScored: 0,
      pointsAllowed: 0,
      paymentStatus: team.paymentStatus || 'pending',
      paymentReceiptId: team.paymentReceiptId || null,
      paidAt: team.paidAt || null,
      registeredAt: new Date().toISOString(),
    };
    teams.push(newTeam);

    // Update matches — attach teams to bracket slots if they're empty
    const matches = t.matches || [];
    const teamCount = teams.length;
    if (teamCount === 1 && matches[0]) matches[0].team1 = newTeam;
    else if (teamCount === 2 && matches[0]) matches[0].team2 = newTeam;
    else if (teamCount === 3 && matches[1]) matches[1].team1 = newTeam;
    else if (teamCount === 4 && matches[1]) matches[1].team2 = newTeam;

    await pool.execute(
      `UPDATE tournaments
       SET registered_teams = ?, matches = ?, current_teams = ?, updated_at = NOW()
       WHERE id = ?`,
      [JSON.stringify(teams), JSON.stringify(matches), teams.length, tournamentId]
    );

    // Log to live feed
    await this.addLiveFeed(tournamentId, {
      type: 'registrations',
      title: '📝 New Team Registered',
      description: `"${team.name}" registered (Captain: ${team.captainName})`,
    });

    return this.getById(tournamentId);
  }

  /* ─── UPDATE MATCH SCORE ─── */
  static async updateMatchScore(
    tournamentId: string,
    matchId: string,
    score1: number,
    score2: number,
    winnerId?: string,
    boxScores?: any[]
  ): Promise<any> {
    const t = await this.getById(tournamentId);
    if (!t) throw new Error('Tournament not found');

    const matches = t.matches || [];
    const idx = matches.findIndex((m: any) => m.id === matchId);
    if (idx === -1) throw new Error('Match not found');

    const m = matches[idx];
    m.score1 = score1;
    m.score2 = score2;
    m.winnerId = winnerId || (score1 > score2 ? m.team1?.id : m.team2?.id);
    m.boxScores = boxScores || [];
    m.status = 'completed';

    // Update team W/L records
    const teams = t.registeredTeams || [];
    if (m.team1?.id) {
      const t1 = teams.find((tm: any) => tm.id === m.team1.id);
      if (t1) {
        t1.pointsScored += score1;
        t1.pointsAllowed += score2;
        if (m.winnerId === t1.id) t1.wins += 1;
        else t1.losses += 1;
      }
    }
    if (m.team2?.id) {
      const t2 = teams.find((tm: any) => tm.id === m.team2.id);
      if (t2) {
        t2.pointsScored += score2;
        t2.pointsAllowed += score1;
        if (m.winnerId === t2.id) t2.wins += 1;
        else t2.losses += 1;
      }
    }

    // Advance winner to next match
    if (m.winnerId) {
      const winnerTeam = teams.find((tm: any) => tm.id === m.winnerId);
      const nextMatchNumber = Math.ceil(m.matchNumber / 2);
      const nextMatch = matches.find((x: any) =>
        x.round === m.round + 1 && x.matchNumber === nextMatchNumber
      );
      if (nextMatch && winnerTeam) {
        if (m.matchNumber % 2 === 1) nextMatch.team1 = winnerTeam;
        else nextMatch.team2 = winnerTeam;
      }
    }

    await pool.execute(
      `UPDATE tournaments
       SET matches = ?, registered_teams = ?, updated_at = NOW()
       WHERE id = ?`,
      [JSON.stringify(matches), JSON.stringify(teams), tournamentId]
    );

    // Live feed
    await this.addLiveFeed(tournamentId, {
      type: 'results',
      title: '🏆 Match Score Posted',
      description: `Match #${m.matchNumber}: ${m.team1?.name} (${score1}) vs ${m.team2?.name} (${score2}). Winner: ${winnerId === m.team1?.id ? m.team1?.name : m.team2?.name}`,
    });

    return this.getById(tournamentId);
  }

  /* ─── CAST MVP VOTE ─── */
  static async castMvpVote(
    tournamentId: string,
    matchId: string,
    voterId: string,
    votedForPlayer: string
  ): Promise<any> {
    const t = await this.getById(tournamentId);
    if (!t) throw new Error('Tournament not found');

    const mvpVotes = t.mvpVotes || {};
    if (!mvpVotes[matchId]) mvpVotes[matchId] = {};

    const current = mvpVotes[matchId][voterId];
    if (current) throw new Error('You already voted for this match');

    mvpVotes[matchId][voterId] = votedForPlayer;

    // Update match.mvpVotes array for display
    const matches = t.matches || [];
    const mIdx = matches.findIndex((m: any) => m.id === matchId);
    if (mIdx !== -1) {
      const m = matches[mIdx];
      if (!Array.isArray(m.mvpVotes)) m.mvpVotes = [];
      const existing = m.mvpVotes.find((v: any) => v.playerName === votedForPlayer);
      if (existing) existing.votes += 1;
      else m.mvpVotes.push({ playerName: votedForPlayer, votes: 1 });
    }

    await pool.execute(
      `UPDATE tournaments
       SET mvp_votes = ?, matches = ?, updated_at = NOW()
       WHERE id = ?`,
      [JSON.stringify(mvpVotes), JSON.stringify(matches), tournamentId]
    );

    await this.addLiveFeed(tournamentId, {
      type: 'mvp',
      title: '🎖️ MVP Vote Cast',
      description: `New MVP vote for ${votedForPlayer} in Match #${matches[mIdx]?.matchNumber}`,
    });

    return this.getById(tournamentId);
  }

  /* ─── UPDATE PRIZE POOL ─── */
  static async updatePrizePool(tournamentId: string, prizePool: string): Promise<any> {
    await pool.execute(
      `UPDATE tournaments SET prize_pool = ?, updated_at = NOW() WHERE id = ?`,
      [prizePool, tournamentId]
    );

    await this.addLiveFeed(tournamentId, {
      type: 'prize',
      title: '🏆 Prize Pool Updated',
      description: `New prize pool: ${prizePool}`,
    });

    return this.getById(tournamentId);
  }

  /* ─── UPDATE PRIZE DISTRIBUTION ─── */
  static async updatePrizeDistribution(tournamentId: string, dist: any): Promise<any> {
    await pool.execute(
      `UPDATE tournaments SET prize_distribution = ?, updated_at = NOW() WHERE id = ?`,
      [JSON.stringify(dist), tournamentId]
    );
    return this.getById(tournamentId);
  }

  /* ─── MARK TEAM PAID ─── */
  static async markTeamPaid(
    tournamentId: string,
    teamId: string,
    receiptId: string
  ): Promise<any> {
    const t = await this.getById(tournamentId);
    if (!t) throw new Error('Tournament not found');

    const teams = t.registeredTeams || [];
    const team = teams.find((tm: any) => tm.id === teamId);
    if (!team) throw new Error('Team not found');

    team.paymentStatus = 'paid';
    team.paymentReceiptId = receiptId;
    team.paidAt = new Date().toISOString();

    await pool.execute(
      `UPDATE tournaments
       SET registered_teams = ?, updated_at = NOW()
       WHERE id = ?`,
      [JSON.stringify(teams), tournamentId]
    );

    await this.addLiveFeed(tournamentId, {
      type: 'payment',
      title: '💳 Entry Fee Paid',
      description: `${team.name} paid ${t.entryFee || '$20'} — Receipt ${receiptId}`,
    });

    return this.getById(tournamentId);
  }

  /* ─── ADD LIVE FEED ─── */
  static async addLiveFeed(tournamentId: string, item: {
    type: string;
    title: string;
    description: string;
  }): Promise<void> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT live_feed FROM tournaments WHERE id = ?`,
      [tournamentId]
    );
    const feed = parseJSON(rows[0]?.live_feed, []);
    feed.unshift({
      id: `feed_${crypto.randomUUID()}`,
      type: item.type,
      title: item.title,
      description: item.description,
      timestamp: 'Just now',
      createdAt: new Date().toISOString(),
    });
    // Keep only last 50
    const trimmed = feed.slice(0, 50);
    await pool.execute(
      `UPDATE tournaments SET live_feed = ? WHERE id = ?`,
      [JSON.stringify(trimmed), tournamentId]
    );
  }

  /* ─── DELETE ─── */
  static async delete(tournamentId: string): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      `DELETE FROM tournaments WHERE id = ?`,
      [tournamentId]
    );
    return result.affectedRows > 0;
  }
}
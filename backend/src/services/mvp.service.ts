// src/services/mvp.service.ts
import pool from '../config/database';

export class MvpService {
  /* ─── Get MVP data for a game ─── */
  static async getMvpData(gameId: string, currentUserId: string) {
    // 1. Get game details
    const [gameRows] = await pool.execute<any[]>(
      `SELECT id, title, location, status, max_players, current_players 
       FROM pickup_games WHERE id = ?`,
      [gameId]
    );
    if (!gameRows[0]) throw new Error('Game not found');

    // 2. Get participants with vote counts
    const [participants] = await pool.execute<any[]>(
      `SELECT 
         a.id,
         a.name,
         a.profilepicture,
         a.userhandle,
         (SELECT COUNT(*) FROM mvp_votes WHERE game_id = ? AND voted_for_id = a.id) AS vote_count
       FROM game_participants gp
       JOIN athletes a ON a.id = gp.athlete_id
       WHERE gp.game_id = ?`,
      [gameId, gameId]
    );

    // 3. Total votes
    const [totalVotes] = await pool.execute<any[]>(
      `SELECT COUNT(*) AS cnt FROM mvp_votes WHERE game_id = ?`,
      [gameId]
    );
    const total = Number(totalVotes[0]?.cnt ?? 0);

    // 4. My vote
    const [myVote] = await pool.execute<any[]>(
      `SELECT voted_for_id FROM mvp_votes 
       WHERE game_id = ? AND voter_id = ?`,
      [gameId, currentUserId]
    );

    // 5. Max vote count (for percentage)
    const maxVotes = Math.max(1, ...participants.map((p) => Number(p.vote_count)));

    // 6. Sort by votes desc
    const sorted = participants
      .map((p) => ({
        ...p,
        vote_count: Number(p.vote_count),
        percentage: total > 0 
          ? Math.round((Number(p.vote_count) / total) * 100) 
          : 0,
      }))
      .sort((a, b) => b.vote_count - a.vote_count);

    return {
      game: gameRows[0],
      participants: sorted,
      totalVotes: total,
      myVoteId: myVote[0]?.voted_for_id || null,
      mvpLeaderId: sorted[0]?.id || null,
    };
  }

  /* ─── Cast a vote ─── */
  static async castVote(
    gameId: string,
    voterId: string,
    votedForId: string
  ) {
    // Validation
    if (voterId === votedForId) {
      throw new Error('Cannot vote for yourself');
    }
    
    
    // Voter must be a participant
    const [voterCheck] = await pool.execute<any[]>(
      `SELECT id FROM game_participants 
       WHERE game_id = ? AND athlete_id = ?`,
      [gameId, voterId]
    );
    console.log(voterCheck);
    if (!voterCheck[0]) {
      throw new Error('You must be a participant to vote');
    }

    // Voted-for must be a participant
    const [targetCheck] = await pool.execute<any[]>(
      `SELECT id FROM game_participants 
       WHERE game_id = ? AND athlete_id = ?`,
      [gameId, votedForId]
    );
    if (!targetCheck[0]) {
      throw new Error('Target is not a participant');
    }

    // Insert or update vote
    await pool.execute(
      `INSERT INTO mvp_votes (game_id, voter_id, voted_for_id)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE voted_for_id = ?, created_at = NOW()`,
      [gameId, voterId, votedForId, votedForId]
    );

    return { success: true };
  }

  /* ─── Get MVP winner ─── */
  static async getMvpWinner(gameId: string) {
    const [rows] = await pool.execute<any[]>(
      `SELECT 
         a.id, a.name, a.profilepicture,
         COUNT(mv.voted_for_id) AS vote_count
       FROM mvp_votes mv
       JOIN athletes a ON a.id = mv.voted_for_id
       WHERE mv.game_id = ?
       GROUP BY a.id
       ORDER BY vote_count DESC
       LIMIT 1`,
      [gameId]
    );

    if (!rows[0]) return null;

    // Award XP
    await pool.execute(
      `UPDATE athletes SET valuexp = COALESCE(valuexp, 0) + 100 
       WHERE id = ?`,
      [rows[0].id]
    );

    // Save winner
    await pool.execute(
      `UPDATE pickup_games 
       SET mvp_winner_id = ?, mvp_announced_at = NOW() 
       WHERE id = ?`,
      [rows[0].id, gameId]
    );

    return rows[0];
  }
}
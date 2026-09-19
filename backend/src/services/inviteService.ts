// src/services/inviteService.ts
import { sendEmail } from './emailService';
import pool from '../config/database';

const BASE_URL = process.env.BASE_URL || 'https://www.playgroundleague.pro';

const SPORT_EMOJI: Record<string, string> = {
  basketball: '🏀',
  baseball: '⚾',
  softball: '🥎',
  soccer: '⚽',
  volleyball: '🏐',
  football: '🏈',
  tennis: '🎾',
  pickleball: '🏓',
};

interface GameInviteParams {
  gameId: string;
  emails: string[];
  senderId: string;
}

export class InviteService {
  /**
   * Send game invite emails to a list of email addresses
   */
  static async sendGameInvites(params: GameInviteParams): Promise<{
    sent: number;
    failed: number;
    errors: string[];
  }> {
    const { gameId, emails, senderId } = params;

    // 1. Fetch game details
    const [gameRows] = await pool.execute<any[]>(
      `SELECT 
         pg.id, pg.title, pg.sport, pg.location, pg.date, pg.time,
         pg.max_players, pg.current_players,
         a.name AS host_name
       FROM pickup_games pg
       LEFT JOIN athletes a ON a.id = pg.creator_id
       WHERE pg.id = ?`,
      [gameId]
    );

    if (!gameRows[0]) {
      throw new Error('Game not found');
    }

    const game = gameRows[0];

    // 2. Prepare template data
    const sportKey = (game.sport || 'basketball').toLowerCase().trim();
    const sportEmoji = SPORT_EMOJI[sportKey] || '🏀';
    const registrationLink = `${BASE_URL}/?gameId=${game.id}`;
    const spotsLeft = game.max_players - game.current_players;

    // Format date
    const dateObj = new Date(game.date);
    const formattedDate = dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    // Format time
    const [h, m] = (game.time || '00:00').split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    const formattedTime = `${hour12}:${String(m).padStart(2, '0')} ${period}`;

    // 3. Send emails
    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const email of emails) {
      try {
        await sendEmail({
          to: email,
          subject: `🏀 ${game.host_name || 'Someone'} invited you to "${game.title}"`,
          template: 'game-invite',
          data: {
            hostName: game.host_name || 'An athlete',
            gameTitle: game.title,
            sport: game.sport,
            sportEmoji,
            location: game.location,
            date: formattedDate,
            time: formattedTime,
            currentPlayers: game.current_players,
            maxPlayers: game.max_players,
            spotsLeft,
            registrationLink,
            unsubscribeLink: `${BASE_URL}/unsubscribe`,
          },
        });
        sent++;
        console.log(`✅ Invite sent to ${email}`);
      } catch (err) {
        failed++;
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`${email}: ${errMsg}`);
        console.error(`❌ Failed to send to ${email}:`, errMsg);
      }
    }

    return { sent, failed, errors };
  }
}
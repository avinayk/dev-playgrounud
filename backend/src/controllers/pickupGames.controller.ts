// src/controllers/pickupGames.controller.ts
import type { Request, Response } from 'express';
import { PickupGamesService } from '../services/pickupGames.service';
import type { CreatePickupGameBody } from '../models/pickupGame.model';
import { InviteService } from '../services/inviteService';
import { getIO } from '../socket/socketManager';   // ✅ Helper to get `io`
import { NotificationService } from '../services/notification.service';
import pool from '../config/database';
export class PickupGamesController {
  static async createGame(
    req: Request<{}, {}, CreatePickupGameBody>,
    res: Response
  ): Promise<void> {
    try {
      const body = req.body;

    if (
      !body.gameTitle ||
      !body.sport ||
      !(body.venue || body.location) ||
      !body.date ||
      !body.time ||
      !body.creatorId
    ) {
      res.status(400).json({ success: false, message: 'Missing required fields' });
      return;
    }

    const dto = PickupGamesService.buildDTO({
      gameTitle: body.gameTitle,
      sport: body.sport,
      competitiveLevel: body.competitiveLevel,
      venue: body.venue ?? body.location ?? '',
      lat: body.lat ?? null,         // ✅
      lng: body.lng ?? null,         // ✅
      date: body.date,
      time: body.time,
      maxPlayers: body.maxPlayers,
      description: body.description,
      creatorId: body.creatorId,
    });

    const game = await PickupGamesService.createGame(dto);
    res.status(201).json({
      success: true,
      message: 'Pickup game created successfully',
      data: game,
    });
  } catch (err) {
    console.error('❌ createGame error:', err);
    const message = err instanceof Error ? err.message : 'Server error';
    res.status(500).json({ success: false, message });
  }
}

  // src/controllers/pickupGames.controller.ts
  static async listGames(req: Request, res: Response): Promise<void> {
    try {
      const games = await PickupGamesService.listOpenGames({
        search: req.query.search as string,
        sport: req.query.sport as string,
        level: req.query.level as string,
        date: req.query.date as string,
      });

      console.log('📤 Sending games count:', games.length);   // debug
      res.json({ success: true, data: games });              // ✅ array of rows
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Server error';
      res.status(500).json({ success: false, message });
    }
  }

  static async getGame(
    req: Request<{ id: string }>,
    res: Response
  ): Promise<void> {
    try {
      const game = await PickupGamesService.getGameById(req.params.id);
      if (!game) {
        res.status(404).json({ success: false, message: 'Game not found' });
        return;
      }
      res.json({ success: true, data: game });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Server error';
      res.status(500).json({ success: false, message });
    }
  }

  static async getStats(_req: Request, res: Response): Promise<void> {
    try {
      const stats = await PickupGamesService.getRegionStats();
      res.json({ success: true, data: stats });
    } catch (err) {
      console.error('❌ getStats error:', err);
      const message = err instanceof Error ? err.message : 'Server error';
      res.status(500).json({ success: false, message });
    }
  }
  /* POST /api/pickup-games/:id/join */
  static async joinGame(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { athleteId } = req.body;

      const result = await PickupGamesService.joinGame(id, athleteId);

      // ✅ Get game + joiner info
      const [gameRows] = await pool.execute<any[]>(
        `SELECT pg.creator_id, pg.title, a.name AS joiner_name
        FROM pickup_games pg, athletes a
        WHERE pg.id = ? AND a.id = ?`,
        [id, athleteId]
      );

      const game = gameRows[0];

      if (game && game.creator_id !== athleteId) {
        // ✅ NOTIFICATION TO HOST
        const notification = await NotificationService.create({
          userId: game.creator_id,                 // ← Game host
          type: 'game_invite',
          title: 'Player Joined Your Game',
          message: `${game.joiner_name} joined "${game.title}"`,
          senderId: athleteId,
          referenceId: id,
          status: 'info',
        });

        const io = getIO();
        if (io) {
          io.to(`user:${game.creator_id}`).emit('notification:new', notification);
        }
      }

      res.json(result);
    } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error';
    res.status(400).json({ success: false, message });
  }
  }

  static async leaveGame(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { athleteId } = req.body;

      if (!athleteId) {
        res.status(400).json({ success: false, message: 'athleteId required' });
        return;
      }

      const result = await PickupGamesService.leaveGame(id, athleteId);

      // ✅ REAL-TIME
      const io = getIO();
      if (io) {
        const [athleteRows] = await pool.execute<any[]>(
          `SELECT name FROM athletes WHERE id = ?`,
          [athleteId]
        );
        const athleteName = athleteRows[0]?.name || 'A player';

        io.to(`game:${id}`).emit('game:participant_left', {
          gameId: id,
          athleteId,
          athleteName,
        });

        io.emit('game:updated', {
          gameId: id,
          action: 'leave',
          athleteId,
        });
      }

      res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Server error';
      res.status(400).json({ success: false, message });
    }
  }

  /* GET /api/pickup-games/:id/participants */
  static async getParticipants(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const participants = await PickupGamesService.getParticipants(id);
      res.json({ success: true, data: participants });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Server error';
      res.status(500).json({ success: false, message });
    }
  }

  /* POST /api/pickup-games/participants/bulk  body: { gameIds: [] } */
  static async getParticipantsBulk(req: Request, res: Response): Promise<void> {
    try {
      const { gameIds } = req.body;
      if (!Array.isArray(gameIds)) {
        res.status(400).json({ success: false, message: 'gameIds array required' });
        return;
      }
      const data = await PickupGamesService.getParticipantsForGames(gameIds);
      res.json({ success: true, data });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Server error';
      res.status(500).json({ success: false, message });
    }
  }

  /* GET /api/pickup-games/user/:athleteId/joined */
  static async getUserJoinedGames(req: Request, res: Response): Promise<void> {
    try {
      const { athleteId } = req.params;
      const gameIds = await PickupGamesService.getUserJoinedGames(athleteId);
      res.json({ success: true, data: gameIds });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Server error';
      res.status(500).json({ success: false, message });
    }
  }

  static async sendInvites(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { emails, senderId } = req.body;

      if (!Array.isArray(emails) || emails.length === 0) {
        res.status(400).json({ success: false, message: 'emails array required' });
        return;
      }

      if (!senderId) {
        res.status(400).json({ success: false, message: 'senderId required' });
        return;
      }

      const result = await InviteService.sendGameInvites({
        gameId: id,
        emails,
        senderId,
      });

      res.json({
        success: true,
        message: `Sent ${result.sent} invite(s)`,
        data: result,
      });
    } catch (err) {
      console.error('❌ sendInvites:', err);
      const message = err instanceof Error ? err.message : 'Server error';
      res.status(500).json({ success: false, message });
    }
  }
}
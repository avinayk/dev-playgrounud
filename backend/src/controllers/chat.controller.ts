// src/controllers/chat.controller.ts
import type { Request, Response } from 'express';
import { athleteService } from '../services/athlete.service';
import { ChatService } from '../services/chat.service';

export class ChatController {
  /* ─────────────────────────────────────────────
     GET /api/chat/conversations?athleteId=xxx
     Get all conversations for a user
     ───────────────────────────────────────────── */
  static async getConversations(req: Request, res: Response): Promise<void> {
    try {
      const athleteId = String(req.query.athleteId ?? '').trim();

      if (!athleteId) {
        res.status(400).json({ success: false, message: 'athleteId required' });
        return;
      }

      const conversations = await ChatService.getConversations(athleteId);
      res.json({ success: true, data: conversations });
    } catch (err) {
      console.error('❌ getConversations:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }

  /* ─────────────────────────────────────────────
     GET /api/chat/conversations/:id/messages?athleteId=xxx
     Get all messages for a conversation
     ───────────────────────────────────────────── */
  static async getMessages(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const athleteId = String(req.query.athleteId ?? '').trim();

      if (!athleteId) {
        res.status(400).json({ success: false, message: 'athleteId required' });
        return;
      }

      const messages = await ChatService.getMessages(id, athleteId);
      res.json({ success: true, data: messages });
    } catch (err) {
      console.error('❌ getMessages:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }

  /* ─────────────────────────────────────────────
     POST /api/chat/conversations/direct
     body: { athleteA, athleteB }
     Get or create a direct conversation
     ───────────────────────────────────────────── */
  static async getOrCreateDirect(req: Request, res: Response): Promise<void> {
    try {
      const { athleteA, athleteB } = req.body;

      if (!athleteA || !athleteB) {
        res.status(400).json({ success: false, message: 'Missing ids' });
        return;
      }

      const conversation = await ChatService.getOrCreateDirect(
        athleteA,
        athleteB
      );
      res.json({ success: true, data: conversation });
    } catch (err) {
      console.error('❌ getOrCreateDirect:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }

  /* ─────────────────────────────────────────────
     POST /api/chat/messages
     body: { conversationId, senderId, text }
     Send a message (REST fallback — socket preferred)
     ───────────────────────────────────────────── */
  static async sendMessage(req: Request, res: Response): Promise<void> {
    try {
      const { conversationId, senderId, text } = req.body;

      if (!conversationId || !senderId || !text?.trim()) {
        res.status(400).json({ success: false, message: 'Missing fields' });
        return;
      }

      const message = await ChatService.sendMessage(
        conversationId,
        senderId,
        text.trim()
      );
      res.status(201).json({ success: true, data: message });
    } catch (err) {
      console.error('❌ sendMessage:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }

  /* ─────────────────────────────────────────────
     POST /api/chat/conversations/:id/read
     body: { athleteId }
     Mark all messages as read for the user
     ───────────────────────────────────────────── */
  static async markAsRead(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { athleteId } = req.body;

      if (!athleteId) {
        res.status(400).json({ success: false, message: 'athleteId required' });
        return;
      }

      await ChatService.markAsRead(id, athleteId);
      res.json({ success: true });
    } catch (err) {
      console.error('❌ markAsRead:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }

  /* ─────────────────────────────────────────────
     GET /api/chat/athletes?excludeId=xxx&q=search
     List athletes for New Chat modal
     ───────────────────────────────────────────── */
  static async listAthletes(req: Request, res: Response): Promise<void> {
    try {
      const excludeId = String(req.query.excludeId ?? '').trim();
      const query = String(req.query.q ?? '').trim();

      if (!excludeId) {
        res.status(400).json({ success: false, message: 'excludeId required' });
        return;
      }

      // ✅ SINGLETON instance pe method call
      const athletes = query
        ? await athleteService.searchAthletes(excludeId, query)
        : await athleteService.listAllExcept(excludeId);

      res.json({ success: true, data: athletes });
    } catch (err) {
      console.error('❌ listAthletes:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }

  /* ─────────────────────────────────────────────
     POST /api/chat/conversations/group
     body: { name, creatorId, memberIds: string[] }
     Create a group conversation (Team Chat channels)
     ───────────────────────────────────────────── */
  static async createGroup(req: Request, res: Response): Promise<void> {
    try {
      const { name, creatorId, memberIds } = req.body;

      if (!name || !creatorId || !Array.isArray(memberIds) || memberIds.length === 0) {
        res.status(400).json({
          success: false,
          message: 'name, creatorId and memberIds[] required',
        });
        return;
      }

      const conversation = await ChatService.createGroup(
        name,
        creatorId,
        memberIds
      );
      res.status(201).json({ success: true, data: conversation });
    } catch (err) {
      console.error('❌ createGroup:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }

  /* ─────────────────────────────────────────────
     DELETE /api/chat/conversations/:id
     body: { athleteId }
     Leave / delete a conversation
     ───────────────────────────────────────────── */
  static async deleteConversation(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { athleteId } = req.body;

      if (!athleteId) {
        res.status(400).json({ success: false, message: 'athleteId required' });
        return;
      }

      await ChatService.deleteConversation(id, athleteId);
      res.json({ success: true });
    } catch (err) {
      console.error('❌ deleteConversation:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
}
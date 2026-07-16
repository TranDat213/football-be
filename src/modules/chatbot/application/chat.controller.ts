import { Request, Response } from 'express';
import { ChatService } from './chat.service';
import { ChatMessage } from '../domain/chat-message';

export class ChatController {
  static async handleChat(req: Request, res: Response): Promise<void> {
    try {
      const messages: ChatMessage[] = req.body.messages;
      if (!messages || !Array.isArray(messages)) {
        res.status(400).json({ error: 'Invalid messages array' });
        return;
      }

      const userId = req.user?.id;
      const reply = await ChatService.handleChat(messages, userId);

      res.status(200).json(reply);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}

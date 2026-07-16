import { Router } from 'express';
import { ChatController } from '../modules/chatbot/application/chat.controller';
import { authenticateOptional } from '../middleware/authenticate.middleware';

const chatRouter = Router();

chatRouter.post('/', authenticateOptional, ChatController.handleChat);

export default chatRouter;

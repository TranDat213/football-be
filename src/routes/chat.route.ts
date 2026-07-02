import { Router } from 'express';
import { ChatController } from '../modules/chatbot/application/chat.controller';

const chatRouter = Router();

chatRouter.post('/', ChatController.handleChat);

export default chatRouter;

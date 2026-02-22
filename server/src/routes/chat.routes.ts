import { Router } from 'express';
import chatController from '../controllers/chat.controller';

const router = Router();

router.post('/request', chatController.createChatRequest.bind(chatController));
router.post('/:chatId/accept', chatController.acceptChat.bind(chatController));
router.get('/user/:userId', chatController.getUserChats.bind(chatController));
router.get('/:chatId/messages', chatController.getChatMessages.bind(chatController));

export default router;

import { Router } from 'express';
import userRoutes from './user.routes';
import chatRoutes from './chat.routes';

const router = Router();

router.use('/users', userRoutes);
router.use('/chat', chatRoutes);

export default router;

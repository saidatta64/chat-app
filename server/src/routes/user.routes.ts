import { Router } from 'express';
import userController from '../controllers/user.controller';

const router = Router();

router.post('/', userController.createUser.bind(userController));
router.post('/enter', userController.enterByUsername.bind(userController));
router.get('/search', userController.searchUsers.bind(userController));
router.get('/', userController.listUsers.bind(userController));

export default router;

import { Router, Request, Response } from 'express';
import * as roomController from '../controllers/roomController';

const router = Router();

router.post('/', (req: Request, res: Response) => roomController.createRoom(req, res));
router.post('/:id/join', (req: Request, res: Response) => roomController.joinRoom(req, res));
router.get('/:id', (req: Request, res: Response) => roomController.getRoom(req, res));

export default router;
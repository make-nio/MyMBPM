import { Router } from 'express';
import * as HomeController from '../controllers/homeController';

const router = Router();

router.get('/', HomeController.index);

// Si tienes otras rutas, por ejemplo para usuarios, podrías tener algo como esto:
// router.get('/users', UserController.index);

export default router;

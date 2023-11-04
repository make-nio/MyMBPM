// routes/index.ts
import express from 'express';
import frontendRoutes from './frontendRoutes';
import apiRoutes from './apiRoutes';

const router = express.Router();

// Rutas para el frontend
router.use('/', frontendRoutes);

// Rutas para la API
router.use('/api', apiRoutes);

export default router;

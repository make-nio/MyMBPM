// routes/apiRoutes.ts
import { Router } from 'express';

const router = Router();

router.get('/health', (req, res) => {
  // Aquí iría la lógica para recuperar y enviar algunos datos...
  res.json({ message: 'Health check OK!' });
});

// Puedes añadir más rutas de la API aquí...

export default router;

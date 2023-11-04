import { Request, Response } from 'express';

export const index = (req: Request, res: Response) => {
    res.render('index', { title: 'Inicio' });
};

// Aquí puedes añadir más métodos para manejar diferentes rutas del frontend

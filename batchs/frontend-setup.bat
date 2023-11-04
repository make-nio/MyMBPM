@echo off
setlocal

REM Creando las carpetas necesarias para el frontend
mkdir src\views
mkdir src\public
mkdir src\public\css
mkdir src\public\js
mkdir src\public\images

REM Crear archivo principal para vistas (pug/jade)
echo doctype html > src\views\layout.pug
echo html >> src\views\layout.pug
echo head >> src\views\layout.pug
echo    title= title >> src\views\layout.pug
echo body >> src\views\layout.pug
echo    block content >> src\views\layout.pug

REM Crear archivo de vista de inicio (pug/jade)
echo extends layout > src\views\index.pug
echo block content >> src\views\index.pug
echo    h1= title >> src\views\index.pug
echo    p Bienvenido a tu proyecto Node.js con TypeScript y Sequelize! >> src\views\index.pug

REM Creando el controlador principal para el frontend
echo import { Request, Response } from 'express'; > src\controllers\frontendController.ts
echo  >> src\controllers\frontendController.ts
echo export const index = (req: Request, res: Response): void => { >> src\controllers\frontendController.ts
echo    res.render('index', { title: 'Hola Mundo' }); >> src\controllers\frontendController.ts
echo }; >> src\controllers\frontendController.ts

REM Agregar rutas para el frontend en el archivo de rutas
echo import express from 'express'; > src\routes\frontendRoutes.ts
echo import * as frontendController from '../controllers/frontendController'; >> src\routes\frontendRoutes.ts
echo const router = express.Router(); >> src\routes\frontendRoutes.ts
echo  >> src\routes\frontendRoutes.ts
echo router.get('/', frontendController.index); >> src\routes\frontendRoutes.ts
echo  >> src\routes\frontendRoutes.ts
echo export default router; >> src\routes\frontendRoutes.ts

REM Actualizar archivo principal de rutas (routes/index.ts) para incorporar rutas de frontend
echo import frontendRoutes from './frontendRoutes'; >> src\routes\index.ts
echo app.use('/', frontendRoutes); >> src\routes\index.ts

endlocal

@echo off
setlocal

REM Creando el archivo index.ts en la raíz de src
echo import express from 'express'; > src\index.ts
echo import path from 'path'; >> src\index.ts
echo import routes from './routes'; >> src\index.ts
echo  >> src\index.ts
echo const app = express(); >> src\index.ts
echo const PORT = process.env.PORT || 3000; >> src\index.ts
echo  >> src\index.ts
echo // Configuración de vistas y directorios estáticos >> src\index.ts
echo app.set('views', path.join(__dirname, 'views')); >> src\index.ts
echo app.set('view engine', 'pug'); >> src\index.ts
echo app.use(express.static(path.join(__dirname, 'public'))); >> src\index.ts
echo  >> src\index.ts
echo // Uso de rutas >> src\index.ts
echo app.use(routes); >> src\index.ts
echo  >> src\index.ts
echo // Iniciar servidor >> src\index.ts
echo app.listen(PORT, () => { >> src\index.ts
echo    console.log(`Servidor escuchando en el puerto ${PORT}`); >> src\index.ts
echo }); >> src\index.ts

endlocal

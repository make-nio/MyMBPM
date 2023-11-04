@echo off

REM Crear estructura de carpetas
mkdir src
cd src
mkdir controllers
mkdir routes
mkdir views
mkdir models
mkdir config
mkdir middlewares

REM Crear archivo principal
echo console.log('Hola Mundo!'); > index.ts

REM Regresar a la raíz del proyecto
cd ..

REM Crear package.json
(
echo {
echo   "name": "proyecto-node-ts",
echo   "version": "1.0.0",
echo   "description": "",
echo   "main": "dist/index.js",
echo   "scripts": {
echo     "start": "ts-node src/index.ts",
echo     "build": "tsc"
echo   },
echo   "dependencies": {
echo     "express": "^4.17.1",
echo     "sequelize": "^6.6.5",
echo     "mssql": "^7.1.3",
echo     "dotenv": "^10.0.0"
echo   },
echo   "devDependencies": {
echo     "typescript": "^4.3.5",
echo     "ts-node": "^10.1.0"
echo   }
echo }
) > package.json

REM Crear tsconfig.json
(
echo {
echo   "compilerOptions": {
echo     "target": "es6",
echo     "module": "commonjs",
echo     "strict": true,
echo     "esModuleInterop": true,
echo     "skipLibCheck": true,
echo     "forceConsistentCasingInFileNames": true,
echo     "outDir": "./dist",
echo     "rootDir": "./src"
echo   },
echo   "include": ["src/**/*.ts"],
echo   "exclude": ["node_modules"]
echo }
) > tsconfig.json

REM Crear .env y .env.example
echo DB_USER=SA > .env
echo DB_PASS={4lt0p4SW0rD}-[v13j4] >> .env
echo DB_HOST=localhost >> .env
echo DB_NAME=MYMBPM >> .env

echo DB_USER= > .env.example
echo DB_PASS= >> .env.example
echo DB_HOST= >> .env.example
echo DB_NAME= >> .env.example

REM Crear archivos Sequelize config y Docker

REM Configuración Sequelize
echo const path = require('path'); > src/config/database.js
echo require('dotenv').config({ path: path.resolve(__dirname, '../../.env') }); >> src/config/database.js
echo module.exports = { >> src/config/database.js
echo    dialect: 'mssql', >> src/config/database.js
echo    host: process.env.DB_HOST, >> src/config/database.js
echo    username: process.env.DB_USER, >> src/config/database.js
echo    password: process.env.DB_PASS, >> src/config/database.js
echo    database: process.env.DB_NAME, >> src/config/database.js
echo    define: { >> src/config/database.js
echo        timestamps: true, >> src/config/database.js
echo        underscored: true, >> src/config/database.js
echo    } >> src/config/database.js
echo }; >> src/config/database.js

REM Dockerfile
echo FROM node:14 >> Dockerfile
echo WORKDIR /usr/src/app >> Dockerfile
echo COPY package*.json ./ >> Dockerfile
echo RUN npm install >> Dockerfile
echo COPY . . >> Dockerfile
echo CMD [ "npm", "start" ] >> Dockerfile

REM Docker Compose
echo version: '3' > docker-compose.yml
echo services: >> docker-compose.yml
echo   web: >> docker-compose.yml
echo     build: . >> docker-compose.yml
echo     ports: >> docker-compose.yml
echo      - "5000:5000" >> docker-compose.yml

echo Done!

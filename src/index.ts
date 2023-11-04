import express from 'express';
import nunjucks from 'nunjucks';
import path from 'path';
import routes from './routes';

const PORT = process.env.PORT || 3000;
const app = express();

// Configuración de Nunjucks
nunjucks.configure(path.join(__dirname, 'views'), {
    autoescape: true,
    express: app,
    watch: true
});

app.set('view engine', 'html');

// Directorio estático para recursos como CSS, JS e imágenes
app.use(express.static(path.join(__dirname, 'public')));

// Uso de rutas
app.use(routes);

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});


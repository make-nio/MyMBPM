# Venta online

## Qué ya existe en el modelo

- **Items del catálogo:**
  - `PUBLICO` (sí o no) marca qué se mostraría afuera;
  - `SLUG` es único y sirve para la dirección de cada producto (`/tienda/maceta-geometrica-chica`);
  - `DESCRIPCION_CORTA`, `DESCRIPCION_COMPLETA`, `PRECIO`, `TIPO_MATERIAL` y `COLOR` alcanzan para
    armar una ficha de producto.
- **Imágenes:** `IMAGEN_PRINCIPAL` e `ITEM_CATALOGO_IMAGEN` guardan **direcciones** de imágenes.
  Todavía no hay carga de archivos.
- **Categorías:** tienen slug, así que sirven para armar secciones.
- **Pedidos:** ya existe el origen `WEB`, y las solicitudes especiales guardan nombre, teléfono,
  email y descripción de alguien que todavía no es cliente.
- **Lo que no hay:**
  - ninguna pantalla pública: todo el sitio es privado, con usuario;
  - ningún endpoint sin sesión, salvo el ingreso y `/api/health`;
  - carga de imágenes;
  - cobro online.

## Tres niveles

Cada nivel incluye el anterior. Todos van en el mismo sitio de Netlify, con páginas estáticas
públicas bajo `/tienda`, separadas del panel.

### 1. Catálogo sin precios (vidriera)

- Página pública con los items `PUBLICO`, por categoría: foto, nombre y descripción. La ficha de
  cada producto tiene su dirección propia.
- Un botón "Consultar por WhatsApp" con un mensaje armado ("Hola, me interesa la Maceta
  geométrica chica").
- **Técnico:** `GET /api/publico/catalogo` sin sesión, que devuelve **solo** campos públicos
  (nunca costo, stock ni observaciones internas), con caché. Se suma la carga de imágenes a Netlify
  Blobs, porque hoy solo hay direcciones.
- **Estimación:** 2 a 3 PRs, unos 2 días, contando la carga de imágenes.

### 2. Con precios y pedido de presupuesto

- Lo anterior, más **precios** y un formulario "Pedir presupuesto" (nombre, teléfono, email,
  productos y cantidades, comentario).
- El formulario crea una **solicitud especial** con origen web, que Maxi ve en su pantalla de
  siempre y convierte en pedido con un clic. No crea pedidos solo.
- **Técnico:** `POST /api/publico/solicitudes`, que es el primer endpoint público que escribe.
  Necesita protección contra abuso: límite por IP (como el del ingreso), un campo trampa y un
  tamaño máximo.
- **Estimación:** +2 PRs sobre el nivel 1, unos 1,5 días.

### 3. Con carrito

- El cliente arma un carrito, elige retiro o envío y **paga online** (Mercado Pago Checkout).
- El pedido entra al sistema como **Pendiente** con origen `WEB`, ya pagado o señado.
- **Técnico:**
  - carrito en el navegador;
  - `POST /api/publico/pedidos` con validación de precios del lado del servidor;
  - integración con Mercado Pago: preferencia, webhook de pago e idempotencia del webhook;
  - necesita **cobros con monto** (ver [cobros-con-monto.md](cobros-con-monto.md));
  - política de stock: ¿se vende sin stock y se fabrica, o solo lo que hay?;
  - costos de envío y términos y condiciones.
- **Estimación:** 6 a 10 PRs, unas 2 a 3 semanas. Depende de Mercado Pago y del envío.

### Recomendación

Empezar por el **nivel 2**. Con poco trabajo le da a Maxi una vidriera con precios y convierte
consultas en solicitudes que ya sabe manejar. El carrito agrega pagos, envíos y stock en tiempo
real, y conviene cuando las consultas por la vidriera lo justifiquen.

## Pregunta para Maxi

**¿Querés que los clientes vean tus productos en una página pública? Y si sí: ¿solo para mirar,
para ver precios y pedirte presupuesto, o para comprar con carrito?**

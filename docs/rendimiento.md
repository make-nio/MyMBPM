# Rendimiento: qué se probó y qué dio

Registro de lo que se midió sobre el presupuesto de Lighthouse (`npm run test:rendimiento`, ver
README), para no repetir pruebas que ya se hicieron. Los números son del CI (runner de GitHub)
salvo que diga "local". El contenedor de desarrollo mide más lento y con más ruido: el TBT sale 2
a 5 veces mayor, así que sirve para comparar antes y después, no como valor absoluto.

## Cómo calcula Lighthouse el LCP de estas pantallas

- Las pantallas privadas son un export estático de Next que se arma en el navegador: hay que bajar
  y ejecutar el JS, validar la sesión (`/api/autenticacion/me`) y recién ahí se pinta el contenido.
- Lighthouse **no mide** el LCP con la red lenta: carga la página rápido y **simula** cómo sería
  en un celular con 4G lento (modelo "Lantern"). Esa simulación incluye **todo lo que se pidió
  antes del LCP observado**, y los scripts de la página se piden en el `<head>`, antes de pintar
  nada.
- Consecuencia: en este presupuesto **el LCP depende sobre todo de cuánto JS baja la pantalla**,
  no de cuándo aparece el texto. Achicar el JS de una pantalla mueve el número. Pintar antes, no.

## Septiembre de 2026: el margen de `/pedidos`

Mínimo de `/pedidos`: 87 (fijado en #53 con la medición del CI menos 5).

| Momento | `/pedidos` | LCP | JS | Qué cambió |
| --- | --- | --- | --- | --- |
| Antes de la campanita (main 141d219) | 89 | 3790 ms | 401 KB | — |
| Campanita, primera versión (#68, 23c3e22) | 75 | 3765 ms | 401 KB | **CLS 0,275**: el contador aparecía al llegar la consulta y corría la página |
| Campanita con el lugar reservado (#68) | 86–87 | ~4000 ms | 404 KB | CLS 0, pero quedó en el borde del mínimo |
| Campanita diferida (#76) | 87 | 3951 ms | 408 KB | `next/dynamic` y consulta con `requestIdleCallback`: +1 punto |
| Detalle del pedido diferido (#77) | **88** | 3800 ms | 394 KB | `PanelPedido` con `next/dynamic`: el chunk de la página baja de 31,8 a 16,4 KB |

### Lo que funcionó

- **Reservar el lugar de lo que carga después** (#68). Un elemento que aparece cuando llega una
  consulta y cambia el tamaño del encabezado corre toda la pantalla, y el CLS hundió tres páginas
  a la vez. Regla: lo que se carga después ocupa su lugar desde el principio.
- **Sacar del JS inicial lo que no se ve al entrar** (#76, #77): la campanita y el detalle del
  pedido, que solo se abre al elegir uno, con `next/dynamic` y un marcador mientras llega. Es la
  palanca que mueve el número, por lo explicado arriba.

### Lo que no funcionó (no repetir)

- **Demorar más la campanita** (local): montarla con `requestIdleCallback` o con 1,5 s de espera.
  El LCP no se movió (~4,0 s). No era la campanita, era el JS total.
- **Pintar el marco sin esperar a `/me`** (rama `feat/marco-sin-esperar-sesion`, sin PR):
  - **Qué se probó:** mientras se valida la sesión, el layout muestra el menú, el encabezado y el
    título de la pantalla, sin datos, y el título viene en el HTML estático.
  - **Para quien usa la app:** el LCP observado bajó de ~350 ms a ~100 ms.
  - **En Lighthouse:** el LCP simulado no cambió (~3,9 s), porque los scripts igual se piden antes.
    Además sumó JS al layout y el Dashboard empeoró (JS 458 → 473 KB).
  - **Decisión:** no se integra por ahora. Tocaba el ingreso y sumaba JS para una mejora que el
    presupuesto no ve, en una app que usa una persona.

## Si una pantalla se acerca al mínimo

1. Mirar en el reporte (artefacto `lighthouse` del CI) qué métrica cae: CLS, LCP o TBT.
2. Si es **CLS**: buscar qué aparece tarde y reservarle el lugar.
3. Si es **LCP**: ver el JS de la pantalla (columna "JS descargado" y el chunk
   `app/(privado)/<pantalla>/page-*.js` en `apps/web/out`) y sacar con `next/dynamic` lo que no se
   ve al entrar: detalles, diálogos, gráficos.
4. No bajar el umbral para que pase: si un cambio lo mueve a propósito, se explica en el PR.

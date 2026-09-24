// Ayuda para escribir el contrato: npx tsx scripts/contrato-verificar.ts [etiqueta]
// Lista las rutas de Express que faltan en el contrato (o sobran) y prueba generar el OpenAPI.
import { endpoints } from "../src/contrato/endpoints";
import { generarOpenApi } from "../src/contrato/openapi";
import { listarRutasExpress } from "../src/contrato/rutas-express";
import { apiRouter } from "../src/routes/index";

const filtro = process.argv[2];
const express = listarRutasExpress(apiRouter, "/api").map((r) => `${r.metodo} ${r.ruta}`);
const contrato = endpoints.map((e) => `${e.metodo} ${e.ruta}`);
const faltan = express.filter((r) => !contrato.includes(r) && (!filtro || r.includes(`/${filtro}`)));
const sobran = contrato.filter((r) => !express.includes(r));
console.log("Faltan en el contrato:", faltan.length ? faltan : "ninguna");
console.log("Sobran en el contrato:", sobran.length ? sobran : "ninguna");
const lista = filtro ? endpoints.filter((e) => e.etiqueta === filtro) : endpoints;
const documento = generarOpenApi(lista);
console.log(`OpenAPI generado: ${Object.keys(documento.paths ?? {}).length} rutas`);

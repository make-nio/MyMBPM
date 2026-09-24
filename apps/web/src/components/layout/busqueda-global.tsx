"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { KeyboardEvent as EventoTeclado, MouseEvent, useEffect, useRef, useState } from "react";

import { formatearEstado, formatearMoneda } from "../../lib/formato";
import { MINIMO_BUSQUEDA, buscarGlobal, rutaResultado } from "../../lib/modulos/busqueda";
import { ResultadosBusqueda } from "../../types/busqueda";

type Resultado = { href: string; titulo: string; detalle: string };

function agrupar(resultados: ResultadosBusqueda) {
  const grupos: Array<{ nombre: string; resultados: Resultado[] }> = [
    {
      nombre: "Pedidos",
      resultados: resultados.pedidos.map((pedido) => ({
        href: rutaResultado.pedido(pedido.idPedido),
        titulo: pedido.numeroPedido ?? `Pedido ${pedido.idPedido}`,
        detalle: [
          `${pedido.cliente.nombre} ${pedido.cliente.apellido ?? ""}`.trim(),
          formatearEstado(pedido.estadoPedido),
          formatearMoneda(pedido.total)
        ].join(" · ")
      }))
    },
    {
      nombre: "Clientes",
      resultados: resultados.clientes.map((cliente) => ({
        href: rutaResultado.cliente(cliente.idCliente),
        titulo: `${cliente.nombre} ${cliente.apellido ?? ""}`.trim(),
        detalle: [cliente.telefono, cliente.email, cliente.activo ? null : "Inactivo"].filter(Boolean).join(" · ")
      }))
    },
    {
      nombre: "Items",
      resultados: resultados.items.map((item) => ({
        href: rutaResultado.item(item.idItemCatalogo),
        titulo: item.nombre,
        detalle: [
          formatearEstado(item.tipoItem),
          item.categoria,
          item.precio === null ? null : `Precio ${formatearMoneda(item.precio)}`,
          // Solo viene para quien puede ver costos.
          item.costo === undefined || item.costo === null ? null : `Costo ${formatearMoneda(item.costo)}`,
          item.activo ? null : "Inactivo"
        ]
          .filter(Boolean)
          .join(" · ")
      }))
    }
  ];

  return grupos.filter((grupo) => grupo.resultados.length > 0);
}

// Busqueda en pedidos, clientes e items desde cualquier pantalla: boton del encabezado o Ctrl+K
// (Cmd+K en Mac). Cada resultado lleva a su pantalla.
export function BusquedaGlobal() {
  const pathname = usePathname();
  const [abierta, setAbierta] = useState(false);
  const [texto, setTexto] = useState("");
  const [resultados, setResultados] = useState<ResultadosBusqueda | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refEntrada = useRef<HTMLInputElement>(null);
  const refLista = useRef<HTMLDivElement>(null);
  const refBoton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function alPresionar(evento: KeyboardEvent) {
      if ((evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === "k") {
        evento.preventDefault();
        setAbierta(true);
      }
    }

    window.addEventListener("keydown", alPresionar);
    return () => window.removeEventListener("keydown", alPresionar);
  }, []);

  useEffect(() => {
    if (abierta) {
      refEntrada.current?.focus();
      refEntrada.current?.select();
    }
  }, [abierta]);

  // Espera a que se deje de escribir; una respuesta vieja no pisa a la nueva.
  useEffect(() => {
    const consulta = texto.trim();

    if (!abierta || consulta.length < MINIMO_BUSQUEDA) {
      setResultados(null);
      setBuscando(false);
      setError(null);
      return;
    }

    let vigente = true;
    setBuscando(true);
    const espera = setTimeout(() => {
      buscarGlobal(consulta)
        .then((datos) => {
          if (vigente) {
            setResultados(datos);
            setError(null);
          }
        })
        .catch((causa: unknown) => {
          if (vigente) {
            setError(causa instanceof Error ? causa.message : "No fue posible buscar");
          }
        })
        .finally(() => {
          if (vigente) {
            setBuscando(false);
          }
        });
    }, 250);

    return () => {
      vigente = false;
      clearTimeout(espera);
    };
  }, [texto, abierta]);

  function cerrar() {
    setAbierta(false);
    refBoton.current?.focus();
  }

  function enlaces() {
    return Array.from(refLista.current?.querySelectorAll<HTMLAnchorElement>("a") ?? []);
  }

  // Flechas para moverse entre la entrada y los resultados; Escape cierra.
  function alTeclear(evento: EventoTeclado<HTMLDivElement>) {
    if (evento.key === "Escape") {
      evento.preventDefault();
      cerrar();
      return;
    }

    if (evento.key !== "ArrowDown" && evento.key !== "ArrowUp") {
      return;
    }

    const lista = enlaces();
    if (lista.length === 0) {
      return;
    }

    evento.preventDefault();
    const actual = lista.indexOf(document.activeElement as HTMLAnchorElement);

    if (evento.key === "ArrowDown") {
      lista[Math.min(actual + 1, lista.length - 1)].focus();
    } else if (actual <= 0) {
      refEntrada.current?.focus();
    } else {
      lista[actual - 1].focus();
    }
  }

  // Si el resultado es de la pantalla en la que ya estoy, se recarga para que la abra.
  function alElegir(evento: MouseEvent<HTMLAnchorElement>, href: string) {
    setAbierta(false);
    setTexto("");

    if (href.split("?")[0] === pathname) {
      evento.preventDefault();
      window.location.assign(href);
    }
  }

  const grupos = resultados ? agrupar(resultados) : [];
  const consulta = texto.trim();

  return (
    <>
      <button
        aria-keyshortcuts="Control+K Meta+K"
        className="boton-secundario boton-busqueda"
        onClick={() => setAbierta(true)}
        ref={refBoton}
        type="button"
      >
        Buscar <kbd>Ctrl K</kbd>
      </button>

      {abierta ? (
        <div className="modal-overlay" onClick={cerrar} role="presentation">
          <div
            aria-label="Buscar"
            aria-modal="true"
            className="modal-contenido busqueda-global"
            onClick={(evento) => evento.stopPropagation()}
            onKeyDown={alTeclear}
            role="dialog"
          >
            <div className="busqueda-global__entrada">
              <input
                aria-describedby="busqueda-global-estado"
                aria-label="Buscar pedidos, clientes e items"
                autoComplete="off"
                onChange={(evento) => setTexto(evento.target.value)}
                onKeyDown={(evento) => {
                  if (evento.key === "Enter") {
                    enlaces()[0]?.click();
                  }
                }}
                placeholder="Numero de pedido, cliente o item"
                ref={refEntrada}
                type="search"
                value={texto}
              />
              <button className="boton-secundario" onClick={cerrar} type="button">
                Cerrar
              </button>
            </div>

            <p aria-live="polite" className="busqueda-global__estado" id="busqueda-global-estado">
              {consulta.length < MINIMO_BUSQUEDA
                ? `Escribi al menos ${MINIMO_BUSQUEDA} letras o numeros.`
                : buscando
                  ? "Buscando..."
                  : error
                    ? error
                    : grupos.length === 0
                      ? `Sin resultados para "${consulta}".`
                      : "Flechas para moverte, Enter para abrir el primero."}
            </p>

            <div className="busqueda-global__resultados" ref={refLista}>
              {grupos.map((grupo) => (
                <section aria-label={grupo.nombre} key={grupo.nombre}>
                  <h3>{grupo.nombre}</h3>
                  <ul>
                    {grupo.resultados.map((resultado) => (
                      <li key={resultado.href}>
                        <Link href={resultado.href} onClick={(evento) => alElegir(evento, resultado.href)}>
                          <strong>{resultado.titulo}</strong>
                          {resultado.detalle ? <span>{resultado.detalle}</span> : null}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

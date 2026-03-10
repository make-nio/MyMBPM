const metricas = [
  {
    label: "Sesion activa",
    value: "OK",
    description: "La autenticacion del panel ya esta conectada al backend."
  },
  {
    label: "Backend operativo",
    value: "API",
    description: "El panel privado ya puede consumir autenticacion y modulos."
  },
  {
    label: "Siguiente paso",
    value: "CRUDs",
    description: "La base ya permite empezar con modulos administrativos."
  }
];

export default function PanelPage() {
  return (
    <section className="panel-dashboard">
      <article className="panel-dashboard__hero">
        <p className="marca-pequena">Dashboard inicial</p>
        <h1>Panel privado listo para empezar a operar.</h1>
        <p>
          Esta primera base ya resuelve ingreso, persistencia de sesion,
          proteccion de rutas y navegacion privada. Sobre este layout podemos
          construir ahora los modulos administrativos del sistema.
        </p>
      </article>

      <div className="panel-dashboard__grid">
        {metricas.map((metrica) => (
          <article className="panel-dashboard__card" key={metrica.label}>
            <p>{metrica.label}</p>
            <strong>{metrica.value}</strong>
            <p>{metrica.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

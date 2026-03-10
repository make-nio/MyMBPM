const features = [
  "Workflow orchestration",
  "Task tracking",
  "Approvals and audit trail"
];

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">BPM Monorepo</p>
        <h1>Base lista para empezar el sistema.</h1>
        <p className="lead">
          Frontend en Next.js y backend en Node.js, TypeScript y Prisma dentro
          del mismo repositorio.
        </p>
      </section>

      <section className="card-grid">
        {features.map((feature) => (
          <article className="card" key={feature}>
            <h2>{feature}</h2>
            <p>Placeholder inicial para el dominio BPM.</p>
          </article>
        ))}
      </section>
    </main>
  );
}


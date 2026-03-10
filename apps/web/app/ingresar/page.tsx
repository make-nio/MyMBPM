import { FormularioLogin } from "../../src/components/auth/formulario-login";

export default function IngresarPage() {
  return (
    <main className="pantalla-centrada">
      <section className="tarjeta-acceso">
        <p className="marca-pequena">MLM BPM</p>
        <h1 className="titulo-acceso">Ingresar al panel</h1>
        <p className="texto-secundario">
          Usa tu usuario o email y tu clave para entrar al area privada del
          sistema.
        </p>

        <FormularioLogin />
      </section>
    </main>
  );
}

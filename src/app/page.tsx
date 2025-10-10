export default function Home() {
  return (
    <div className="container">
      <div className="game-screen text-center">
        <h1 className="display-4">¡Bienvenido a Pokémon Fantasy League!</h1>
        <p className="lead">
          Conviértete en un Mánager Pokémon, draftea tu equipo soñado y compite contra tus amigos.
        </p>
        <hr className="my-4" />
        <p>
          Demuestra quién es el mejor estratega y lleva a tu equipo a la victoria.
        </p>
        <div className="mt-4">
          <a href="/register" className="btn btn-primary btn-lg mx-2" style={{ backgroundColor: '#ffcb05', borderColor: '#3b4cca', color: '#3b4cca' }}>
            Registrarse
          </a>
          <a href="/login" className="btn btn-secondary btn-lg mx-2">
            Iniciar Sesión
          </a>
        </div>
      </div>
    </div>
  );
}

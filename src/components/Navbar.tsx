'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';

export default function Navbar() {
  const { data: session, status } = useSession();

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark mb-4">
      <div className="container">
        <Link href="/" className="navbar-brand" style={{ fontFamily: "'Press Start 2P', sans-serif", color: '#ffcb05' }}>
          PKMN-FANTASY
        </Link>
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto">
            {status === 'authenticated' ? (
              <>
                <li className="nav-item">
                  <Link href="/leagues" className="nav-link">
                    Ligas
                  </Link>
                </li>
                <li className="nav-item">
                  <Link href="/create-league" className="nav-link">
                    Crear Liga
                  </Link>
                </li>
                <li className="nav-item">
                  <Link href="/trades" className="nav-link">
                    Mis Intercambios
                  </Link>
                </li>
                <li className="nav-item">
                  <Link href="/results" className="nav-link">
                    Resultados
                  </Link>
                </li>
                <li className="nav-item">
                  <Link href="/my-team" className="nav-link">
                    Mi Equipo
                  </Link>
                </li>
                <li className="nav-item">
                  <button onClick={() => signOut()} className="btn btn-link nav-link">
                    Logout
                  </button>
                </li>
              </>
            ) : (
              <>
                <li className="nav-item">
                  <Link href="/login" className="nav-link">
                    Login
                  </Link>
                </li>
                <li className="nav-item">
                  <Link href="/register" className="nav-link">
                    Registro
                  </Link>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
}

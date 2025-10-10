'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function CreateLeaguePage() {
  const [name, setName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [message, setMessage] = useState('');
  const router = useRouter();
  const { status } = useSession();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    if (status !== 'authenticated') {
      setMessage('Debes iniciar sesión para crear una liga.');
      return;
    }

    try {
      const response = await fetch('/api/leagues/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, maxPlayers: parseInt(maxPlayers.toString(), 10) }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al crear la liga.');
      }

      setMessage(`Liga creada exitosamente! Código de unión: ${data.league.joinCode}`);
      setName('');
      setMaxPlayers(8);
      router.push(`/leagues/${data.league.id}`); // Redirect to the new league's detail page

    } catch (error: any) {
      setMessage(error.message);
    }
  };

  return (
    <div className="container">
      <div className="game-screen text-center" style={{ maxWidth: '600px', margin: 'auto' }}>
        <h1 className="mb-4">Crear Nueva Liga</h1>
        <form onSubmit={handleSubmit}>
          <div className="form-floating mb-3">
            <input
              type="text"
              className="form-control"
              id="leagueNameInput"
              placeholder="Nombre de la Liga"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <label htmlFor="leagueNameInput">Nombre de la Liga</label>
          </div>
          <div className="form-floating mb-3">
            <input
              type="number"
              className="form-control"
              id="maxPlayersInput"
              placeholder="Máximo de Jugadores"
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(parseInt(e.target.value, 10))}
              min="2"
              max="10"
              required
            />
            <label htmlFor="maxPlayersInput">Máximo de Jugadores</label>
          </div>
          <button type="submit" className="btn btn-primary btn-lg" style={{ backgroundColor: '#ffcb05', borderColor: '#3b4cca', color: '#3b4cca' }}>
            Crear Liga
          </button>
        </form>
        {message && <p className="mt-3">{message}</p>}
      </div>
    </div>
  );
}

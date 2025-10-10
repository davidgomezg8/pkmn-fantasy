'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface League {
  id: number;
  name: string;
  members: { id: number; name: string }[]; // This will be replaced by _count.teams
  maxPlayers: number;
  joinCode?: string;
}

export default function LeaguesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [leagues, setLeagues] = useState<League[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joinCodeMessage, setJoinCodeMessage] = useState<string | null>(null);

  const fetchLeagues = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/leagues');
      if (!response.ok) {
        throw new Error('No se pudo cargar la lista de ligas.');
      }
      const data = await response.json();
      setLeagues(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      fetchLeagues();
    }
  }, [status]);

  const handleJoinLeague = async (leagueId: number) => {
    if (!session) {
      alert('Debes iniciar sesión para unirte a una liga.');
      return;
    }

    try {
      const response = await fetch(`/api/leagues/${leagueId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: session.user.id }),
      });

      const data = await response.json();
      alert(data.message);

      if (response.ok) {
        fetchLeagues();
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleJoinLeagueByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinCodeMessage(null);

    if (status !== 'authenticated') {
      setJoinCodeMessage('Debes iniciar sesión para unirte a una liga.');
      return;
    }

    try {
      const response = await fetch('/api/leagues/join-by-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ joinCode: joinCodeInput }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al unirse a la liga.');
      }

      setJoinCodeMessage(data.message);
      setJoinCodeInput('');
      fetchLeagues(); // Refresh the list of leagues

    } catch (err: any) {
      setJoinCodeMessage(err.message);
    }
  };

  if (status === 'loading' || isLoading) {
    return <div className="container text-center mt-5"><h1>Buscando Ligas...</h1></div>;
  }

  if (status === 'unauthenticated') {
    return (
      <div className="container text-center mt-5">
        <h1>Debes iniciar sesión para ver las ligas</h1>
        <button onClick={() => router.push('/login')} className="btn btn-primary mt-3">
          Iniciar Sesión
        </button>
      </div>
    );
  }

  if (error) {
    return <div className="container text-center mt-5"><h1>Error: {error}</h1></div>;
  }

  return (
    <div className="container">
      <h1 className="text-center mb-5">Ligas Disponibles</h1>

      {status === 'authenticated' && (
        <div className="mb-4 p-4 border rounded game-screen" style={{ maxWidth: '600px', margin: 'auto' }}>
          <h2 className="mb-3">Unirse a una Liga por Código</h2>
          <form onSubmit={handleJoinLeagueByCode}>
            <div className="input-group mb-3">
              <input
                type="text"
                className="form-control"
                placeholder="Introduce el código de la liga"
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value)}
                required
              />
              <button className="btn btn-primary" type="submit" style={{ backgroundColor: '#3b4cca', borderColor: '#3b4cca', color: '#ffcb05' }}>
                Unirse
              </button>
            </div>
            {joinCodeMessage && <p className="mt-2">{joinCodeMessage}</p>}
          </form>
        </div>
      )}

      <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
        {leagues.map((league) => {
          return (
            <div key={league.id} className="col">
              <Link href={`/leagues/${league.id}`} passHref>
                <div className="card h-100 game-screen" style={{ margin: 0, cursor: 'pointer' }}>
                  <div className="card-body text-center d-flex flex-column justify-content-between">
                    <div>
                      <h5 className="card-title display-6">{league.name}</h5>
                      <p className="card-text">Miembros: {league.members.length} / {league.maxPlayers}</p>
                      {league.joinCode && <p className="card-text">Código: {league.joinCode}</p>}
                    </div>
                    {league.joinCode ? (
                      <p className="card-text text-muted mt-3">Unirse con código</p>
                    ) : (
                      <button 
                        onClick={(e) => { e.preventDefault(); handleJoinLeague(league.id); }}
                        className="btn btn-primary mt-3"
                        style={{ backgroundColor: '#ffcb05', borderColor: '#3b4cca', color: '#3b4cca' }}
                      >
                        Unirse a la Liga
                      </button>
                    )}
                  </div>
                </div>
              </Link>
            </div>
          );
        })}      </div>
    </div>
  );
}

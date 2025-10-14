'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import io, { Socket } from 'socket.io-client';

interface User {
  id: number;
  email: string;
}

interface Team {
  id: number;
  userId: number;
  leagueId: number;
  user: User;
}

interface League {
  id: number;
  name: string;
  creator: { id: number; email: string }; // Include creator object
  creatorId: number;
  status: 'OPEN' | 'TEAMS_GENERATED' | 'IN_PROGRESS' | 'COMPLETED';
  maxPlayers: number;
  joinCode?: string;
  teams: Team[];
}

export default function LeagueDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session, status } = useSession();
  const leagueId = parseInt(params.id as string);
  const [league, setLeague] = useState<League | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [leaguePokemons, setLeaguePokemons] = useState<Pokemon[]>([]);
  const [allAvailablePokemons, setAllAvailablePokemons] = useState<Pokemon[]>([]);
  const [showAddPokemonModal, setShowAddPokemonModal] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [incomingChallenge, setIncomingChallenge] = useState<{ from: string, battleId: number } | null>(null);

  const fetchLeagueDetails = async () => {
    try {
      const response = await fetch(`/api/leagues/${leagueId}`);
      if (!response.ok) {
        throw new Error('No se pudo cargar los detalles de la liga.');
      }
      const data = await response.json();
      setLeague(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchLeaguePokemons = async () => {
    try {
      const response = await fetch(`/api/leagues/${leagueId}/pokemon`);
      if (!response.ok) {
        throw new Error('No se pudieron cargar los Pokémon de la liga.');
      }
      const data = await response.json();
      setLeaguePokemons(data);
    } catch (err: any) {
      console.error('Error fetching league pokemons:', err);
    }
  };

  const fetchAllAvailablePokemons = async () => {
    try {
      // Assuming an API endpoint to get all pokemons not assigned to any league
      const response = await fetch('/api/pokemon/available'); // We need to create this endpoint
      if (!response.ok) {
        throw new Error('No se pudieron cargar los Pokémon disponibles.');
      }
      const data = await response.json();
      setAllAvailablePokemons(data);
    } catch (err: any) {
      console.error('Error fetching all available pokemons:', err);
    }
  };

  useEffect(() => {
    if (isNaN(leagueId)) {
      setError('ID de liga inválido.');
      setLoading(false);
      return;
    }

    if (status === 'authenticated') {
      fetchLeagueDetails();
      fetchLeaguePokemons();
      fetchAllAvailablePokemons(); // Fetch all available pokemons when component mounts
    }
    setLoading(false);
  }, [leagueId, status]);

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to socket server');
      if (session?.user) {
        newSocket.emit('registerUser', parseInt((session.user as any).id, 10));
      }
    });

    newSocket.on('challenge', ({ from, battleId }) => {
      console.log('Received challenge event:', { from, battleId });
      setIncomingChallenge({ from, battleId });
    });

    newSocket.on('battleAccepted', ({ battleId, myTeamId }) => {
      console.log('Received battleAccepted event:', { battleId, myTeamId });
      setIncomingChallenge(null); // Clear any incoming challenge
      router.push(`/battle/live/${battleId}?myTeamId=${myTeamId}`);
    });

    newSocket.on('battleRejected', ({ battleId }) => {
      setIncomingChallenge(null); // Clear any incoming challenge
      setMessage('Tu desafío ha sido rechazado.');
    });

    return () => {
      newSocket.disconnect();
    };
  }, [session]);

  const handleAddPokemonToLeague = async (pokemonId: number) => {
    console.log('Attempting to add Pokémon with ID:', pokemonId, 'to league:', leagueId);
    try {
      const response = await fetch(`/api/leagues/${leagueId}/pokemon/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pokemonId }),
      });

      const data = await response.json();
      console.log('Response from add Pokémon API:', data);

      if (!response.ok) {
        throw new Error(data.message || 'Error al añadir Pokémon a la liga.');
      }

      setMessage('Pokémon añadido a la liga exitosamente!');
      fetchLeaguePokemons(); // Refresh league pokemons
      fetchAllAvailablePokemons(); // Refresh available pokemons
    } catch (err: any) {
      setMessage(err.message);
      console.error('Error in handleAddPokemonToLeague:', err);
    }
  };

  const handleRemovePokemonFromLeague = async (pokemonId: number) => {
    try {
      const response = await fetch(`/api/leagues/${leagueId}/pokemon/remove`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pokemonId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al eliminar Pokémon de la liga.');
      }

      setMessage('Pokémon eliminado de la liga exitosamente!');
      fetchLeaguePokemons(); // Refresh league pokemons
      fetchAllAvailablePokemons(); // Refresh available pokemons
    } catch (err: any) {
      setMessage(err.message);
    }
  };

  const handleAddAllPokemonsToLeague = async () => {
    if (allAvailablePokemons.length === 0) {
      setMessage('No hay Pokémon disponibles para añadir.');
      return;
    }

    const pokemonIds = allAvailablePokemons.map(p => p.id);

    try {
      const response = await fetch(`/api/leagues/${leagueId}/pokemon/add-many`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pokemonIds }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al añadir todos los Pokémon a la liga.');
      }

      setMessage('Todos los Pokémon disponibles han sido añadidos a la liga!');
      fetchLeaguePokemons(); // Refresh league pokemons
      fetchAllAvailablePokemons(); // Refresh available pokemons
    } catch (err: any) {
      setMessage(err.message);
      console.error('Error in handleAddAllPokemonsToLeague:', err);
    }
  };

  const handleGenerateTeams = async () => {
    if (!session || !session.user) {
      setMessage('Debes iniciar sesión para generar equipos.');
      return;
    }

    if (!league || league.creatorId !== parseInt((session.user as any).id, 10)) {
      setMessage('Solo el creador de la liga puede generar equipos.');
      return;
    }

    if (league.status !== 'OPEN') {
      setMessage('Los equipos ya han sido generados o la liga no está abierta.');
      return;
    }

    if (league.teams.length < 2) {
      setMessage('Se necesitan al menos 2 jugadores para generar equipos.');
      return;
    }

    try {
      const response = await fetch(`/api/leagues/${leagueId}/generate-teams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al generar equipos.');
      }

      setMessage('Equipos generados exitosamente!');
      router.refresh(); // Refresh the current page to show updated status
    } catch (err: any) {
      setMessage(err.message);
    }
  };

  const handleChallenge = async (opponentTeamId: number) => {
    if (!session || !session.user) {
      setMessage('Debes iniciar sesión para desafiar a otros jugadores.');
      return;
    }

    try {
      const response = await fetch(`/api/battle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          leagueId, 
          opponentTeamId 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al crear la batalla.');
      }

      const battleResult = await response.json();
      
      // Emit challenge event to the opponent
      if (socket) {
        const opponentTeam = league?.teams.find(team => team.id === opponentTeamId);
        if (opponentTeam) {
          socket.emit('challenge', {
            toUserId: opponentTeam.userId,
            from: session.user.email,
            battleId: battleResult.id,
          });
        }
      }

      setMessage('Desafío enviado. Esperando respuesta del oponente.');

    } catch (err: any) {
      setMessage(err.message);
    }
  };

  const handleAcceptChallenge = async () => {
    if (incomingChallenge) {
      try {
        const response = await fetch(`/api/battles/${incomingChallenge.battleId}/accept`, {
          method: 'POST',
        });
        if (!response.ok) {
          throw new Error('Failed to accept challenge');
        }
        const myTeam = league?.teams.find(team => team.userId === parseInt((session?.user as any).id, 10));
        router.push(`/battle/live/${incomingChallenge.battleId}?myTeamId=${myTeam?.id}`);
      } catch (error) {
        console.error(error);
        setMessage('Error al aceptar el desafío.');
      }
    }
  };

  const handleRejectChallenge = async () => {
    if (incomingChallenge) {
      try {
        await fetch(`/api/battles/${incomingChallenge.battleId}/reject`, {
          method: 'POST',
        });
      } catch (error) {
        console.error(error);
      } finally {
        setIncomingChallenge(null);
      }
    }
  };

  if (loading) {
    return <div className="container text-center mt-5"><h1>Cargando detalles de la liga...</h1></div>;
  }

  if (error) {
    return <div className="container text-center mt-5"><h1>Error: {error}</h1></div>;
  }

  if (!league) {
    return <div className="container text-center mt-5"><h1>Liga no encontrada.</h1></div>;
  }

  const isCreator = session && session.user && league.creatorId === parseInt((session.user as any).id, 10);
  const isMember = session && session.user && league.teams.some(team => team.userId === parseInt((session.user as any).id, 10));
  const canGenerateTeams = isCreator && (league.status === 'OPEN' || league.status === 'TEAMS_GENERATED') && league.teams.length >= 2;

  return (
    <div className="container mt-5">
      <h1 className="mb-4">{league.name}</h1>
      <p><strong>Estado:</strong> {league.status}</p>
      <p><strong>Creador:</strong> {league.creator.email}</p>
      <p><strong>Jugadores:</strong> {league.teams.length} / {league.maxPlayers}</p>
      {isMember && league.joinCode && (
        <p><strong>Código de Unión:</strong> {league.joinCode}</p>
      )}

      <Link href={`/leagues/${leagueId}/market`} className="btn btn-info mt-3 mb-4">
        Ir al Mercado
      </Link>

      <h2 className="mt-4">Miembros de la Liga:</h2>
      {league.teams.length > 0 ? (
        <div className="list-group">
          {league.teams.map((team) => (
            <div key={team.id} className="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
              <Link href={`/leagues/${leagueId}/teams/${team.id}`}>
                {team.user.email}
              </Link>
              {session && session.user && parseInt((session.user as any).id, 10) !== team.userId && (
                <button onClick={() => handleChallenge(team.id)} className="btn btn-danger">Combatir</button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p>No hay miembros en esta liga aún.</p>
      )}

      {canGenerateTeams && (
        <button onClick={handleGenerateTeams} className="btn btn-primary mt-4">
          {league.status === 'OPEN' ? 'Generar Pokémon Aleatorios' : 'Regenerar Pokémon de Equipos'}
        </button>
      )}

      {isCreator && (
        <div className="mt-5 p-4 border rounded game-screen">
          <h2 className="mb-3">Gestión del Pool de Pokémon de la Liga</h2>
          <p>Aquí puedes añadir o eliminar Pokémon del pool de la liga.</p>

          <div className="mb-4">
            <h3 className="mt-4">Pokémon en la Liga ({leaguePokemons.length})</h3>
            {leaguePokemons.length > 0 ? (
              <div className="row">
                {leaguePokemons.map(pokemon => (
                  <div key={pokemon.id} className="col-md-2 mb-3 text-center">
                    <img src={`/api/pokemon/sprite/${pokemon.pokemonId}`} alt={pokemon.name} width={50} height={50} />
                    <p>{pokemon.name}</p>
                    <button
                      onClick={() => handleRemovePokemonFromLeague(pokemon.id)}
                      className="btn btn-danger btn-sm"
                    >
                      Quitar
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p>No hay Pokémon en la liga.</p>
            )}
          </div>

          <hr />

          <div className="mt-4">
            <h3 className="mt-4">Pokémon Disponibles para Añadir ({allAvailablePokemons.length})</h3>
            {allAvailablePokemons.length > 0 && (
              <button onClick={handleAddAllPokemonsToLeague} className="btn btn-primary mb-3">
                Añadir Todos
              </button>
            )}
            {allAvailablePokemons.length > 0 ? (
              <div className="row">
                {allAvailablePokemons.map(pokemon => (
                  <div key={pokemon.id} className="col-md-2 mb-3 text-center">
                    <img src={`/api/pokemon/sprite/${pokemon.pokemonId}`} alt={pokemon.name} width={50} height={50} />
                    <p>{pokemon.name}</p>
                    <button
                      onClick={() => handleAddPokemonToLeague(pokemon.id)}
                      className="btn btn-success btn-sm"
                    >
                      Añadir
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p>No hay Pokémon disponibles para añadir.</p>
            )}
          </div>
        </div>
      )}

      {message && <div className="alert alert-info mt-3">{message}</div>}

      {incomingChallenge && (
        <div className="modal" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">¡Te han desafiado!</h5>
              </div>
              <div className="modal-body">
                <p>{incomingChallenge.from} te ha desafiado a una batalla.</p>
              </div>
              <div className="modal-footer">
                <button onClick={handleRejectChallenge} className="btn btn-secondary">Rechazar</button>
                <button onClick={handleAcceptChallenge} className="btn btn-primary">Aceptar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

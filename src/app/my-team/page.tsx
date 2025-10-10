'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Pokeball from '@/components/team/Pokeball';
import PokemonDetailsModal from '@/components/team/PokemonDetailsModal';

// Interfaces
interface Pokemon {
  id: number;
  name: string;
  image: string;
  hp: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
  nickname?: string | null;
}

interface Team {
  id: number;
  pokemons: Pokemon[];
  leagueId: number;
}

interface League {
  id: number;
  name: string;
}

export default function MyTeamPage() {
  const { data: session, status } = useSession();
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<boolean[]>([]);
  const [draggedPokemon, setDraggedPokemon] = useState<Pokemon | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedPokemon, setSelectedPokemon] = useState<Pokemon | null>(null);
  const [userLeagues, setUserLeagues] = useState<League[]>([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState<number | null>(null);

  const fetchTeam = async (leagueIdToFetch: number | null) => {
    if (!leagueIdToFetch) {
      setTeam(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/my-team?leagueId=${leagueIdToFetch}`);
      if (!response.ok) {
        throw new Error('No se pudo cargar tu equipo para esta liga.');
      }
      const data = await response.json();
      setTeam(data);

      const storedRevealed = localStorage.getItem(`revealedPokemons-${data.id}`);
      if (storedRevealed) {
        setRevealed(JSON.parse(storedRevealed));
      } else {
        setRevealed(new Array(data.pokemons.length).fill(false));
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserLeagues = async () => {
    try {
      const response = await fetch('/api/leagues'); // Assuming this endpoint returns leagues the user is a member of
      if (!response.ok) {
        throw new Error('No se pudieron cargar tus ligas.');
      }
      const data = await response.json();
      setUserLeagues(data);
      if (data.length > 0) {
        setSelectedLeagueId(data[0].id);
      }
    } catch (err: any) {
      console.error('Error fetching user leagues:', err);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      fetchUserLeagues();
    }
  }, [status]);

  useEffect(() => {
    if (selectedLeagueId !== null) {
      fetchTeam(selectedLeagueId);
    }
  }, [selectedLeagueId]);

  const handleReveal = (index: number) => {
    const newRevealed = [...revealed];
    newRevealed[index] = true;
    setRevealed(newRevealed);
    localStorage.setItem(`revealedPokemons-${team?.id}`, JSON.stringify(newRevealed));
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, pokemon: Pokemon) => {
    setDraggedPokemon(pokemon);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', pokemon.id.toString());
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, targetPokemon: Pokemon) => {
    e.preventDefault();
    if (!draggedPokemon || !team) return;

    const updatedPokemons = [...team.pokemons];
    const draggedIndex = updatedPokemons.findIndex(p => p.id === draggedPokemon.id);
    const targetIndex = updatedPokemons.findIndex(p => p.id === targetPokemon.id);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const [removed] = updatedPokemons.splice(draggedIndex, 1);
    updatedPokemons.splice(targetIndex, 0, removed);

    setTeam({ ...team, pokemons: updatedPokemons });

    try {
      const response = await fetch('/api/my-team/reorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pokemonIds: updatedPokemons.map(p => p.id) }),
      });

      if (!response.ok) {
        throw new Error('Error al reordenar Pokémon en el servidor.');
      }
    } catch (err: any) {
      console.error('Error reordering Pokémon:', err);
    }
    setDraggedPokemon(null);
  };

  const handleDragEnd = () => {
    setDraggedPokemon(null);
  };

  const handleOpenModal = (pokemon: Pokemon) => {
    setSelectedPokemon(pokemon);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedPokemon(null);
  };

  const handleSaveNickname = async (pokemonId: number, nickname: string) => {
    try {
      const response = await fetch(`/api/pokemon/${pokemonId}/nickname`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nickname }),
      });

      if (!response.ok) {
        throw new Error('Error al guardar el mote.');
      }

      // Refresh team data to show updated nickname
      fetchTeam(selectedLeagueId);
    } catch (err: any) {
      console.error('Error saving nickname:', err);
    }
  };

  if (loading || status === 'loading') {
    return <div className="container text-center mt-5"><h1>Cargando tu equipo...</h1></div>;
  }

  if (status === 'unauthenticated') {
    return <div className="container text-center mt-5"><h1>Debes iniciar sesión para ver tu equipo.</h1></div>;
  }

  if (error) {
    return <div className="container text-center mt-5"><h1>Error: {error}</h1></div>;
  }

  return (
    <div className="container">
      <h1 className="text-center mb-5" style={{ fontFamily: "'Press Start 2P', sans-serif" }}>Mi Equipo Pokémon</h1>

      {userLeagues.length > 0 && (
        <div className="mb-4">
          <label htmlFor="league-select" className="form-label">Seleccionar Liga:</label>
          <select 
            id="league-select" 
            className="form-select"
            value={selectedLeagueId || ''}
            onChange={(e) => setSelectedLeagueId(parseInt(e.target.value, 10))}
          >
            {userLeagues.map(league => (
              <option key={league.id} value={league.id}>{league.name}</option>
            ))}
          </select>
        </div>
      )}

      {!team || team.pokemons.length === 0 ? (
        <div className="container text-center mt-5"><h1>Aún no tienes un equipo asignado o Pokémon en tu equipo para esta liga.</h1></div>
      ) : (
        <div className="row justify-content-center">
          {team.pokemons.map((pokemon, index) => (
            <div 
              key={pokemon.id} 
              className="col-lg-2 col-md-4 col-6 mb-4"
              draggable
              onDragStart={(e) => handleDragStart(e, pokemon)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, pokemon)}
              onDragEnd={handleDragEnd}
            >
              <Pokeball 
                pokemon={pokemon} 
                isRevealed={revealed[index]} 
                onReveal={() => handleReveal(index)} 
                onClickPokemon={() => handleOpenModal(pokemon)} 
              />
            </div>
          ))}
        </div>
      )}

      {showModal && selectedPokemon && (
        <PokemonDetailsModal 
          pokemon={selectedPokemon} 
          onClose={handleCloseModal} 
          onSaveNickname={handleSaveNickname} 
        />
      )}
    </div>
  );
}

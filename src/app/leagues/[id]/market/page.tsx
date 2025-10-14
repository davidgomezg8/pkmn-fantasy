'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

// Basic Pokemon and Team interfaces for type safety
interface Pokemon {
  id: number;
  pokemonId: number;
  name: string;
}

interface Team {
  id: number;
  name: string;
  pokemons: Pokemon[];
}

export default function MarketPage() {
  const params = useParams();
  const leagueId = parseInt(params.id as string);

  const [myTeam, setMyTeam] = useState<Team | null>(null);
  const [freeAgents, setFreeAgents] = useState<Pokemon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // State for the signing modal
  const [showSignModal, setShowSignModal] = useState(false);
  const [selectedFreeAgent, setSelectedFreeAgent] = useState<Pokemon | null>(null);
  const [pokemonToDrop, setPokemonToDrop] = useState<Pokemon | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [teamResponse, freeAgentsResponse] = await Promise.all([
        fetch(`/api/leagues/${leagueId}/team`),
        fetch(`/api/leagues/${leagueId}/market/free-agents`)
      ]);

      if (!teamResponse.ok) {
        throw new Error('No se pudo cargar tu equipo.');
      }
      const teamData = await teamResponse.json();
      setMyTeam(teamData);

      if (!freeAgentsResponse.ok) {
        throw new Error('No se pudieron cargar los agentes libres.');
      }
      const freeAgentsData = await freeAgentsResponse.json();
      setFreeAgents(freeAgentsData);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isNaN(leagueId)) {
      setError('ID de liga inválido.');
      setLoading(false);
      return;
    }
    fetchData();
  }, [leagueId]);

  const handleOpenSignModal = (pokemon: Pokemon) => {
    setSelectedFreeAgent(pokemon);
    setShowSignModal(true);
    setPokemonToDrop(null); // Reset selection
    setMessage(null);
  };

  const handleCloseSignModal = () => {
    setShowSignModal(false);
    setSelectedFreeAgent(null);
    setPokemonToDrop(null);
  };

  const handleConfirmSign = async () => {
    if (!selectedFreeAgent || !pokemonToDrop || !myTeam) {
      setMessage("Por favor, seleccione un Pokémon para dejar.");
      return;
    }

    setMessage("Procesando fichaje...");

    try {
      const response = await fetch(`/api/leagues/${leagueId}/market/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: myTeam.id,
          pokemonToSignId: selectedFreeAgent.id,
          pokemonToDropId: pokemonToDrop.id,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Error al fichar el Pokémon.');
      }

      setMessage("¡Fichaje completado con éxito!");
      handleCloseSignModal();
      fetchData(); // Refresh data
    } catch (err: any) {
      setMessage(err.message);
    }
  };

  if (loading && !myTeam) { // Initial load
    return <div className="container text-center mt-5"><h1>Cargando Mercado...</h1></div>;
  }

  if (error) {
    return <div className="container text-center mt-5"><h1>Error: {error}</h1></div>;
  }

  return (
    <>
      <div className="container mt-5">
        <h1 className="mb-4">Mercado de Fichajes</h1>
        {message && <div className="alert alert-info">{message}</div>}

        {/* My Team Section */}
        <div className="mb-5">
          <h2>Mi Equipo</h2>
          {myTeam && myTeam.pokemons.length > 0 ? (
            <div className="row">
              {myTeam.pokemons.map(pokemon => (
                <div key={pokemon.id} className="col-md-2 mb-3 text-center">
                  <div className="card">
                    <img src={`/api/pokemon/sprite/${pokemon.pokemonId}`} className="card-img-top" alt={pokemon.name} style={{width: '96px', height: '96px', margin: 'auto'}} />
                    <div className="card-body">
                      <h5 className="card-title text-capitalize">{pokemon.name}</h5>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p>No tienes un equipo en esta liga.</p>
          )}
        </div>

        <hr />

        {/* Free Agent Market Section */}
        <div className="mt-5">
          <h2>Agentes Libres</h2>
          {freeAgents.length > 0 ? (
            <div className="row">
              {freeAgents.map(pokemon => (
                <div key={pokemon.id} className="col-md-2 mb-3 text-center">
                  <div className="card">
                    <img src={`/api/pokemon/sprite/${pokemon.pokemonId}`} className="card-img-top" alt={pokemon.name} style={{width: '96px', height: '96px', margin: 'auto'}}/>
                    <div className="card-body">
                      <h5 className="card-title text-capitalize">{pokemon.name}</h5>
                      <button onClick={() => handleOpenSignModal(pokemon)} className="btn btn-primary btn-sm">Fichar</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p>No hay agentes libres disponibles en este momento.</p>
          )}
        </div>
      </div>

      {/* Sign Modal */}
      {showSignModal && selectedFreeAgent && (
        <div className="modal" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Fichar a {selectedFreeAgent.name}</h5>
                <button type="button" className="btn-close" onClick={handleCloseSignModal}></button>
              </div>
              <div className="modal-body">
                <p>Para fichar a {selectedFreeAgent.name}, debes liberar a uno de tus Pokémon. Selecciona a quién quieres dejar libre:</p>
                <div className="row">
                  {myTeam?.pokemons.map(p => (
                    <div key={p.id} className="col-md-3 text-center">
                      <div 
                        className={`card ${pokemonToDrop?.id === p.id ? 'border-primary' : ''}`}
                        onClick={() => setPokemonToDrop(p)}
                        style={{cursor: 'pointer'}}
                      >
                        <img src={`/api/pokemon/sprite/${p.pokemonId}`} className="card-img-top" alt={p.name} style={{width: '96px', height: '96px', margin: 'auto'}} />
                        <div className="card-body">
                          <h6 className="card-title text-capitalize">{p.name}</h6>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseSignModal}>Cancelar</button>
                <button type="button" className="btn btn-primary" onClick={handleConfirmSign} disabled={!pokemonToDrop}>Confirmar Fichaje</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
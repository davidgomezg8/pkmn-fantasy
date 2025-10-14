'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

interface Pokemon {
  id: number;
  pokemonId: number;
  name: string;
}

interface Team {
  id: number;
  userId: number;
  user: {
    email: string;
  };
  pokemons: Pokemon[];
}

export default function TeamPage() {
  const params = useParams();
  const { data: session } = useSession();
  const leagueId = parseInt(params.id as string);
  const teamId = parseInt(params.teamId as string);

  const [viewedTeam, setViewedTeam] = useState<Team | null>(null);
  const [myTeam, setMyTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // State for the offer modal
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [requestedPokemon, setRequestedPokemon] = useState<Pokemon | null>(null);
  const [offeredPokemon, setOfferedPokemon] = useState<Pokemon | null>(null);

  useEffect(() => {
    if (isNaN(teamId) || isNaN(leagueId)) {
      setError('ID de equipo o liga inválido.');
      setLoading(false);
      return;
    }

    const fetchPageData = async () => {
      try {
        const [viewedTeamResponse, myTeamResponse] = await Promise.all([
          fetch(`/api/teams/${teamId}`),
          fetch(`/api/leagues/${leagueId}/team`) // Fetch my team for the current league
        ]);

        if (!viewedTeamResponse.ok) {
          throw new Error('No se pudo cargar el equipo que está viendo.');
        }
        const viewedTeamData = await viewedTeamResponse.json();
        setViewedTeam(viewedTeamData);

        if (myTeamResponse.ok) {
          const myTeamData = await myTeamResponse.json();
          setMyTeam(myTeamData);
        }

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPageData();
  }, [teamId, leagueId]);

  const handleOpenOfferModal = (pokemon: Pokemon) => {
    setRequestedPokemon(pokemon);
    setShowOfferModal(true);
    setOfferedPokemon(null); // Reset selection
    setMessage(null);
  };

  const handleCloseOfferModal = () => {
    setShowOfferModal(false);
    setRequestedPokemon(null);
    setOfferedPokemon(null);
  };

  const handleConfirmOffer = async () => {
    if (!requestedPokemon || !offeredPokemon || !myTeam || !viewedTeam) {
      setMessage("Por favor, seleccione un Pokémon para ofrecer.");
      return;
    }

    setMessage("Enviando oferta...");

    try {
      const response = await fetch(`/api/trades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposingTeamId: myTeam.id,
          targetTeamId: viewedTeam.id,
          offeredPokemonId: offeredPokemon.id,
          requestedPokemonId: requestedPokemon.id,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Error al enviar la oferta.');
      }

      setMessage("¡Oferta enviada con éxito!");
      handleCloseOfferModal();
    } catch (err: any) {
      setMessage(err.message);
    }
  };

  if (loading) {
    return <div className="container text-center mt-5"><h1>Cargando Equipo...</h1></div>;
  }

  if (error) {
    return <div className="container text-center mt-5"><h1>Error: {error}</h1></div>;
  }

  if (!viewedTeam) {
    return <div className="container text-center mt-5"><h1>Equipo no encontrado.</h1></div>;
  }

  // @ts-ignore
  const isMyTeam = session && session.user && parseInt(session.user.id) === viewedTeam.userId;

  return (
    <>
      <div className="container mt-5">
        <Link href={`/leagues/${leagueId}`} className="btn btn-secondary mb-3">Volver a la Liga</Link>
        <h1 className="mb-4">Equipo de {viewedTeam.user.email}</h1>
        {message && <div className="alert alert-info">{message}</div>}
        
        <div className="row">
          {viewedTeam.pokemons.map(pokemon => (
            <div key={pokemon.id} className="col-md-3 mb-4 text-center">
              <div className="card">
                <img src={`/api/pokemon/sprite/${pokemon.pokemonId}`} className="card-img-top" alt={pokemon.name} style={{width: '128px', height: '128px', margin: 'auto'}} />
                <div className="card-body">
                  <h5 className="card-title text-capitalize">{pokemon.name}</h5>
                  {!isMyTeam && myTeam ? (
                    <button onClick={() => handleOpenOfferModal(pokemon)} className="btn btn-success btn-sm">Hacer Oferta</button>
                  ) : !isMyTeam && (
                    <p className="text-muted small fst-italic">Debes tener un equipo en esta liga para hacer una oferta.</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Offer Modal */}
      {showOfferModal && requestedPokemon && (
        <div className="modal" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Hacer Oferta</h5>
                <button type="button" className="btn-close" onClick={handleCloseOfferModal}></button>
              </div>
              <div className="modal-body">
                <p>Ofrecer uno de tus Pokémon a cambio de <strong>{requestedPokemon.name}</strong>.</p>
                <p>Selecciona el Pokémon que quieres ofrecer:</p>
                <div className="row">
                  {myTeam?.pokemons.map(p => (
                    <div key={p.id} className="col-md-3 text-center">
                      <div 
                        className={`card ${offeredPokemon?.id === p.id ? 'border-primary' : ''}`}
                        onClick={() => setOfferedPokemon(p)}
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
                <button type="button" className="btn btn-secondary" onClick={handleCloseOfferModal}>Cancelar</button>
                <button type="button" className="btn btn-primary" onClick={handleConfirmOffer} disabled={!offeredPokemon}>Proponer Intercambio</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
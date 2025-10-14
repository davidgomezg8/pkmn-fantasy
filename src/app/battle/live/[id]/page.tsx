'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import io, { Socket } from 'socket.io-client';
import HealthBar from '@/components/HealthBar';
import { Move } from '@/lib/battle';

export default function LiveBattlePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const battleId = params.id as string;
  const myTeamId = searchParams.get('myTeamId');

  const [socket, setSocket] = useState<Socket | null>(null);
  const [battleState, setBattleState] = useState<any>(null);
  const [menuState, setMenuState] = useState<'main' | 'moves' | 'switch'>('main');

  // Socket connection and event listeners
  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to socket server');
      newSocket.emit('joinBattle', battleId, myTeamId);
    });

    newSocket.on('updateState', (state) => {
      console.log('Received updateState event:', state);
      setBattleState(state);
      // Do not reset menu state here, as it could interfere with forced switches
    });

    newSocket.on('battleError', (message: string) => {
      console.error('Battle Error:', message);
      // Optionally, display the error to the user
    });

    return () => {
      newSocket.disconnect();
    };
  }, [battleId, myTeamId]);

  // Handles automatically switching to the 'switch' menu when a Pokémon faints
  useEffect(() => {
    if (battleState && myTeamId) {
      const myPlayer = battleState.players[parseInt(myTeamId, 10)];
      if (myPlayer && myPlayer.activePokemon.currentHp === 0 && menuState !== 'switch') {
        const hasSwitchablePokemon = myPlayer.team.some((p: any) => p.currentHp > 0);
        if (hasSwitchablePokemon) {
          setMenuState('switch');
        } else {
          console.log("All your Pokémon have fainted! You lose.");
          // Future enhancement: handle end of battle (e.g., show a loss screen)
          }
        }
    }
  }, [battleState, myTeamId, menuState]);


  const handleSelectMove = (move: string) => {
    console.log('Emitting selectMove:', { battleId, move });
    socket?.emit('selectMove', battleId, move);
  };

  const handleFightClick = () => {
    setMenuState('moves');
  };

  const handleSwitchPokemonClick = () => {
    setMenuState('switch');
  };

  const handleSwitchPokemon = (pokemonId: number) => {
    console.log('Emitting switchPokemon:', { battleId, pokemonId });
    socket?.emit('switchPokemon', battleId, pokemonId);
    setMenuState('main'); // Go back to main menu after switching
  };

  if (!battleState || !myTeamId) {
    return <div className="container text-center mt-5"><h1>Loading Battle...</h1></div>;
  }

  const myPlayer = battleState.players[parseInt(myTeamId, 10)];
  const opponentPlayer = Object.values(battleState.players).find((p: any) => p.teamId !== parseInt(myTeamId, 10));

  if (!myPlayer || !opponentPlayer) {
    return <div className="container text-center mt-5"><h1>Waiting for opponent...</h1></div>;
  }

  return (
    <>
      <style>{`
        .fainted {
          transform: translateY(80%) rotate(90deg);
          opacity: 0.4;
          transition: all 0.8s ease-in-out;
        }
      `}</style>
      <div className="container mt-5 battle-container">
        <h1 className="mb-4 text-center">Combate en Vivo</h1>
        <div className="row battle-arena">
          {/* Opponent's side */}
          <div className="col-6 opponent-side">
            <div className="pokemon-display text-center">
              <h2>{opponentPlayer.activePokemon.name}</h2>
              <HealthBar currentHp={opponentPlayer.activePokemon.currentHp} maxHp={opponentPlayer.activePokemon.hp} />
              <img 
                src={opponentPlayer.activePokemon.image} 
                alt={opponentPlayer.activePokemon.name} 
                className={`img-fluid ${opponentPlayer.activePokemon.currentHp === 0 ? 'fainted' : ''}`} 
              />
            </div>
          </div>
          {/* Player's side */}
          <div className="col-6 player-side">
            <div className="pokemon-display text-center">
              <h2>{myPlayer.activePokemon.name}</h2>
              <HealthBar currentHp={myPlayer.activePokemon.currentHp} maxHp={myPlayer.activePokemon.hp} />
              <img 
                src={myPlayer.activePokemon.image} 
                alt={myPlayer.activePokemon.name} 
                className={`img-fluid ${myPlayer.activePokemon.currentHp === 0 ? 'fainted' : ''}`} 
              />
            </div>
          </div>
        </div>

        <div className="row battle-controls mt-4">
          <div className="col-12 text-center">
            {myPlayer && battleState.turn === myPlayer.teamId ? (
              <div className="d-flex justify-content-center gap-3 flex-wrap">
                {menuState === 'main' && myPlayer.activePokemon.currentHp > 0 && (
                  <>
                    <button onClick={handleFightClick} className="btn btn-primary btn-lg">Luchar</button>
                    <button onClick={handleSwitchPokemonClick} className="btn btn-info btn-lg">Pokémon</button>
                  </>
                )}
                {menuState === 'moves' && (
                  <>
                    {myPlayer.activePokemon.moves.map((move: Move) => (
                      <button key={move.name} onClick={() => handleSelectMove(move.name)} className="btn btn-primary btn-lg">
                        {move.name}
                      </button>
                    ))}
                    <button onClick={() => setMenuState('main')} className="btn btn-secondary btn-lg">Atrás</button>
                  </>
                )}
                {menuState === 'switch' && (
                  <>
                    {myPlayer.team.map((pokemon: any) => (
                      <button 
                        key={pokemon.id} 
                        onClick={() => handleSwitchPokemon(pokemon.id)}
                        className="btn btn-warning btn-lg"
                        disabled={pokemon.id === myPlayer.activePokemon.id || pokemon.currentHp === 0}
                      >
                        {pokemon.name} (HP: {pokemon.currentHp} / {pokemon.hp})
                      </button>
                    ))}
                    {/* Do not show back button if a pokemon fainted and player is forced to switch*/}
                    {myPlayer.activePokemon.currentHp > 0 && 
                      <button onClick={() => setMenuState('main')} className="btn btn-secondary btn-lg">Atrás</button>
                    }
                  </>
                )}
              </div>
            ) : (
              <p>Esperando al oponente...</p>
            )}
          </div>
        </div>

        <div className="row battle-log mt-4">
          <div className="col-12">
            <h2>Log de Combate</h2>
            <ul className="list-group">
              {battleState.log.slice(0).reverse().map((line: string, index: number) => (
                <li key={index} className="list-group-item">{line}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
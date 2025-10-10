'use client';

import React, { useState, useEffect } from 'react';

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

interface PokemonDetailsModalProps {
  pokemon: Pokemon;
  onClose: () => void;
  onSaveNickname: (pokemonId: number, nickname: string) => void;
}

export default function PokemonDetailsModal({ pokemon, onClose, onSaveNickname }: PokemonDetailsModalProps) {
  const [currentNickname, setCurrentNickname] = useState(pokemon.nickname || '');

  useEffect(() => {
    setCurrentNickname(pokemon.nickname || '');
  }, [pokemon]);

  const handleSave = () => {
    onSaveNickname(pokemon.id, currentNickname);
    onClose();
  };

  return (
    <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content game-screen">
          <div className="modal-header">
            <h5 className="modal-title" style={{ fontFamily: "'Press Start 2P', sans-serif" }}>
              {pokemon.name.toUpperCase()} {pokemon.nickname ? `(${pokemon.nickname})` : ''}
            </h5>
            <button type="button" className="btn-close" aria-label="Close" onClick={onClose}></button>
          </div>
          <div className="modal-body text-center">
            <img src={pokemon.image} alt={pokemon.name} width={150} height={150} className="mb-3" />
            <div className="text-start mb-3">
              <p><strong>HP:</strong> {pokemon.hp}</p>
              <p><strong>Ataque:</strong> {pokemon.attack}</p>
              <p><strong>Defensa:</strong> {pokemon.defense}</p>
              <p><strong>At. Esp.:</strong> {pokemon.specialAttack}</p>
              <p><strong>Def. Esp.:</strong> {pokemon.specialDefense}</p>
              <p><strong>Velocidad:</strong> {pokemon.speed}</p>
            </div>
            <div className="mb-3">
              <label htmlFor="nicknameInput" className="form-label">Mote:</label>
              <input
                type="text"
                className="form-control"
                id="nicknameInput"
                value={currentNickname}
                onChange={(e) => setCurrentNickname(e.target.value)}
                maxLength={12} // Typical Pokémon nickname length limit
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cerrar</button>
            <button type="button" className="btn btn-primary" onClick={handleSave}>Guardar Mote</button>
          </div>
        </div>
      </div>
    </div>
  );
}

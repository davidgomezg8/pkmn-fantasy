import React from 'react';
// import Image from 'next/image'; // Removed next/image import
import './Pokeball.css'; // We will create this CSS file next

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

interface PokeballProps {
  pokemon: Pokemon | null;
  isRevealed: boolean;
  onReveal: () => void;
  onClickPokemon: (pokemon: Pokemon) => void; // New prop
}

export default function Pokeball({ pokemon, isRevealed, onReveal, onClickPokemon }: PokeballProps) {
  const handleReveal = () => {
    if (!isRevealed) {
      onReveal();
    }
  };

  if (pokemon) {
    console.log('Pokemon image URL:', pokemon.image);
  }

  return (
    <div className={`pokeball-container ${isRevealed ? 'revealed' : ''}`} onClick={handleReveal}>
      <div className="pokeball">
        {!isRevealed ? (
          <img src="/pokeball.svg" alt="Pokeball" width={150} height={150} />
        ) : pokemon ? (
          <div className="pokemon-card" onClick={(e) => { e.stopPropagation(); onClickPokemon(pokemon); }}>
            <img src={pokemon.image} alt={pokemon.name} width={100} height={100} className="pokemon-image" />
            <h5 className="pokemon-name">{pokemon.name}</h5>
            <div className="pokemon-stats">
              <p>HP: {pokemon.hp}</p>
              <p>Ataque: {pokemon.attack}</p>
              <p>Defensa: {pokemon.defense}</p>
              <p>At. Esp.: {pokemon.specialAttack}</p>
              <p>Def. Esp.: {pokemon.specialDefense}</p>
              <p>Velocidad: {pokemon.speed}</p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

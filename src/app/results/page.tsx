'use client';

import { useState } from 'react';
import { Pokemon } from '@/lib/battle';

interface BattleResult {
  trainerA: string;
  trainerB: string;
  winner: 'teamA' | 'teamB' | 'draw';
  powerA: number;
  powerB: number;
  teamA: Pokemon[];
  teamB: Pokemon[];
}

export default function ResultsPage() {
  const [result, setResult] = useState<BattleResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSimulate = async () => {
    setIsLoading(true);
    setResult(null);
    try {
      const response = await fetch('/api/battle', { method: 'POST' });
      if (!response.ok) {
        throw new Error('La simulación ha fallado.');
      }
      const data = await response.json();
      setResult(data);
    } catch (error) {
      alert(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container text-center">
      <h1 className="mb-4">Resultados del Combate</h1>
      <button onClick={handleSimulate} disabled={isLoading} className="btn btn-primary btn-lg mb-5" style={{ backgroundColor: '#ffcb05', borderColor: '#3b4cca', color: '#3b4cca' }}>
        {isLoading ? 'Simulando...' : 'Simular Combate de la Semana'}
      </button>

      {result && (
        <div className="game-screen">
          <h2 className="display-5 mb-4">
            Ganador: {result.winner === 'draw' ? 'Empate' : (result.winner === 'teamA' ? result.trainerA : result.trainerB)}
          </h2>
          <div className="row">
            {/* Equipo A */}
            <div className="col-md-5">
              <h3>{result.trainerA} (Poder: {result.powerA})</h3>
              <ul className="list-group">
                {result.teamA.map(p => (
                  <li key={p.id} className="list-group-item d-flex justify-content-between align-items-center">
                    <span className="text-capitalize">{p.name}</span>
                    <img src={p.image} alt={p.name} />
                  </li>
                ))}
              </ul>
            </div>

            <div className="col-md-2 d-flex align-items-center justify-content-center">
              <h2 className="display-1">VS</h2>
            </div>

            {/* Equipo B */}
            <div className="col-md-5">
              <h3>{result.trainerB} (Poder: {result.powerB})</h3>
              <ul className="list-group">
                {result.teamB.map(p => (
                  <li key={p.id} className="list-group-item d-flex justify-content-between align-items-center">
                    <span className="text-capitalize">{p.name}</span>
                    <img src={p.image} alt={p.name} />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

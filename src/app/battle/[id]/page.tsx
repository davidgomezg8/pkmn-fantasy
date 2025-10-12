
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Pokemon } from '@/lib/battle'; // Assuming Pokemon type is defined here

interface BattleResult {
  id: number;
  leagueId: number;
  trainerAId: number;
  trainerBId: number;
  winnerId: number | null;
  trainerA: { id: number; name: string; team: Pokemon[] };
  trainerB: { id: number; name: string; team: Pokemon[] };
  powerA: number;
  powerB: number;
  createdAt: string;
}

export default function BattleResultPage() {
  const params = useParams();
  const battleId = parseInt(params.id as string);
  const [result, setResult] = useState<BattleResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isNaN(battleId)) {
      setError('ID de batalla inválido.');
      setLoading(false);
      return;
    }

    const fetchBattleResult = async () => {
      try {
        const response = await fetch(`/api/battle/${battleId}`);
        if (!response.ok) {
          throw new Error('No se pudo cargar el resultado de la batalla.');
        }
        const data = await response.json();
        setResult(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBattleResult();
  }, [battleId]);

  if (loading) {
    return <div className="container text-center mt-5"><h1>Cargando resultado...</h1></div>;
  }

  if (error) {
    return <div className="container text-center mt-5"><h1>Error: {error}</h1></div>;
  }

  if (!result) {
    return <div className="container text-center mt-5"><h1>Resultado de batalla no encontrado.</h1></div>;
  }

  const winner = result.winnerId === result.trainerAId 
    ? result.trainerA.name 
    : result.winnerId === result.trainerBId 
    ? result.trainerB.name 
    : 'Empate';

  return (
    <div className="container text-center">
      <h1 className="mb-4">Resultado del Combate</h1>
      <div className="game-screen">
        <h2 className="display-5 mb-4">
          Ganador: {winner}
        </h2>
        <div className="row">
          {/* Equipo A */}
          <div className="col-md-5">
            <h3>{result.trainerA.name} (Poder: {result.powerA})</h3>
            <ul className="list-group">
              {result.trainerA.team.map(p => (
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
            <h3>{result.trainerB.name} (Poder: {result.powerB})</h3>
            <ul className="list-group">
              {result.trainerB.team.map(p => (
                <li key={p.id} className="list-group-item d-flex justify-content-between align-items-center">
                  <span className="text-capitalize">{p.name}</span>
                  <img src={p.image} alt={p.name} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

// Define a detailed Trade interface
interface Trade {
    id: number;
    status: string;
    proposingTeam: { id: number; user: { id: number; email: string } };
    targetTeam: { id: number; user: { id: number; email: string } };
    offeredPokemon: { id: number; name: string; };
    requestedPokemon: { id: number; name: string; };
}

export default function TradesPage() {
    const { data: session } = useSession();
    const [trades, setTrades] = useState<Trade[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const fetchTrades = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/trades');
            if (!response.ok) {
                throw new Error('No se pudieron cargar los intercambios.');
            }
            const data = await response.json();
            setTrades(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (session) {
            fetchTrades();
        }
    }, [session]);

    const handleAccept = async (tradeId: number) => {
        setMessage('Aceptando intercambio...');
        try {
            const res = await fetch(`/api/trades/${tradeId}/accept`, { method: 'POST' });
            if (!res.ok) throw new Error('Error al aceptar.');
            setMessage('¡Intercambio aceptado!');
            fetchTrades(); // Refresh
        } catch (err: any) {
            setMessage(err.message);
        }
    };

    const handleReject = async (tradeId: number) => {
        setMessage('Rechazando intercambio...');
        try {
            const res = await fetch(`/api/trades/${tradeId}/reject`, { method: 'POST' });
            if (!res.ok) throw new Error('Error al rechazar.');
            setMessage('Intercambio rechazado.');
            fetchTrades(); // Refresh
        } catch (err: any) {
            setMessage(err.message);
        }
    };

    if (loading) {
        return <div className="container text-center mt-5"><h1>Cargando Intercambios...</h1></div>;
    }

    if (error) {
        return <div className="container text-center mt-5"><h1>Error: {error}</h1></div>;
    }

    // @ts-ignore
    const myUserId = session?.user?.id ? parseInt(session.user.id) : null;
    const incomingTrades = trades.filter(t => t.targetTeam.user.id === myUserId);
    const outgoingTrades = trades.filter(t => t.proposingTeam.user.id === myUserId);

    return (
        <div className="container mt-5">
            <h1 className="mb-4">Mis Intercambios</h1>
            {message && <div className="alert alert-info">{message}</div>}

            <div className="row">
                <div className="col-md-6">
                    <h2>Ofertas Recibidas</h2>
                    {incomingTrades.length > 0 ? (
                        <ul className="list-group">
                            {incomingTrades.map(trade => (
                                <li key={trade.id} className="list-group-item">
                                    <p><strong>De:</strong> {trade.proposingTeam.user.email}</p>
                                    <p><strong>Ofrece:</strong> {trade.offeredPokemon.name}</p>
                                    <p><strong>Pide:</strong> {trade.requestedPokemon.name}</p>
                                    <p><strong>Estado:</strong> {trade.status}</p>
                                    {trade.status === 'PENDING' && (
                                        <div>
                                            <button onClick={() => handleAccept(trade.id)} className="btn btn-success me-2">Aceptar</button>
                                            <button onClick={() => handleReject(trade.id)} className="btn btn-danger">Rechazar</button>
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    ) : <p>No has recibido ninguna oferta.</p>}
                </div>
                <div className="col-md-6">
                    <h2>Ofertas Enviadas</h2>
                    {outgoingTrades.length > 0 ? (
                         <ul className="list-group">
                            {outgoingTrades.map(trade => (
                                <li key={trade.id} className="list-group-item">
                                    <p><strong>Para:</strong> {trade.targetTeam.user.email}</p>
                                    <p><strong>Ofreces:</strong> {trade.offeredPokemon.name}</p>
                                    <p><strong>Pides:</strong> {trade.requestedPokemon.name}</p>
                                    <p><strong>Estado:</strong> {trade.status}</p>
                                </li>
                            ))}
                        </ul>
                    ) : <p>No has enviado ninguna oferta.</p>}
                </div>
            </div>
        </div>
    );
}

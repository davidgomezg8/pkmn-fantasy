"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import io, { Socket } from "socket.io-client";

export default function Navbar() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [incomingChallenge, setIncomingChallenge] = useState<{
    from: string;
    battleId: number;
  } | null>(null);

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      const newSocket = io();
      setSocket(newSocket);

      newSocket.on("connect", () => {
        console.log("Connected to socket server from Navbar");
        newSocket.emit("registerUser", parseInt((session.user as any).id, 10));
      });

      newSocket.on("challenge", ({ from, battleId }) => {
        console.log("Received challenge event in Navbar:", { from, battleId });
        setIncomingChallenge({ from, battleId });
      });

      newSocket.on("battleAccepted", ({ battleId, myTeamId }) => {
        console.log("Received battleAccepted event in Navbar:", {
          battleId,
          myTeamId,
        });
        setIncomingChallenge(null); // Clear any incoming challenge
        router.push(`/battle/live/${battleId}?myTeamId=${myTeamId}`);
      });

      newSocket.on("battleRejected", () => {
        setIncomingChallenge(null); // Clear any incoming challenge
        // Optionally, show a toast or a small message
      });

      return () => {
        newSocket.disconnect();
      };
    }
  }, [status, session, router]);

  const handleAcceptChallenge = async () => {
    if (incomingChallenge) {
      try {
        const response = await fetch(
          `/api/battles/${incomingChallenge.battleId}/accept`,
          {
            method: "POST",
          }
        );
        if (!response.ok) {
          throw new Error("Failed to accept challenge");
        }
        // The server will emit 'battleAccepted', and the listener above will handle the redirect.
        setIncomingChallenge(null);
      } catch (error) {
        console.error(error);
        // Handle error, maybe show a message
      }
    }
  };

  const handleRejectChallenge = async () => {
    if (incomingChallenge) {
      try {
        await fetch(`/api/battles/${incomingChallenge.battleId}/reject`, {
          method: "POST",
        });
      } catch (error) {
        console.error(error);
      } finally {
        setIncomingChallenge(null);
      }
    }
  };

  return (
    <>
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark mb-4">
        <div className="container">
          <Link
            href="/"
            className="navbar-brand"
            style={{
              fontFamily: "'Press Start 2P', sans-serif",
              color: "#ffcb05",
            }}
          >
            PKMN-FANTASY
          </Link>
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarNav"
            aria-controls="navbarNav"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav ms-auto">
              {status === "authenticated" ? (
                <>
                  <li className="nav-item">
                    <Link href="/leagues" className="nav-link">
                      Ligas
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link href="/create-league" className="nav-link">
                      Crear Liga
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link href="/trades" className="nav-link">
                      Mis Intercambios
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link href="/results" className="nav-link">
                      Resultados
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link href="/my-team" className="nav-link">
                      Mi Equipo
                    </Link>
                  </li>
                  <li className="nav-item">
                    <button
                      onClick={() => signOut()}
                      className="btn btn-link nav-link"
                    >
                      Logout
                    </button>
                  </li>
                </>
              ) : (
                <>
                  <li className="nav-item">
                    <Link href="/login" className="nav-link">
                      Login
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link href="/register" className="nav-link">
                      Registro
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>
      </nav>

      {incomingChallenge && (
        <div
          className="modal"
          style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">¡Te han desafiado!</h5>
              </div>
              <div className="modal-body">
                <p>{incomingChallenge.from} te ha desafiado a una batalla.</p>
              </div>
              <div className="modal-footer">
                <button
                  onClick={handleRejectChallenge}
                  className="btn btn-secondary"
                >
                  Rechazar
                </button>
                <button
                  onClick={handleAcceptChallenge}
                  className="btn btn-primary"
                >
                  Aceptar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


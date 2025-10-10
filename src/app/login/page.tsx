'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const result = await signIn('credentials', {
      redirect: false,
      email,
      password,
    });

    if (result?.error) {
      setError('Invalid credentials. Please try again.');
    } else {
      router.push('/leagues');
    }
  };

  return (
    <div className="container">
      <div className="game-screen text-center" style={{ maxWidth: '600px', margin: 'auto' }}>
        <h1 className="mb-4">Iniciar Sesión</h1>
        <form onSubmit={handleSubmit}>
          <div className="form-floating mb-3">
            <input
              type="email"
              className="form-control"
              id="emailInput"
              placeholder="nombre@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <label htmlFor="emailInput">Correo Electrónico</label>
          </div>
          <div className="form-floating mb-3">
            <input
              type="password"
              className="form-control"
              id="passwordInput"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <label htmlFor="passwordInput">Contraseña</label>
          </div>
          <button type="submit" className="btn btn-primary btn-lg" style={{ backgroundColor: '#ffcb05', borderColor: '#3b4cca', color: '#3b4cca' }}>
            Entrar
          </button>
        </form>
        {error && <p className="mt-3 text-danger">{error}</p>}
      </div>
    </div>
  );
}
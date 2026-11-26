'use client';
import { FormEvent, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
type User = { firstName: string; lastName: string; email: string };

export default function Home() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [user, setUser] = useState<User | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage(''); setBusy(true);
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    try {
      const response = await fetch(`${API}/auth/${mode}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Não foi possível concluir a solicitação.');
      if (mode === 'login') setUser(data.user);
      setMessage(data.message);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Erro de conexão com a API.'); }
    finally { setBusy(false); }
  }

  async function logout() {
    await fetch(`${API}/auth/logout`, { method: 'POST', credentials: 'include' }); setUser(null); setMessage('Sessão encerrada.');
  }

  if (user) return <main className="shell"><section className="card"><span className="eyebrow">ÁREA RESTRITA</span><h1>Olá, {user.firstName}!</h1><p>Sessão autenticada para <strong>{user.email}</strong>.</p><button className="primary" onClick={logout}>Sair</button></section></main>;

  return <main className="shell"><section className="card"><span className="eyebrow">ELIABETECH · CONTA SEGURA</span><h1>{mode === 'login' ? 'Acesse sua conta' : 'Crie sua conta'}</h1><p className="sub">{mode === 'login' ? 'Entre para continuar.' : 'Preencha seus dados para começar.'}</p>
    <form onSubmit={submit}>
      {mode === 'register' && <><label>Nome<input name="firstName" autoComplete="given-name" required maxLength={80}/></label><label>Sobrenome<input name="lastName" autoComplete="family-name" required maxLength={120}/></label><label>Telefone<input name="phone" autoComplete="tel" required maxLength={24}/></label></>}
      <label>Email<input name="email" type="email" autoComplete="email" required maxLength={254}/></label>
      <label>Senha<input name="password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={8} maxLength={72} required/></label>
      <button className="primary" disabled={busy}>{busy ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Cadastrar'}</button>
    </form>
    {message && <p className="message" role="status">{message}</p>}
    <button className="switch" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setMessage(''); }}>{mode === 'login' ? 'Ainda não tem conta? Cadastre-se' : 'Já tem conta? Entre'}</button>
  </section></main>;
}

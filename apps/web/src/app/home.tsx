'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
type User = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
};
type Mode = 'login' | 'register' | 'forgot' | 'reset';
type TwoFactorSetup = { qrCodeDataUrl: string; manualKey: string };

async function request(path: string, method = 'GET', body?: Record<string, string>) {
  const response = await fetch(`${API}/auth/${path}`, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Não foi possível concluir a solicitação.');
  return data;
}

export default function Home() {
  const search = useSearchParams();
  const [mode, setMode] = useState<Mode>('login');
  const [user, setUser] = useState<User | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [mfaLogin, setMfaLogin] = useState(false);
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null);
  const [setupCode, setSetupCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [resetToken, setResetToken] = useState('');

  useEffect(() => {
    const token = search.get('token') || '';
    if (window.location.pathname === '/verify') {
      if (!token) { setError('O link de confirmação está incompleto ou inválido.'); return; }
      request('verify-email', 'POST', { token }).then((data) => {
        setMessage(data.message);
        setMode('login');
      }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Não foi possível confirmar o email.'));
      return;
    }
    if (window.location.pathname === '/reset-password') {
      setResetToken(token);
      setMode('reset');
    }
    request('me').then((data) => setUser(data.user)).catch(() => undefined);
  }, [search]);

  function changeMode(next: Mode) {
    setMode(next);
    setMfaLogin(false);
    setMessage('');
    setError('');
    setResetToken('');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(''); setError(''); setBusy(true);
    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) || '');
    try {
      if (mfaLogin) {
        const data = await request('login/2fa', 'POST', { code: value('code') });
        setUser(data.user); setMfaLogin(false); setMessage(data.message);
      } else if (mode === 'register') {
        if (value('password') !== value('confirmPassword')) throw new Error('As senhas não coincidem.');
        const data = await request('register', 'POST', {
          firstName: value('firstName'), lastName: value('lastName'), phone: value('phone'),
          email: value('email'), password: value('password'),
        });
        setMessage(data.message); setMode('login');
      } else if (mode === 'forgot') {
        const data = await request('forgot-password', 'POST', { email: value('email') }); setMessage(data.message);
      } else if (mode === 'reset') {
        const token = resetToken || value('token');
        if (value('password') !== value('confirmPassword')) throw new Error('As senhas não coincidem.');
        const data = await request('reset-password', 'POST', { token, password: value('password') });
        setMessage(data.message); setMode('login'); setResetToken('');
      } else {
        const data = await request('login', 'POST', { email: value('email'), password: value('password') });
        if (data.requiresTwoFactor) setMfaLogin(true);
        else setUser(data.user);
        setMessage(data.message);
      }
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Erro de conexão com a API.'); }
    finally { setBusy(false); }
  }

  async function refreshProfile() {
    const data = await request('me'); setUser(data.user);
  }
  async function beginTwoFactorSetup() {
    setBusy(true); setError(''); setMessage('');
    try { setSetup(await request('2fa/setup', 'POST')); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível iniciar a configuração.'); }
    finally { setBusy(false); }
  }
  async function enableTwoFactor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    try { const data = await request('2fa/enable', 'POST', { code: setupCode }); setMessage(data.message); setSetup(null); setSetupCode(''); await refreshProfile(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível ativar o 2FA.'); }
    finally { setBusy(false); }
  }
  async function disableTwoFactor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    try { const data = await request('2fa/disable', 'POST', { code: disableCode }); setMessage(data.message); setDisableCode(''); await refreshProfile(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível desativar o 2FA.'); }
    finally { setBusy(false); }
  }
  async function logout() {
    setBusy(true);
    try { const data = await request('logout', 'POST'); setUser(null); setSetup(null); setMessage(data.message); changeMode('login'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível encerrar a sessão.'); }
    finally { setBusy(false); }
  }

  if (user) return <main className="shell"><section className="card dashboard">
    <span className="eyebrow">ÁREA RESTRITA</span><h1>Olá, {user.firstName}</h1>
    <p className="sub">Gerencie seus dados e a segurança da conta.</p>
    <div className="profile"><p><strong>Nome:</strong> {user.firstName} {user.lastName}</p><p><strong>Telefone:</strong> {user.phone}</p><p><strong>Email:</strong> {user.email} {user.emailVerified ? '· Confirmado' : ''}</p></div>
    <section className="profile"><h2>Autenticação em duas etapas (2FA)</h2><p>{user.twoFactorEnabled ? 'Ativa: um código do aplicativo será exigido ao entrar.' : 'Opcional: proteja sua conta com um aplicativo autenticador.'}</p>
      {setup && <><img className="qr" src={setup.qrCodeDataUrl} alt="QR code para configurar o autenticador"/><p>Chave manual: <code>{setup.manualKey}</code></p><form onSubmit={enableTwoFactor}><label>Código do aplicativo para ativar<input name="code" value={setupCode} onChange={(event) => setSetupCode(event.target.value)} inputMode="numeric" autoComplete="one-time-code" minLength={6} maxLength={8} required /></label><button className="primary" disabled={busy}>Ativar 2FA</button></form></>}
      {!user.twoFactorEnabled && !setup && <button className="primary" onClick={beginTwoFactorSetup} disabled={busy}>Configurar 2FA</button>}
      {user.twoFactorEnabled && <form onSubmit={disableTwoFactor}><label>Para desativar, confirme com seu código atual<input value={disableCode} onChange={(event) => setDisableCode(event.target.value)} inputMode="numeric" autoComplete="one-time-code" minLength={6} maxLength={8} required /></label><button className="secondary" disabled={busy}>Desativar 2FA</button></form>}
    </section>
    {message && <p className="message" role="status">{message}</p>}{error && <p className="error" role="alert">{error}</p>}
    <button className="primary" onClick={logout} disabled={busy}>Sair</button>
  </section></main>;

  const title = mfaLogin ? 'Verificação em duas etapas' : mode === 'register' ? 'Crie sua conta' : mode === 'forgot' ? 'Recuperar senha' : mode === 'reset' ? 'Redefinir senha' : 'Acesse sua conta';
  return <main className="shell"><section className="card">
    <span className="eyebrow">ELIABETECH · CONTA SEGURA</span><h1>{title}</h1>
    <p className="sub">{mfaLogin ? 'Digite o código atual do seu aplicativo autenticador.' : mode === 'register' ? 'Preencha seus dados. Enviaremos um link para confirmar seu email.' : 'Entre para continuar.'}</p>
    <form onSubmit={submit}>
      {mode === 'register' && !mfaLogin && <><label>Nome<input name="firstName" autoComplete="given-name" maxLength={80} required /></label><label>Sobrenome<input name="lastName" autoComplete="family-name" maxLength={120} required /></label><label>Telefone<input name="phone" type="tel" autoComplete="tel" maxLength={24} required /></label></>}
      {!mfaLogin && mode !== 'reset' && <label>Email<input name="email" type="email" autoComplete="email" maxLength={254} required /></label>}
      {!mfaLogin && (mode === 'login' || mode === 'register') && <><label>Senha<input name="password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={8} maxLength={72} required /></label>{mode === 'register' && <label>Confirme a senha<input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} maxLength={72} required /></label>}</>}
      {mode === 'forgot' && null}
      {mode === 'reset' && <>{!resetToken && <label>Token de redefinição<input name="token" minLength={64} maxLength={64} required /></label>}<label>Nova senha<input name="password" type="password" autoComplete="new-password" minLength={8} maxLength={72} required /></label><label>Confirme a nova senha<input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} maxLength={72} required /></label></>}
      {mfaLogin && <label>Código do autenticador<input name="code" inputMode="numeric" autoComplete="one-time-code" minLength={6} maxLength={8} required /></label>}
      <button className="primary" disabled={busy}>{busy ? 'Aguarde…' : mfaLogin ? 'Verificar e entrar' : mode === 'register' ? 'Criar conta' : mode === 'forgot' ? 'Enviar instruções' : mode === 'reset' ? 'Salvar nova senha' : 'Entrar'}</button>
    </form>
    {message && <p className="message" role="status">{message}</p>}{error && <p className="error" role="alert">{error}</p>}
    {!mfaLogin && <nav className="links">{mode === 'login' && <button type="button" onClick={() => changeMode('forgot')}>Esqueci minha senha</button>}<button type="button" onClick={() => changeMode(mode === 'register' ? 'login' : 'register')}>{mode === 'register' ? 'Já tem conta? Entre' : 'Criar conta'}</button></nav>}
    {mfaLogin && <button className="switch" onClick={() => { setMfaLogin(false); setMessage(''); setError(''); }}>Voltar ao login</button>}
  </section></main>;
}

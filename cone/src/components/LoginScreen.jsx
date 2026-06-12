import { useState } from 'react';
import { supabase } from '../utils/supabase';

export default function LoginScreen() {
  const [email, setEmail]   = useState('');
  const [sent, setSent]     = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  const handleSubmit = async e => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.href },
    });
    setLoading(false);
    if (err) setError(err.message);
    else setSent(true);
  };

  return (
    <div className="login-wrap">
      <div className="login-box">
        <div className="login-logo">
          <i className="ti ti-bolt" style={{ fontSize: 36, color: 'var(--accent)' }} aria-hidden="true" />
        </div>
        <h1 className="login-title">Cone</h1>
        <p className="login-sub">Gestão de treinos CrossFit</p>

        {sent ? (
          <div className="login-sent">
            <i className="ti ti-mail-check" style={{ fontSize: 32, color: 'var(--green)' }} aria-hidden="true" />
            <p>Link enviado para</p>
            <strong>{email}</strong>
            <p className="login-sent-hint">Verifique sua caixa de entrada e clique no link para entrar.</p>
            <button className="login-resend" onClick={() => setSent(false)}>
              Usar outro e-mail
            </button>
          </div>
        ) : (
          <form className="login-form" onSubmit={handleSubmit}>
            <label className="login-label" htmlFor="login-email">E-mail</label>
            <input
              id="login-email"
              className="login-input"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoFocus
              autoComplete="email"
              required
            />
            {error && (
              <p className="login-error">
                <i className="ti ti-alert-circle" aria-hidden="true" /> {error}
              </p>
            )}
            <button className="login-btn" type="submit" disabled={loading}>
              {loading
                ? <><i className="ti ti-loader-2 spin" aria-hidden="true" /> Enviando...</>
                : <><i className="ti ti-send" aria-hidden="true" /> Enviar link mágico</>}
            </button>
            <p className="login-hint">
              Sem senha — você receberá um link por e-mail para entrar.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

import { useState, useRef } from 'react';
import { supabase } from '../utils/supabase';

export default function LoginScreen() {
  const [email, setEmail]     = useState('');
  const [sent, setSent]       = useState(false);
  const [code, setCode]       = useState(['', '', '', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError]     = useState('');
  const inputs = useRef([]);

  const handleSend = async e => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
    });
    setLoading(false);
    if (err) setError(err.message);
    else { setSent(true); setCode(['', '', '', '', '', '']); }
  };

  const handleCodeInput = (i, val) => {
    const v = val.replace(/\D/g, '').slice(0, 1);
    const next = [...code];
    next[i] = v;
    setCode(next);
    if (v && i < 7) inputs.current[i + 1]?.focus();
    // Auto-submit when all 8 digits filled
    if (v && i === 7 && next.every(d => d !== '')) {
      verifyCode(next.join(''));
    }
  };

  const handleCodeKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !code[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  };

  const handleCodePaste = e => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 8);
    if (pasted.length === 8) {
      const next = pasted.split('');
      setCode(next);
      inputs.current[7]?.focus();
      verifyCode(pasted);
    }
    e.preventDefault();
  };

  const verifyCode = async token => {
    setVerifying(true);
    setError('');
    const { error: err } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token,
      type: 'email',
    });
    setVerifying(false);
    if (err) {
      setError('Código inválido ou expirado. Tente solicitar um novo.');
      setCode(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
    }
    // On success, App.jsx auth listener will detect the session and unmount LoginScreen
  };

  const handleVerifySubmit = async e => {
    e.preventDefault();
    const token = code.join('');
    if (token.length < 8) return;
    verifyCode(token);
  };

  return (
    <div className="login-wrap">
      <div className="login-box">
        <div className="login-logo">
          <i className="ti ti-bolt" style={{ fontSize: 36, color: 'var(--accent)' }} aria-hidden="true" />
        </div>
        <h1 className="login-title">Cone</h1>
        <p className="login-sub">Gestão de treinos CrossFit</p>

        {!sent ? (
          <form className="login-form" onSubmit={handleSend}>
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
                : <><i className="ti ti-send" aria-hidden="true" /> Enviar código</>}
            </button>
            <p className="login-hint">
              Sem senha — você receberá um código de 8 dígitos por e-mail.
            </p>
          </form>
        ) : (
          <form className="login-form" onSubmit={handleVerifySubmit}>
            <div className="login-sent-mini">
              <i className="ti ti-mail-check" style={{ fontSize: 24, color: 'var(--green)' }} aria-hidden="true" />
              <span>Código enviado para <strong>{email}</strong></span>
            </div>
            <label className="login-label" style={{ textAlign: 'center', marginBottom: '10px' }}>
              Digite o código de 8 dígitos
            </label>
            <div className="login-otp-row" onPaste={handleCodePaste}>
              {code.map((digit, i) => (
                <input
                  key={i}
                  ref={el => inputs.current[i] = el}
                  className="login-otp-input"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={digit}
                  autoFocus={i === 0}
                  onChange={e => handleCodeInput(i, e.target.value)}
                  onKeyDown={e => handleCodeKeyDown(i, e)}
                />
              ))}
            </div>
            {error && (
              <p className="login-error">
                <i className="ti ti-alert-circle" aria-hidden="true" /> {error}
              </p>
            )}
            <button className="login-btn" type="submit" disabled={verifying || code.join('').length < 6}>
              {verifying
                ? <><i className="ti ti-loader-2 spin" aria-hidden="true" /> Verificando...</>
                : <><i className="ti ti-check" aria-hidden="true" /> Entrar</>}
            </button>
            <button
              type="button"
              className="login-resend"
              onClick={() => { setSent(false); setError(''); }}
              disabled={verifying}
            >
              Usar outro e-mail / reenviar
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

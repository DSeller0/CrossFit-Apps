import { useState, useEffect } from 'react';
import { loadAthletes, loadLocations, saveLocations, loadCoach, saveCoach, uid } from '../../utils/storage';
import { useIsMobile } from '../../hooks/useIsMobile';

// ── CurrencyInput — formats centavos to R$ display ───────────────────────────
function CurrencyInput({ value, onChange, placeholder, style }) {
  const toCentavos = v => Math.round((parseFloat(v) || 0) * 100);
  const [centavos, setCentavos] = useState(() => toCentavos(value));

  useEffect(() => {
    const incoming = toCentavos(value);
    if (incoming !== centavos) setCentavos(incoming);
  }, [value]);

  const display = centavos === 0 ? '' :
    'R$ ' + (centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handleChange = e => {
    const digits = e.target.value.replace(/\D/g, '');
    const next = digits === '' ? 0 : parseInt(digits.slice(-8), 10);
    setCentavos(next);
    onChange(next / 100);
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      value={display}
      placeholder={placeholder || 'R$ 0,00'}
      onChange={handleChange}
      style={style}
    />
  );
}

// ── Location form modal (shared between mobile + desktop) ─────────────────────
function LocFormModal({ editId, form, setF, onSave, onClose }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div
        style={{ background: '#0d0d0d', border: '1px solid #2e2e2e', borderRadius: 10, padding: 18, width: 340, maxWidth: '92vw' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#ccc' }}>{editId ? 'Editar local' : 'Novo local'}</span>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>

        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 11, color: '#555', display: 'block', marginBottom: 3 }}>Nome</label>
          <input value={form.name} onChange={e => setF('name', e.target.value)} placeholder="ex: Box 01"
            style={{ width: '100%', background: '#111', border: '1px solid #2e2e2e', color: '#ccc', padding: '7px 9px', borderRadius: 5, fontSize: 13 }} />
        </div>

        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 11, color: '#555', display: 'block', marginBottom: 3 }}>Tipo</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {['box', 'personal'].map(t => (
              <button key={t} type="button" onClick={() => setF('type', t)}
                style={{ flex: 1, padding: 6, borderRadius: 5, border: `1px solid ${form.type === t ? 'var(--theme-accent)' : '#2e2e2e'}`, background: form.type === t ? 'rgba(74,200,192,.1)' : 'transparent', color: form.type === t ? 'var(--theme-accent)' : '#555', cursor: 'pointer', fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>
                {t === 'box' ? 'Aula / Box' : 'Personal'}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <div style={{ flex: '0 0 54px' }}>
            <label style={{ fontSize: 11, color: '#555', display: 'block', marginBottom: 3 }}>Moeda</label>
            <input value={form.currency} onChange={e => setF('currency', e.target.value)}
              style={{ width: '100%', background: '#111', border: '1px solid #2e2e2e', color: '#ccc', padding: '7px 6px', borderRadius: 5, fontSize: 13 }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, color: '#555', display: 'block', marginBottom: 3 }}>Taxa</label>
            <CurrencyInput value={form.rate || 0} onChange={v => setF('rate', v)}
              style={{ width: '100%', background: '#111', border: '1px solid #2e2e2e', color: '#ccc', padding: '7px 9px', borderRadius: 5, fontSize: 13 }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, color: '#555', display: 'block', marginBottom: 3 }}>Por</label>
            <select value={form.rateUnit} onChange={e => setF('rateUnit', e.target.value)}
              style={{ width: '100%', background: '#111', border: '1px solid #2e2e2e', color: '#ccc', padding: '7px 6px', borderRadius: 5, fontSize: 12 }}>
              <option value="per_session">Sessão</option>
              <option value="per_hour">Hora</option>
            </select>
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, color: '#555', display: 'block', marginBottom: 5 }}>Cor</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{ width: 26, height: 26, borderRadius: '50%', background: form.color, cursor: 'pointer', border: '2px solid #2e2e2e', flexShrink: 0 }}
              onClick={() => document.getElementById('loc-color-picker')?.click()}
            />
            <input type="color" id="loc-color-picker" value={form.color} onChange={e => setF('color', e.target.value)}
              style={{ opacity: 0, position: 'absolute', pointerEvents: 'none' }} />
            <input type="text" value={form.color}
              onChange={e => { if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) setF('color', e.target.value); }}
              style={{ flex: 1, background: '#111', border: '1px solid #2e2e2e', color: '#ccc', padding: '7px 9px', borderRadius: 5, fontSize: 13 }} />
          </div>
        </div>

        <button onClick={onSave}
          style={{ width: '100%', background: 'var(--theme-accent)', color: 'var(--theme-accent-text)', border: 'none', padding: 9, borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
          {editId ? 'Salvar alterações' : 'Adicionar local'}
        </button>
      </div>
    </div>
  );
}

// ── Delete confirmation modal ─────────────────────────────────────────────────
function ConfirmDeleteModal({ locName, onConfirm, onCancel }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#0d0d0d', border: '1px solid #3a1010', borderRadius: 10, padding: 20, width: 300, textAlign: 'center' }}>
        <i className="ti ti-alert-triangle" style={{ fontSize: 28, color: '#e05050', display: 'block', marginBottom: 10 }} />
        <div style={{ fontSize: 14, color: '#ccc', fontWeight: 700, marginBottom: 6 }}>Remover "{locName}"?</div>
        <div style={{ fontSize: 12, color: '#555', marginBottom: 16 }}>Eventos vinculados perdem a referência ao local.</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onConfirm} style={{ flex: 1, background: '#3a1010', border: '1px solid #6a2020', color: '#e05050', padding: 8, borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>Remover</button>
          <button onClick={onCancel} style={{ flex: 1, background: 'transparent', border: '1px solid #2e2e2e', color: '#888', padding: 8, borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

// ── Coach profile form (shared between mobile + desktop) ──────────────────────
function CoachProfileForm({ coach, setCoach, compact }) {
  const inp = compact
    ? { width: '100%', background: '#0d0d0d', border: '1px solid #1e1e1e', color: '#ccc', padding: '6px 8px', borderRadius: 4, fontSize: 12, marginBottom: 4 }
    : { width: '100%', background: '#111', border: '1px solid #1e1e1e', color: '#ccc', padding: '5px 7px', borderRadius: 4, fontSize: 12, marginBottom: 4 };

  return (
    <div style={{ padding: 12, borderBottom: '1px solid #1e1e1e' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--theme-accent)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>Perfil do Coach</div>
      {['name', 'contact', 'phone'].map(k => (
        <input key={k} value={coach[k] || ''} onChange={e => setCoach(p => ({ ...p, [k]: e.target.value }))}
          placeholder={k === 'name' ? 'Nome do coach' : k === 'contact' ? 'E-mail' : 'Telefone'}
          style={inp} />
      ))}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <button type="button" onClick={() => setCoach(p => ({ ...p, pixEnabled: !p.pixEnabled }))}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: compact ? '4px 10px' : '3px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 700, border: `1px solid ${coach.pixEnabled ? 'rgba(74,200,192,.4)' : '#2e2e2e'}`, background: coach.pixEnabled ? 'rgba(74,200,192,.1)' : 'transparent', color: coach.pixEnabled ? 'var(--theme-accent)' : '#555', flex: compact ? 1 : undefined }}>
          <i className={`ti ti-${coach.pixEnabled ? 'toggle-right' : 'toggle-left'}`} style={{ fontSize: 14 }} />
          {coach.pixEnabled ? 'Pix Ativado' : 'Pix Desativado'}
        </button>
      </div>
      {coach.pixEnabled && (
        <input value={coach.pixKey || ''} onChange={e => setCoach(p => ({ ...p, pixKey: e.target.value }))}
          placeholder="Chave Pix (e-mail, CPF, telefone…)"
          style={{ ...inp, color: '#4ac8c0' }} />
      )}
      <input value={coach.cidade || ''} onChange={e => setCoach(p => ({ ...p, cidade: e.target.value }))}
        placeholder="Cidade (para QR Pix)" style={inp} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
        <span style={{ fontSize: 10, color: '#554a3a', whiteSpace: 'nowrap' }}>Cap teste Pix:</span>
        <CurrencyInput value={coach.pixTestCap || 0} onChange={v => setCoach(p => ({ ...p, pixTestCap: v || null }))}
          placeholder="Sem limite"
          style={{ flex: 1, background: compact ? '#0d0d0d' : '#111', border: '1px solid #1e1e1e', color: '#d8a840', padding: compact ? '6px 8px' : '5px 7px', borderRadius: 4, fontSize: 12 }} />
        {!compact && (
          <span title="Valor máximo gerado no QR Pix durante testes. 0 = sem limite." style={{ fontSize: 11, color: '#333', cursor: 'help' }}>
            <i className="ti ti-info-circle" />
          </span>
        )}
      </div>
    </div>
  );
}

// ── Athlete assignment list ───────────────────────────────────────────────────
function AthleteAssignment({ loc, athletes, onToggle }) {
  if (loc.type === 'box') {
    return (
      <div style={{ fontSize: 12, color: '#555', fontStyle: 'italic', padding: 12, background: '#111', borderRadius: 6, border: '1px solid #1e1e1e' }}>
        <i className="ti ti-info-circle" style={{ marginRight: 6, color: '#888' }} />
        Locais do tipo Box são para aulas em grupo. Atletas são registrados via resultado de cada aula.
      </div>
    );
  }
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--theme-accent)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>Atletas vinculados</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {athletes.map(a => {
          const checked = (loc.athleteIds || []).includes(a.id);
          return (
            <label key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 6, cursor: 'pointer', background: checked ? 'rgba(74,200,192,.06)' : 'transparent', border: `1px solid ${checked ? 'rgba(74,200,192,.2)' : '#1e1e1e'}` }}>
              <input type="checkbox" checked={checked} onChange={() => onToggle(loc.id, a.id)}
                style={{ accentColor: a.color || 'var(--theme-accent)', width: 14, height: 14 }} />
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: a.color || '#555', flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: '#ccc', flex: 1 }}>{a.name}</span>
              <span style={{ fontSize: 11, color: '#555' }}>{a.level || ''}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Serviços tab ─────────────────────────────────────────────────────────
export default function ServicosTab() {
  const [locs, setLocs]         = useState(loadLocations);
  const [coach, setCoach]       = useState(loadCoach);
  const [selLoc, setSelLoc]     = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId]     = useState(null);
  const [form, setForm]         = useState({ name: '', type: 'box', color: '#4ac8c0', rate: '', rateUnit: 'per_session', currency: 'R$' });
  const [confirmDel, setConfirmDel] = useState(null);
  const [expandedLoc, setExpandedLoc] = useState(null);

  const athletes = loadAthletes();
  const isMobile = useIsMobile();

  useEffect(() => { saveLocations(locs); }, [locs]);
  useEffect(() => { saveCoach(coach); }, [coach]);

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const openNew = () => {
    setEditId(null);
    setForm({ name: '', type: 'box', color: '#4ac8c0', rate: '', rateUnit: 'per_session', currency: 'R$' });
    setShowForm(true);
  };

  const startEdit = loc => {
    setForm({ name: loc.name, type: loc.type, color: loc.color || '#4ac8c0', rate: String(loc.rate || ''), rateUnit: loc.rateUnit || 'per_session', currency: loc.currency || 'R$' });
    setEditId(loc.id);
    setShowForm(true);
  };

  const saveLoc = () => {
    if (!form.name.trim()) return;
    if (editId) {
      setLocs(ls => ls.map(l => l.id === editId ? { ...l, ...form, rate: Number(form.rate) || 0 } : l));
    } else {
      setLocs(ls => [...ls, { ...form, id: uid(), rate: Number(form.rate) || 0, athleteIds: [] }]);
    }
    setShowForm(false);
    setEditId(null);
    setForm({ name: '', type: 'box', color: '#4ac8c0', rate: '', rateUnit: 'per_session', currency: 'R$' });
  };

  const deleteLoc = id => {
    setLocs(ls => ls.filter(l => l.id !== id));
    if (selLoc === id) setSelLoc(null);
    setConfirmDel(null);
  };

  const toggleAthlete = (locId, athId) => {
    setLocs(ls => ls.map(l => {
      if (l.id !== locId) return l;
      const ids = l.athleteIds || [];
      return { ...l, athleteIds: ids.includes(athId) ? ids.filter(x => x !== athId) : [...ids, athId] };
    }));
  };

  const sel = locs.find(l => l.id === selLoc) || null;
  const confirmLocName = locs.find(l => l.id === confirmDel)?.name || '';

  const rateLabel = l => l.rate
    ? `${l.currency || 'R$'} ${l.rate}/${l.rateUnit === 'per_hour' ? 'hora' : 'sessão'}`
    : 'Sem taxa configurada';

  // ── Mobile layout ─────────────────────────────────────────────────────────
  if (isMobile) return (
    <div style={{ padding: 10, paddingBottom: 70 }}>
      {confirmDel && <ConfirmDeleteModal locName={confirmLocName} onConfirm={() => deleteLoc(confirmDel)} onCancel={() => setConfirmDel(null)} />}
      {showForm && <LocFormModal editId={editId} form={form} setF={setF} onSave={saveLoc} onClose={() => { setShowForm(false); setEditId(null); }} />}

      <CoachProfileForm coach={coach} setCoach={setCoach} compact />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '12px 0 8px' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '.07em' }}>Serviços</span>
        <button type="button" onClick={openNew}
          style={{ background: 'var(--theme-accent)', color: 'var(--theme-accent-text)', border: 'none', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}>
          <i className="ti ti-plus" /> Novo
        </button>
      </div>

      {locs.length === 0
        ? <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: '#333' }}>Nenhum local cadastrado.</div>
        : locs.map(l => {
          const isExp = expandedLoc === l.id;
          return (
            <div key={l.id} style={{ marginBottom: 4, borderRadius: 7, overflow: 'hidden', border: `1px solid ${isExp ? l.color + '55' : '#1e1e1e'}`, borderLeft: `3px solid ${l.color || '#555'}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 10px', background: isExp ? '#161616' : '#111', cursor: 'pointer' }}
                onClick={() => setExpandedLoc(isExp ? null : l.id)}>
                <div style={{ width: 9, height: 9, borderRadius: '50%', background: l.color || '#555', flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: isExp ? '#fff' : '#bbb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.name}</span>
                <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 4px', borderRadius: 3, textTransform: 'uppercase', background: l.type === 'box' ? 'rgba(74,200,192,.1)' : 'rgba(216,168,64,.1)', color: l.type === 'box' ? 'var(--theme-accent)' : '#d8a840', marginRight: 2 }}>
                  {l.type === 'box' ? 'Box' : 'Personal'}
                </span>
                <button type="button" onClick={e => { e.stopPropagation(); startEdit(l); }} style={{ background: 'transparent', border: '1px solid #2e2e2e', color: '#555', padding: '2px 5px', borderRadius: 3, cursor: 'pointer' }}>
                  <i className="ti ti-edit" style={{ fontSize: 11 }} />
                </button>
                <button type="button" onClick={e => { e.stopPropagation(); setConfirmDel(l.id); }} style={{ background: 'transparent', border: '1px solid #2e2e2e', color: '#5a1a1a', padding: '2px 5px', borderRadius: 3, cursor: 'pointer' }}>
                  <i className="ti ti-trash" style={{ fontSize: 11 }} />
                </button>
                <i className={`ti ti-chevron-${isExp ? 'down' : 'right'}`} style={{ color: '#444', fontSize: 13, flexShrink: 0 }} />
              </div>
              {isExp && (
                <div style={{ padding: 10, background: '#0d0d0d', borderTop: '1px solid #1e1e1e' }}>
                  <div style={{ fontSize: 11, color: '#555', marginBottom: 8 }}>{rateLabel(l)}</div>
                  <AthleteAssignment loc={l} athletes={athletes} onToggle={toggleAthlete} />
                </div>
              )}
            </div>
          );
        })
      }
    </div>
  );

  // ── Desktop layout ────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', gap: 0, height: '100%', minHeight: 500 }}>
      {confirmDel && <ConfirmDeleteModal locName={confirmLocName} onConfirm={() => deleteLoc(confirmDel)} onCancel={() => setConfirmDel(null)} />}
      {showForm && <LocFormModal editId={editId} form={form} setF={setF} onSave={saveLoc} onClose={() => { setShowForm(false); setEditId(null); }} />}

      {/* Left pane */}
      <div style={{ width: 260, flexShrink: 0, borderRight: '1px solid #1e1e1e', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <CoachProfileForm coach={coach} setCoach={setCoach} compact={false} />

        <div style={{ padding: '10px 12px', borderBottom: '1px solid #1e1e1e', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--theme-accent)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Locais</div>
          <button type="button" onClick={openNew}
            style={{ background: 'var(--theme-accent)', color: 'var(--theme-accent-text)', border: 'none', padding: '3px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}>
            <i className="ti ti-plus" /> Novo
          </button>
        </div>

        {locs.length === 0
          ? <div style={{ padding: 16, fontSize: 12, color: '#333', textAlign: 'center' }}>Nenhum local cadastrado.</div>
          : locs.map(l => (
            <div key={l.id}
              onClick={() => setSelLoc(selLoc === l.id ? null : l.id)}
              style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #1e1e1e', background: selLoc === l.id ? 'rgba(74,200,192,.06)' : 'transparent', borderLeft: `3px solid ${l.color || '#555'}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#ccc' }}>{l.name}</span>
                <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 4px', borderRadius: 3, textTransform: 'uppercase', background: l.type === 'box' ? 'rgba(74,200,192,.1)' : 'rgba(216,168,64,.1)', color: l.type === 'box' ? 'var(--theme-accent)' : '#d8a840' }}>
                  {l.type === 'box' ? 'Box' : 'Personal'}
                </span>
                <button type="button" onClick={e => { e.stopPropagation(); startEdit(l); }} style={{ background: 'transparent', border: '1px solid #2e2e2e', color: '#555', padding: '2px 5px', borderRadius: 3, cursor: 'pointer' }}>
                  <i className="ti ti-edit" style={{ fontSize: 11 }} />
                </button>
                <button type="button" onClick={e => { e.stopPropagation(); setConfirmDel(l.id); }} style={{ background: 'transparent', border: '1px solid #2e2e2e', color: '#5a1a1a', padding: '2px 5px', borderRadius: 3, cursor: 'pointer' }}>
                  <i className="ti ti-trash" style={{ fontSize: 11 }} />
                </button>
              </div>
              <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{rateLabel(l)}</div>
            </div>
          ))
        }
      </div>

      {/* Right pane */}
      <div style={{ flex: 1, padding: 16, overflowY: 'auto' }}>
        {!sel
          ? <div style={{ color: '#333', fontSize: 13, padding: 20, textAlign: 'center' }}>Selecione um local para configurar atletas.</div>
          : (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#ccc', marginBottom: 4 }}>{sel.name}</div>
              <div style={{ fontSize: 11, color: '#555', marginBottom: 16 }}>
                {sel.type === 'box' ? 'Aula / Box' : 'Personal'} · {rateLabel(sel)}
              </div>
              <AthleteAssignment loc={sel} athletes={athletes} onToggle={toggleAthlete} />
            </div>
          )
        }
      </div>
    </div>
  );
}

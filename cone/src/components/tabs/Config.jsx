import { useState } from 'react';
import { loadSettings, saveSettings } from '../../utils/storage';

const THEMES = [
  { id: 'totk-dark',              label: 'TotK Dark'              },
  { id: 'totk-light',             label: 'TotK Light'             },
  { id: 'spirit-blossom',         label: 'Spirit Blossom Dark'    },
  { id: 'spirit-blossom-light',   label: 'Spirit Blossom Light'   },
];

function getTheme() {
  return localStorage.getItem('cone_theme') || 'totk-dark';
}

function applyTheme(id) {
  const root = document.documentElement;
  THEMES.forEach(t => root.classList.remove('theme-' + t.id));
  root.classList.add('theme-' + id);
  localStorage.setItem('cone_theme', id);
}

export default function ConfigTab() {
  const init = loadSettings();
  const [gymName, setGymName]   = useState(init.gymName || '');
  const [gymSub,  setGymSub]   = useState(init.gymSub  || '');
  const [label,   setLabel]     = useState(init.label   || '');
  const [logo,    setLogo]      = useState(init.logo    || '');
  const [flash,   setFlash]     = useState(false);
  const [theme,   setTheme]     = useState(getTheme);

  const save = () => {
    saveSettings({ ...loadSettings(), gymName: gymName.trim(), gymSub: gymSub.trim(), label: label.trim(), logo: logo.trim() });
    setFlash(true);
    setTimeout(() => setFlash(false), 2000);
  };

  return (
    <div className="cfg-wrap">

      <div className="cfg-section">
        <div className="cfg-section-title">
          <i className="ti ti-building-community" /> Academia
        </div>

        <label className="cfg-field">
          <span className="cfg-label">Nome da academia</span>
          <input
            className="cfg-input"
            value={gymName}
            onChange={e => setGymName(e.target.value)}
            placeholder="Ex: Team Medrado"
          />
          <span className="cfg-hint">Aparece no hub público e no leaderboard.</span>
        </label>

        <label className="cfg-field">
          <span className="cfg-label">Modalidade</span>
          <input
            className="cfg-input"
            value={gymSub}
            onChange={e => setGymSub(e.target.value)}
            placeholder="Ex: Cross Training"
          />
          <span className="cfg-hint">Subtítulo exibido na página inicial (padrão: Cross Training).</span>
        </label>

        <label className="cfg-field">
          <span className="cfg-label">Subtítulo / label</span>
          <input
            className="cfg-input"
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="Ex: Box Zona Sul"
          />
          <span className="cfg-hint">Linha secundária usada nos relatórios exportados.</span>
        </label>

        <label className="cfg-field">
          <span className="cfg-label">URL do logo</span>
          <input
            className="cfg-input"
            value={logo}
            onChange={e => setLogo(e.target.value)}
            placeholder="https://..."
          />
          <span className="cfg-hint">Imagem exibida na agenda e nos exports PDF.</span>
        </label>

        {logo && (
          <div className="cfg-logo-preview">
            <img
              src={logo}
              alt="Preview do logo"
              onError={e => { e.currentTarget.style.display = 'none'; }}
            />
          </div>
        )}
      </div>

      <div className="cfg-section">
        <div className="cfg-section-title">
          <i className="ti ti-palette" /> Tema
        </div>
        <div className="cfg-theme-grid">
          {THEMES.map(t => (
            <button
              key={t.id}
              className={'cfg-theme-btn' + (theme === t.id ? ' active' : '')}
              onClick={() => { applyTheme(t.id); setTheme(t.id); }}
            >
              <span className={'cfg-theme-swatch theme-' + t.id} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="cfg-save-row">
        <button className="b bp" onClick={save} style={{ minWidth: 120 }}>
          {flash
            ? <><i className="ti ti-check" /> Salvo</>
            : <><i className="ti ti-device-floppy" /> Salvar</>
          }
        </button>
        {flash && (
          <span className="cfg-flash">
            Configurações salvas e sincronizadas.
          </span>
        )}
      </div>

    </div>
  );
}

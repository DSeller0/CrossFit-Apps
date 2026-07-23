import { useState } from 'react';
import { loadSettings, saveSettings } from '../../utils/storage';
import Button from '../ui/Button';
import Input from '../ui/Input';
import s from './Config.module.css';

const THEMES = [
  { id: 'totk-dark',              label: 'TotK Dark',           swatch: 'swatchTotkDark'  },
  { id: 'totk-light',             label: 'TotK Light',          swatch: 'swatchTotkLight' },
  { id: 'spirit-blossom',         label: 'Spirit Blossom Dark', swatch: 'swatchSbDark'    },
  { id: 'spirit-blossom-light',   label: 'Spirit Blossom Light',swatch: 'swatchSbLight'   },
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
  const [gymSub,  setGymSub]    = useState(init.gymSub  || '');
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
    <div className={s.wrap}>

      <div className={s.section}>
        <div className={s.sectionTitle}>
          <i className="ti ti-building-community" /> Academia
        </div>

        <Input
          label="Nome da academia"
          value={gymName}
          onChange={e => setGymName(e.target.value)}
          placeholder="Ex: Team Medrado"
          hint="Aparece no hub público e no leaderboard."
        />

        <Input
          label="Modalidade"
          value={gymSub}
          onChange={e => setGymSub(e.target.value)}
          placeholder="Ex: Cross Training"
          hint="Subtítulo exibido na página inicial (padrão: Cross Training)."
        />

        <Input
          label="Subtítulo / label"
          value={label}
          onChange={e => setLabel(e.target.value)}
          placeholder="Ex: Box Zona Sul"
          hint="Linha secundária usada nos relatórios exportados."
        />

        <Input
          label="URL do logo"
          value={logo}
          onChange={e => setLogo(e.target.value)}
          placeholder="https://..."
          hint="Imagem exibida na agenda e nos exports PDF."
        />

        {logo && (
          <div className={s.logoPreview}>
            <img
              src={logo}
              alt="Preview do logo"
              onError={e => { e.currentTarget.style.display = 'none'; }}
            />
          </div>
        )}
      </div>

      <div className={s.section}>
        <div className={s.sectionTitle}>
          <i className="ti ti-palette" /> Tema
        </div>
        <div className={s.themeGrid}>
          {THEMES.map(t => (
            <button
              key={t.id}
              type="button"
              className={`${s.themeBtn}${theme === t.id ? ' ' + s.active : ''}`}
              aria-pressed={theme === t.id}
              onClick={() => { applyTheme(t.id); setTheme(t.id); }}
            >
              <span className={`${s.swatch} ${s[t.swatch]}`} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className={s.saveRow}>
        <Button variant="primary" onClick={save} style={{ minWidth: 120 }}>
          {flash
            ? <><i className="ti ti-check" /> Salvo</>
            : <><i className="ti ti-device-floppy" /> Salvar</>
          }
        </Button>
        {flash && (
          <span className={s.flash}>
            Configurações salvas e sincronizadas.
          </span>
        )}
      </div>

    </div>
  );
}

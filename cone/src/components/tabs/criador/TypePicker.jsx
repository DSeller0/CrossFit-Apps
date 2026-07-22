import { useState } from 'react';
import { APP_CONFIG } from '../../../utils/config';
import { loadSettings } from '../../../utils/storage';
import { BENCHMARK_GIRLS, BENCHMARK_HEROES, buildBenchmarkBlock } from '../../../public/lib/benchmarks.js';
import { TYPE_CONFIG, getTypeCfg } from './blockModel.js';
import Button from '../../ui/Button.jsx';

// ── CriadorTypePicker (SPA block-type/benchmark chooser — distinct from the public Timer's BlockTypePicker.jsx) ──
export function CriadorTypePicker({ blockNames, onSelect, onClose }) {
  const [level, setLevel] = useState(0);        // 0=type grid, 1=bm category, 2=bm list
  const [bmCategory, setBmCategory] = useState(null);

  const known = Object.keys(TYPE_CONFIG);
  const extra = (blockNames || APP_CONFIG.blockNames || []).filter(n => n !== '-' && !known.includes(n));
  const types = [...known, ...extra];

  const handleTypeClick = type => {
    if (type === 'Benchmark') { setLevel(1); return; }
    onSelect(type);
  };

  const handleCategoryClick = cat => { setBmCategory(cat); setLevel(2); };

  const handleBmSelect = bm => {
    onSelect(buildBenchmarkBlock(bm, bmCategory, bmCategory !== 'custom'));
  };

  const benchmarks = bmCategory === 'girls' ? BENCHMARK_GIRLS
    : bmCategory === 'heroes' ? BENCHMARK_HEROES
    : (loadSettings().customBenchmarks || []);

  const title = level === 0 ? 'Qual tipo de bloco?'
    : level === 1 ? 'Escolha o Benchmark'
    : (bmCategory === 'girls' ? 'Girls' : bmCategory === 'heroes' ? 'Heroes' : 'Custom');

  const goBack = () => level === 2 ? setLevel(1) : setLevel(0);

  return (
    <div className="btp-backdrop" onClick={onClose}>
      <div className="btp-modal" onClick={e => e.stopPropagation()}>
        <div className="btp-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {level > 0 && (
              <Button size="xs" iconOnly aria-label="Voltar" onClick={goBack}>
                <i className="ti ti-arrow-left" />
              </Button>
            )}
            <span>{title}</span>
          </div>
          <Button size="xs" iconOnly variant="ghost" aria-label="Fechar" onClick={onClose}><i className="ti ti-x" /></Button>
        </div>

        {level === 0 && (
          <div className="btp-grid">
            {types.map(type => {
              const cfg = getTypeCfg(type);
              return (
                <button key={type} type="button" className="btp-card" onClick={() => handleTypeClick(type)}
                  style={{ '--btp-color': cfg.color }}>
                  <i className={`ti ${cfg.icon} btp-icon`} />
                  <span className="btp-name">{type}</span>
                  <span className="btp-desc">{cfg.desc}</span>
                </button>
              );
            })}
          </div>
        )}

        {level === 1 && (
          <div className="btp-grid">
            {/* Benchmark-category colours are DATA colours — the same three the
                block-family palette uses (Benchmark gold, Força blue, SC violet).
                They identify a category, so they stay literals like blkColor. */}
            {[
              { key:'girls',  label:'Girls',  icon:'ti-trophy',   color:'#d8a840', desc:'Fran, Grace, Helen, Annie...' },
              { key:'heroes', label:'Heroes', icon:'ti-shield',   color:'#5090e0', desc:'Murph, DT, JT, Nate...'       },
              { key:'custom', label:'Custom', icon:'ti-bookmark', color:'#9070d8', desc:'Benchmarks salvos'             },
            ].map(cat => (
              <button key={cat.key} type="button" className="btp-card" onClick={() => handleCategoryClick(cat.key)}
                style={{ '--btp-color': cat.color }}>
                <i className={`ti ${cat.icon} btp-icon`} />
                <span className="btp-name">{cat.label}</span>
                <span className="btp-desc">{cat.desc}</span>
              </button>
            ))}
          </div>
        )}

        {level === 2 && (
          <div className="bm-list">
            {benchmarks.length === 0 ? (
              <div className="bm-list-empty">
                <i className="ti ti-bookmark-off" />
                <span>Nenhum benchmark salvo.</span>
                <span>Monte um bloco e clique em "Salvar como Benchmark".</span>
              </div>
            ) : benchmarks.map((bm, i) => (
              <button key={i} type="button" className="bm-list-item" onClick={() => handleBmSelect(bm)}>
                <div className="bm-list-top">
                  <span className="bm-list-name">{bm.name}</span>
                  <span className="bm-list-type">{bm.type}</span>
                  {bm.duration && <span className="bm-list-cap">{bm.duration}'</span>}
                </div>
                {bm.desc && <div className="bm-list-desc">{bm.desc}</div>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

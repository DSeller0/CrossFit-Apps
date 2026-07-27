import { IconRuler2, IconSwitchHorizontal } from '@tabler/icons-react'
import { MONTH_PT_SHORT } from '../lib/week.js'
import { initials } from './meHelpers.js'
import styles from './Me.module.css'

// The athlete's identity block: ornament rule, ATLETA badge, avatar, name/level/since,
// and the month's hearts (one per planned session, filled as they're completed).
//
// The body-metrics entry point used to BE the avatar — an unlabelled <div onClick>
// with nothing but `cursor:pointer` to suggest it did anything (#52). It's now an
// explicit, named button next to the name.
export default function HeroCard({ athlete, pd, onOpenBody, onSwitch }) {
  return (
    <div className={styles.heroSection}>
      <div className={styles.hdrRule} aria-hidden="true">
        <div className={styles.hdrLine} />
        <div className={styles.hdrDiamond} />
        <div className={`${styles.hdrLine} ${styles.hdrLineR}`} />
      </div>

      <div className={styles.heroBadge}>
        <span className={styles.heroBadgeInner}>Atleta</span>
      </div>

      <div className={styles.heroRow}>
        <div
          className={`${styles.av} ${styles.avLg}`}
          style={{
            background: `linear-gradient(145deg,${pd.color}22,${pd.color}08)`,
            borderColor: pd.color,
          }}
          aria-hidden="true"
        >
          <span style={{ color: pd.color }}>{initials(athlete.name)}</span>
        </div>
        <div className={styles.heroInfo}>
          <h1 className={styles.pname}>{athlete.name}</h1>
          {athlete.level && (
            <div className={styles.ptier} style={{ color: pd.color }}>
              {athlete.level}
            </div>
          )}
          {pd.sinceStr && (
            <div className={styles.psub}>
              desde {pd.sinceStr} · {pd.days} dias
            </div>
          )}
        </div>
        <div className={styles.heroActions}>
          <button className={styles.heroBtn} onClick={onOpenBody}>
            <IconRuler2 size={14} aria-hidden="true" />
            <span>Corpo</span>
          </button>
          {/* The athlete is remembered now (#52), so the picker no longer shows on
              every visit — this is the way back to it. Desktop also has the rail. */}
          <button className={`${styles.heroBtn} ${styles.heroBtnSwitch}`} onClick={onSwitch}>
            <IconSwitchHorizontal size={14} aria-hidden="true" />
            <span>Trocar</span>
          </button>
        </div>
      </div>

      <div className={styles.hearts}>
        {pd.hearts.map((h, i) => (
          <span
            key={i}
            className={`${styles.h} ${h === 'full' ? styles.hf : h === 'today' ? styles.ht : styles.he}`}
            aria-hidden="true"
          >
            {h === 'empty' ? '♡' : '♥'}
          </span>
        ))}
      </div>
      <div className={styles.heartsSub}>
        {pd.thisMon} de {pd.heartTotal} sessões · {MONTH_PT_SHORT[pd.nowM - 1]} {pd.nowY}
      </div>

      <div className={styles.heroDivider} aria-hidden="true">
        <div className={styles.heroDivLine} />
        <div className={styles.heroDivDiamond} />
        <div className={`${styles.heroDivLine} ${styles.heroDivLineR}`} />
      </div>
    </div>
  )
}

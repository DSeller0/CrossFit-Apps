// ── SparkLine ─────────────────────────────────────────────────────────────────
export function SparkLine({ values }) {
  if (!values||!values.length) return null;
  const max = Math.max(...values, 10);
  return (
    <div className="sparkline">
      {values.map((v,i) => (
        <div key={i} className="sparkline-bar"
          style={{height:`${Math.round(v/max*100)}%`,background:v>=8?'#e05050':v>=6?'#e0a030':'#60a840',flex:1}} />
      ))}
    </div>
  );
}

// ── KpiCard ───────────────────────────────────────────────────────────────────
export function KpiCard({ label, value, sub, colorClass, children }) {
  return (
    <div className="kpi-card">
      <div className="kpi-label">{label}</div>
      <div className={`kpi-value ${colorClass||''}`}>{value??'—'}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
      {children}
    </div>
  );
}

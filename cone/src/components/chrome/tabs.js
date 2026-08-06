// The SPA's tab roster — split out of App.jsx (#95/plans/69) so AppChrome.jsx can
// export only the component (react-refresh/only-export-components would otherwise
// need a 6th allowExportNames carve-out in eslint.config.js).
//
// `short` exists only for tabs whose full label doesn't fit the mobile nav strip
// alongside its 8 siblings — CSS can't truncate to a *different* word, so this is
// the one place that decides the shorter form. The nav renders `short ?? label`;
// the sidebar and the pane's <h1> always render `label`.
export const TABS = [
  { id: 'creator', icon: 'ti-edit', label: 'Criador de Treinos', short: 'Criador' },
  { id: 'athletes', icon: 'ti-chart-radar', label: 'Atletas' },
  { id: 'exercises', icon: 'ti-tool', label: 'Exercícios' },
  { id: 'locations', icon: 'ti-map-pin', label: 'Serviços' },
  { id: 'results', icon: 'ti-chart-bar', label: 'Resultados' },
  { id: 'agenda', icon: 'ti-calendar', label: 'Agenda' },
  { id: 'publisher', icon: 'ti-layout-grid', label: 'Publicador de Grade', short: 'Publicador' },
  { id: 'tv', icon: 'ti-device-tv', label: 'Quadro ao Vivo', short: 'Quadro' },
  { id: 'config', icon: 'ti-settings', label: 'Configurações', short: 'Config' },
]

export const DAYS = ['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'];
export const DSHORT = ['DOM','SEG','TER','QUA','QUI','SEX','SAB'];

export const APP_CONFIG = {
  gymName: 'Cone',
  fontScale: 1.5,
  zoneScales: [1,1,1],
  blockTitleScales: [1,1,1],
  logoScale: 1,
  mobileEaglesBg: '#000000',
  mobileExerciseNoteColor: '#4a9aaa',
  mobileMegaManBg: '#0a1a5c',
  athleteLevels: ['Iniciante','Intermediário','Avançado','Competidor'],
  athleteGoals: ['Saúde geral','Força','Condicionamento','Competição'],
  blockColors: {},
  blockNames: ['-','WOD','Skill','Core','Acessórios','LPO','Aquecimento','Força','Cardio','Mobilidade','HIIT','MetCon','EMOM','For Time','AMRAP','Estações','Descanso'],
  appTitle: 'Cone — Treinos',
  appDescription: 'Criador e publicador de treinos Cone',
  scheduleTitle: 'Cone — Treinos',
  leaderboardTitle: 'Cone — Leaderboard',
  fontFamily: "'Arial Black',Arial,sans-serif",
  googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Raleway:wght@400;600;700;900&display=swap',
  logo: 'icon-192.png',
  themeAccent: '#00b8d4',
  themeAccentText: '#000000',
  exportScale: 2,
  lbColors: {
    bg:'#000000', rowAlt:'#020809',
    podium0:'rgba(255,215,0,0.06)', podium1:'rgba(192,192,192,0.05)', podium2:'rgba(205,127,50,0.05)',
    divider:'#0d1e1e', headerBg:'#000000', headerBorder:'#00b8d4',
    headerTitle:'#ffffff', headerSub:'#00b8d4', rankNormal:'#333333',
    rank1:'#ffd700', rank2:'#c0c0c0', rank3:'#cd7f32',
    athleteName:'#ffffff', scaleBadgeText:'#00b8d4',
    scaleBadgeBg:'rgba(0,184,212,0.1)', scaleBadgeBorder:'#00b8d4',
    perfNormal:'#ffffff', filterActiveBg:'#00b8d4', filterActiveText:'#000000'
  },
  restDayLabel: 'Descanso',
  mobileWeeklyLabels: ['Mobile Semanal 01','Mobile Semanal 02']
};

export const DEFAULT_TYPES = ['Aquecimento','Força','Cardio','Mobilidade','HIIT','MetCon','EMOM','For Time','AMRAP','Estações','Descanso'];
export const TYPES = DEFAULT_TYPES;
export const ZONES = ['Zona 01','Zona 02','Zona 03'];

// EN→PT normalisation — keeps imported English states working
const TYPE_MAP = {
  'Warm-Up':'Aquecimento','Strength':'Força','Mobility':'Mobilidade','Rest':'Descanso',
  'EMOM':'EMOM','Zone 01':'Zona 01','Zone 02':'Zona 02','Zone 03':'Zona 03'
};
export const normaliseType = t => TYPE_MAP[t] || t;
export const normaliseZone = z => TYPE_MAP[z] || z;

// ── Block CSS class mapping ────────────────────────────────────────────────────
// RED family:   WOD, HIIT, MetCon
// AMBER family: EMOM, For Time, AMRAP, Estações
// BLUE family:  Força, LPO, Core, Acessórios
// GREEN family: Aquecimento, Skill, Cardio, Mobilidade
export const BTC = {
  // Red
  'WOD':'bt-wd',
  'HIIT':'bt-hi',
  'MetCon':'bt-mc',
  // Amber/orange
  'EMOM':'bt-em',
  'For Time':'bt-ft',
  'AMRAP':'bt-am',
  'Estações':'bt-es',
  // Blue
  'Força':'bt-st','Strength':'bt-st',
  'LPO':'bt-lp',
  'Core':'bt-co',
  'Acessórios':'bt-ac',
  // Green
  'Aquecimento':'bt-wu','Warm-Up':'bt-wu',
  'Skill':'bt-sk',
  'Cardio':'bt-ca',
  'Mobilidade':'bt-mo','Mobility':'bt-mo',
  // Neutral
  'Descanso':'bt-re','Rest':'bt-re',
};

export const PLC = {
  // Red
  'WOD':'p-wd',
  'HIIT':'p-hi',
  'MetCon':'p-mc',
  // Amber/orange
  'EMOM':'p-em',
  'For Time':'p-ft',
  'AMRAP':'p-am',
  'Estações':'p-es',
  // Blue
  'Força':'p-st','Strength':'p-st',
  'LPO':'p-lp',
  'Core':'p-co',
  'Acessórios':'p-ac',
  // Green
  'Aquecimento':'p-wu','Warm-Up':'p-wu',
  'Skill':'p-sk',
  'Cardio':'p-ca',
  'Mobilidade':'p-mo','Mobility':'p-mo',
  // Neutral
  'Descanso':'p-re','Rest':'p-re',
};

const ECOL_BASE = {
  // Red family
  'WOD':      {text:'#d04848',bg:'#1c0808'},
  'HIIT':     {text:'#e05848',bg:'#1e0a0a'},
  'MetCon':   {text:'#c84040',bg:'#1a0808'},
  // Amber/orange family
  'EMOM':     {text:'#d07828',bg:'#1c1000'},
  'For Time': {text:'#c86828',bg:'#1a0e00'},
  'AMRAP':    {text:'#e09830',bg:'#1e1400'},
  'Estações': {text:'#c8a030',bg:'#1a1200'},
  // Blue family
  'Força':    {text:'#5090e0',bg:'#081428'},'Strength':{text:'#5090e0',bg:'#081428'},
  'LPO':      {text:'#4070c0',bg:'#060e20'},
  'Core':     {text:'#6090d8',bg:'#0a1428'},
  'Acessórios':{text:'#4878b8',bg:'#061020'},
  // Green family
  'Aquecimento':{text:'#80c040',bg:'#101e08'},'Warm-Up':{text:'#80c040',bg:'#101e08'},
  'Skill':    {text:'#4ac8c0',bg:'#081e1c'},
  'Cardio':   {text:'#40b878',bg:'#081c10'},
  'Mobilidade':{text:'#30a868',bg:'#061a10'},'Mobility':{text:'#30a868',bg:'#061a10'},
  // Neutral
  'Descanso': {text:'#555',bg:'#111'},'Rest':{text:'#555',bg:'#111'},
};
export const ECOL = new Proxy(ECOL_BASE, {
  get: (t, k) => APP_CONFIG.blockColors?.[k]
    ? { text: APP_CONFIG.blockColors[k], bg: '#111' }
    : (t[k] || t['Força'])
});

export const GF = () => APP_CONFIG.fontFamily || "'Arial Black',Arial,sans-serif";

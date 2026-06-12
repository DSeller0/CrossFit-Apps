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
  blockNames: ['-','WOD','Skill','Core','Acessórios','LPO','Aquecimento','Força','Cardio','Mobilidade','HIIT','MetCon','EMOM','For Time','AMRAP','Descanso'],
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
  mobileWeeklyLabels: ['Mobile Semanal Cone','Mobile Semanal Medrado']
};

export const DEFAULT_TYPES = ['Aquecimento','Força','Cardio','Mobilidade','HIIT','MetCon','EMOM','For Time','AMRAP','Descanso'];
export const TYPES = DEFAULT_TYPES;
export const ZONES = ['Zona 01','Zona 02','Zona 03'];

// EN→PT normalisation — keeps imported English states working
const TYPE_MAP = {
  'Warm-Up':'Aquecimento','Strength':'Força','Mobility':'Mobilidade','Rest':'Descanso',
  'EMOM':'EMOM','Zone 01':'Zona 01','Zone 02':'Zona 02','Zone 03':'Zona 03'
};
export const normaliseType = t => TYPE_MAP[t] || t;
export const normaliseZone = z => TYPE_MAP[z] || z;

export const BTC = {
  'Aquecimento':'bt-wu','Warm-Up':'bt-wu','Força':'bt-st','Strength':'bt-st',
  'Cardio':'bt-ca','Mobilidade':'bt-mo','Mobility':'bt-mo','HIIT':'bt-hi',
  'MetCon':'bt-mc','EMOM':'bt-mc','For Time':'bt-ft','AMRAP':'bt-am',
  'Descanso':'bt-re','Rest':'bt-re'
};
export const PLC = {
  'Aquecimento':'p-wu','Warm-Up':'p-wu','Força':'p-st','Strength':'p-st',
  'Cardio':'p-ca','Mobilidade':'p-mo','Mobility':'p-mo','HIIT':'p-hi',
  'MetCon':'p-mc','EMOM':'p-mc','For Time':'p-ft','AMRAP':'p-am',
  'Descanso':'p-re','Rest':'p-re'
};

const ECOL_BASE = {
  'Aquecimento':{text:'#e87820',bg:'#1a0e04'},'Warm-Up':{text:'#e87820',bg:'#1a0e04'},
  'Força':{text:'#e87820',bg:'#1a0e04'},'Strength':{text:'#e87820',bg:'#1a0e04'},
  'Cardio':{text:'#f5c842',bg:'#1a1604'},
  'Mobilidade':{text:'#e87820',bg:'#1a0e04'},'Mobility':{text:'#e87820',bg:'#1a0e04'},
  'HIIT':{text:'#f5c842',bg:'#1a1604'},
  'MetCon':{text:'#f5c842',bg:'#1a1604'},
  'EMOM':{text:'#f5c842',bg:'#1a1604'},
  'For Time':{text:'#e87820',bg:'#1a0e04'},
  'AMRAP':{text:'#f5c842',bg:'#1a1604'},
  'Descanso':{text:'#888',bg:'#111'},'Rest':{text:'#888',bg:'#111'}
};
export const ECOL = new Proxy(ECOL_BASE, {
  get: (t, k) => APP_CONFIG.blockColors?.[k]
    ? { text: APP_CONFIG.blockColors[k], bg: '#111' }
    : (t[k] || t['Força'])
});

export const GF = () => APP_CONFIG.fontFamily || "'Arial Black',Arial,sans-serif";

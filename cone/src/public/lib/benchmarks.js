import { uid } from './wod.js'

export const BENCHMARK_GIRLS = [
  { name:'Fran',      type:'For Time', duration:10, rounds:null, desc:'21-15-9 · Thrusters + Pull-ups',
    exercises:[{name:'Thruster',sets:'3',reps:'21-15-9',intensity:{mode:'gender',Masculino_RX:'43',Masculino_unit:'kg',Feminino_RX:'30',Feminino_unit:'kg'}},{name:'Pull-up',sets:'3',reps:'21-15-9',intensity:null}]},
  { name:'Grace',     type:'For Time', duration:10, rounds:null, desc:'30 Clean and Jerks',
    exercises:[{name:'Clean and Jerk',sets:'1',reps:'30',intensity:{mode:'gender',Masculino_RX:'60',Masculino_unit:'kg',Feminino_RX:'43',Feminino_unit:'kg'}}]},
  { name:'Helen',     type:'For Time', duration:15, rounds:3,    desc:'3 rounds · 400m Run + 21 KB Swings + 12 Pull-ups',
    exercises:[{name:'Run',sets:'3',reps:'400m',intensity:{mode:'cardio',cardioVal:'400',cardioUnit:'m'}},{name:'Kettlebell Swing',sets:'3',reps:'21',intensity:{mode:'gender',Masculino_RX:'24',Masculino_unit:'kg',Feminino_RX:'16',Feminino_unit:'kg'}},{name:'Pull-up',sets:'3',reps:'12',intensity:null}]},
  { name:'Annie',     type:'For Time', duration:15, rounds:null, desc:'50-40-30-20-10 · Double-unders + Sit-ups',
    exercises:[{name:'Double-under',sets:'5',reps:'50-40-30-20-10',intensity:null},{name:'Sit-up',sets:'5',reps:'50-40-30-20-10',intensity:null}]},
  { name:'Cindy',     type:'AMRAP',    duration:20, rounds:null, desc:'20 min AMRAP · 5 Pull-ups + 10 Push-ups + 15 Air Squats',
    exercises:[{name:'Pull-up',sets:'',reps:'5',intensity:null},{name:'Push-up',sets:'',reps:'10',intensity:null},{name:'Air Squat',sets:'',reps:'15',intensity:null}]},
  { name:'Diane',     type:'For Time', duration:10, rounds:null, desc:'21-15-9 · Deadlifts + Handstand Push-ups',
    exercises:[{name:'Deadlift',sets:'3',reps:'21-15-9',intensity:{mode:'gender',Masculino_RX:'102',Masculino_unit:'kg',Feminino_RX:'70',Feminino_unit:'kg'}},{name:'Handstand Push-up',sets:'3',reps:'21-15-9',intensity:null}]},
  { name:'Elizabeth', type:'For Time', duration:15, rounds:null, desc:'21-15-9 · Cleans + Ring Dips',
    exercises:[{name:'Clean',sets:'3',reps:'21-15-9',intensity:{mode:'gender',Masculino_RX:'61',Masculino_unit:'kg',Feminino_RX:'43',Feminino_unit:'kg'}},{name:'Ring Dip',sets:'3',reps:'21-15-9',intensity:null}]},
  { name:'Isabel',    type:'For Time', duration:10, rounds:null, desc:'30 Snatches',
    exercises:[{name:'Snatch',sets:'1',reps:'30',intensity:{mode:'gender',Masculino_RX:'60',Masculino_unit:'kg',Feminino_RX:'43',Feminino_unit:'kg'}}]},
  { name:'Karen',     type:'For Time', duration:20, rounds:null, desc:'150 Wall Balls',
    exercises:[{name:'Wall Ball',sets:'1',reps:'150',intensity:{mode:'gender',Masculino_RX:'9',Masculino_unit:'kg',Feminino_RX:'6',Feminino_unit:'kg'}}]},
  { name:'Amanda',    type:'For Time', duration:15, rounds:null, desc:'9-7-5 · Muscle-ups + Snatches',
    exercises:[{name:'Muscle-up',sets:'3',reps:'9-7-5',intensity:null},{name:'Snatch',sets:'3',reps:'9-7-5',intensity:{mode:'gender',Masculino_RX:'60',Masculino_unit:'kg',Feminino_RX:'43',Feminino_unit:'kg'}}]},
]

export const BENCHMARK_HEROES = [
  { name:'Murph',   type:'For Time', duration:60, rounds:null, desc:'1 mile Run + 100 Pull-ups + 200 Push-ups + 300 Air Squats + 1 mile Run',
    exercises:[{name:'Run',sets:'1',reps:'1600m',intensity:{mode:'cardio',cardioVal:'1600',cardioUnit:'m'}},{name:'Pull-up',sets:'1',reps:'100',intensity:null},{name:'Push-up',sets:'1',reps:'200',intensity:null},{name:'Air Squat',sets:'1',reps:'300',intensity:null},{name:'Run',sets:'1',reps:'1600m',intensity:{mode:'cardio',cardioVal:'1600',cardioUnit:'m'}}]},
  { name:'DT',      type:'For Time', duration:20, rounds:5,    desc:'5 rounds · 12 Deadlifts + 9 Hang Power Cleans + 6 Push Jerks',
    exercises:[{name:'Deadlift',sets:'5',reps:'12',intensity:{mode:'gender',Masculino_RX:'70',Masculino_unit:'kg',Feminino_RX:'47',Feminino_unit:'kg'}},{name:'Hang Power Clean',sets:'5',reps:'9',intensity:{mode:'gender',Masculino_RX:'70',Masculino_unit:'kg',Feminino_RX:'47',Feminino_unit:'kg'}},{name:'Push Jerk',sets:'5',reps:'6',intensity:{mode:'gender',Masculino_RX:'70',Masculino_unit:'kg',Feminino_RX:'47',Feminino_unit:'kg'}}]},
  { name:'JT',      type:'For Time', duration:20, rounds:null, desc:'21-15-9 · Handstand Push-ups + Ring Dips + Push-ups',
    exercises:[{name:'Handstand Push-up',sets:'3',reps:'21-15-9',intensity:null},{name:'Ring Dip',sets:'3',reps:'21-15-9',intensity:null},{name:'Push-up',sets:'3',reps:'21-15-9',intensity:null}]},
  { name:'Nate',    type:'AMRAP',    duration:20, rounds:null, desc:'20 min AMRAP · 2 Muscle-ups + 4 HSPU + 8 KB Swings',
    exercises:[{name:'Muscle-up',sets:'',reps:'2',intensity:null},{name:'Handstand Push-up',sets:'',reps:'4',intensity:null},{name:'Kettlebell Swing',sets:'',reps:'8',intensity:{mode:'gender',Masculino_RX:'32',Masculino_unit:'kg',Feminino_RX:'24',Feminino_unit:'kg'}}]},
  { name:'Daniel',  type:'For Time', duration:30, rounds:null, desc:'50 Pull-ups + 400m + 21 Thrusters + 800m + 21 Thrusters + 400m + 50 Pull-ups',
    exercises:[{name:'Pull-up',sets:'',reps:'50',intensity:null},{name:'Run',sets:'',reps:'400m',intensity:{mode:'cardio',cardioVal:'400',cardioUnit:'m'}},{name:'Thruster',sets:'',reps:'21',intensity:{mode:'gender',Masculino_RX:'43',Masculino_unit:'kg',Feminino_RX:'30',Feminino_unit:'kg'}},{name:'Run',sets:'',reps:'800m',intensity:{mode:'cardio',cardioVal:'800',cardioUnit:'m'}},{name:'Thruster',sets:'',reps:'21',intensity:{mode:'gender',Masculino_RX:'43',Masculino_unit:'kg',Feminino_RX:'30',Feminino_unit:'kg'}},{name:'Run',sets:'',reps:'400m',intensity:{mode:'cardio',cardioVal:'400',cardioUnit:'m'}},{name:'Pull-up',sets:'',reps:'50',intensity:null}]},
  { name:'Badger',  type:'For Time', duration:40, rounds:3,    desc:'3 rounds · 30 Squat Cleans + 30 Pull-ups + 800m Run',
    exercises:[{name:'Squat Clean',sets:'3',reps:'30',intensity:{mode:'gender',Masculino_RX:'43',Masculino_unit:'kg',Feminino_RX:'30',Feminino_unit:'kg'}},{name:'Pull-up',sets:'3',reps:'30',intensity:null},{name:'Run',sets:'3',reps:'800m',intensity:{mode:'cardio',cardioVal:'800',cardioUnit:'m'}}]},
]

export function buildBenchmarkBlock(bm, category, locked = true) {
  return {
    id: uid(),
    type: 'Benchmark',
    label: bm.name,
    zone: 'Zona 01',
    notes: bm.desc || '',
    duration: bm.duration || '',
    rounds: bm.rounds || '',
    ladderMode: false,
    exercises: (bm.exercises || []).map(ex => ({
      id: uid(), name: ex.name || '', sets: ex.sets || '', reps: ex.reps || '',
      intensity: ex.intensity || null, note: '', isComplex: false, complexMovements: [],
    })),
    ...(locked ? { benchmarkRef: bm.name, benchmarkCategory: category } : {}),
    coachNote: '',
  }
}

export function benchmarkToTimerExes(bm) {
  return (bm.exercises || []).map(ex => {
    let line = ex.reps ? ex.reps + ' ' + ex.name : ex.name
    if (ex.intensity) {
      const int = ex.intensity
      if (int.mode === 'gender') line += ` (${int.Masculino_RX}/${int.Feminino_RX}${int.Masculino_unit || 'kg'})`
      else if (int.mode === 'fixed') line += ` (${int.fixedVal}${int.fixedUnit || 'kg'})`
    }
    return line.trim()
  }).join('\n')
}

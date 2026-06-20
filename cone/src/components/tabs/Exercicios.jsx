import { useState, useMemo } from 'react';
import { loadRegistry, saveRegistry, loadSettings } from '../../utils/storage';
import { APP_CONFIG, ECOL } from '../../utils/config';
import { useIsMobile } from '../../hooks/useIsMobile';

const BG    = '#0d0b09';
const STONE = '#161210';
const DIV   = '#2a231c';
const CREAM = '#f0e8d0';
const SUB   = '#c8b090';
const MUTED = '#806850';
const DIM   = '#554a3a';

const BLOCK_ORDER = [
  'HIIT','MetCon','EMOM','For Time','AMRAP',
  'Estações','Força','LPO','Core','Acessórios',
  'Aquecimento','Skill','Cardio','Mobilidade','Descanso',
];

const getExName = ex => typeof ex === 'string' ? ex : (ex?.name || '');

const extractYouTubeId = url => {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
};

// ── Base exercise library ─────────────────────────────────────────────────────
const BASE_EXERCISES = {
  'Força': [
    { name:'Back Squat',          description:'Agachamento com barra apoiada nas costas.',                              muscles:'Quadríceps, glúteos, isquiotibiais.' },
    { name:'Front Squat',         description:'Agachamento com barra na frente, apoiada nos ombros.',                   muscles:'Quadríceps, glúteos, core.' },
    { name:'Overhead Squat',      description:'Agachamento com barra sustentada acima da cabeça.',                      muscles:'Quadríceps, glúteos, estabilizadores do ombro, core.' },
    { name:'Deadlift',            description:'Levantamento terra convencional do solo.',                                muscles:'Glúteos, isquiotibiais, eretores da coluna, trapézio.' },
    { name:'Sumo Deadlift',       description:'Terra com pegada larga e pés abduzidos.',                                muscles:'Adutores, glúteos, isquiotibiais.' },
    { name:'Romanian Deadlift',   description:'Terra romeno com joelhos levemente flexionados.',                        muscles:'Isquiotibiais, glúteos.' },
    { name:'Bench Press',         description:'Supino com barra.',                                                      muscles:'Peitoral maior, tríceps, deltoide anterior.' },
    { name:'Strict Press',        description:'Desenvolvimento estrito com barra, sem impulso das pernas.',             muscles:'Deltoides, tríceps, trapézio superior.' },
    { name:'Push Press',          description:'Desenvolvimento com leve impulso das pernas.',                           muscles:'Deltoides, tríceps, quadríceps.' },
    { name:'Push Jerk',           description:'Jerk com recepção na largura dos ombros.',                              muscles:'Deltoides, tríceps, pernas, core.' },
    { name:'Split Jerk',          description:'Jerk com recepção em posição de avanço.',                               muscles:'Deltoides, tríceps, pernas.',                          notes:'Requer maior mobilidade de quadril do que o push jerk.' },
    { name:'Barbell Row',         description:'Remada com barra, tronco inclinado.',                                   muscles:'Dorsais, romboides, bíceps.' },
    { name:'Weighted Pull-up',    description:'Barra fixa com carga adicional.',                                        muscles:'Dorsais, bíceps, romboides.' },
    { name:'Weighted Dip',        description:'Paralelas com carga extra.',                                             muscles:'Peitoral inferior, tríceps, deltoide anterior.' },
    { name:'Bulgarian Split Squat',description:'Agachamento unilateral com pé traseiro elevado.',                      muscles:'Quadríceps, glúteos, hip flexors.',                    notes:'Forte demanda de equilíbrio e mobilidade de quadril.' },
    { name:'Box Squat',           description:'Agachamento com pausa sentado na caixa.',                               muscles:'Glúteos, isquiotibiais, quadríceps.',                  notes:'Ensina a ativação correta dos glúteos; útil para corrigir wink pélvico.' },
    { name:'Pause Squat',         description:'Agachamento com pausa na posição mais baixa.',                          muscles:'Quadríceps, glúteos.',                                 notes:'Desenvolve força no ponto de estagnação (hole).' },
    { name:'Good Morning',        description:'Barra nas costas, inclinação do tronco à frente.',                      muscles:'Isquiotibiais, glúteos, eretores da coluna.' },
    { name:'Zercher Squat',       description:'Agachamento com barra encaixada nos cotovelos.',                        muscles:'Quadríceps, core, bíceps.',                            notes:'Desafia a manutenção do tronco vertical.' },
    { name:'Trap Bar Deadlift',   description:'Terra com barra hexagonal.',                                            muscles:'Quadríceps, glúteos, trapézio.',                       notes:'Menor tensão lombar em relação ao terra convencional; boa opção para iniciantes.' },
  ],
  'LPO': [
    { name:'Clean',               description:'Levantamento da barra do solo até os ombros (rack position).',          muscles:'Cadeia posterior completa, trapézio, panturrilha.' },
    { name:'Power Clean',         description:'Clean com recepção acima de 90° de flexão de joelho.',                  muscles:'Extensão de quadril explosiva, trapézio.' },
    { name:'Hang Clean',          description:'Clean iniciado com a barra suspensa na coxa ou joelho.',                muscles:'Cadeia posterior, trapézio.',                          notes:'Trabalha especificamente a fase de aceleração do segundo puxão.' },
    { name:'Hang Power Clean',    description:'Power clean iniciado suspenso.',                                         muscles:'Explosividade do segundo puxão, trapézio.' },
    { name:'Clean & Jerk',        description:'Clean seguido de jerk; biathlon olímpico.',                             muscles:'Corpo inteiro: cadeia posterior, deltoides, tríceps, pernas.' },
    { name:'Snatch',              description:'Barra do solo direto acima da cabeça em um único movimento.',           muscles:'Cadeia posterior, ombros, core.',                      notes:'Exige alta mobilidade e sincronia de toda a musculatura.' },
    { name:'Power Snatch',        description:'Snatch com recepção acima de 90° de flexão.',                           muscles:'Extensão de quadril explosiva, deltoides.' },
    { name:'Hang Snatch',         description:'Snatch iniciado suspenso na coxa ou joelho.',                           muscles:'Cadeia posterior, deltoides, trapézio.' },
    { name:'Hang Power Snatch',   description:'Power snatch iniciado suspenso.',                                        muscles:'Velocidade de extensão do quadril e braços.' },
    { name:'Muscle Snatch',       description:'Snatch sem recepção em agachamento; barra vai direto ao overhead.',     muscles:'Deltoides, trapézio.',                                notes:'Treina a velocidade de rotação dos ombros e o turnover.' },
    { name:'Snatch Balance',      description:'Dip, impulso e descida rápida para receber a barra no OHS.',            muscles:'Deltoides, estabilizadores do core.',                  notes:'Exige máxima velocidade de descida; treina a recepção sob pressão.' },
    { name:'Clean Pull',          description:'Puxada do clean sem recepção.',                                         muscles:'Cadeia posterior, trapézio.',                          notes:'Treina mecânica do primeiro e segundo puxão com cargas maiores.' },
    { name:'Snatch Pull',         description:'Puxada do snatch sem recepção, pegada larga.',                          muscles:'Cadeia posterior, trapézio.' },
    { name:'Clean Deadlift',      description:'Terra com pegada de clean.',                                            muscles:'Cadeia posterior.',                                    notes:'Fortalece a posição inicial específica do levantamento olímpico.' },
    { name:'Snatch Deadlift',     description:'Terra com pegada larga de snatch.',                                     muscles:'Cadeia posterior.' },
    { name:'High Pull',           description:'Puxada alta com explosão de quadril.',                                  muscles:'Trapézio, deltoides, cadeia posterior.' },
    { name:'Jerk from Rack',      description:'Jerk executado com barra partindo do rack, sem clean.',                 muscles:'Deltoides, tríceps, pernas.',                          notes:'Permite trabalhar volumes maiores de jerk sem o desgaste do clean.' },
  ],
  'Core': [
    { name:'Toes to Bar',         description:'Suspenso na barra, elevar os pés até tocá-la.',                        muscles:'Flexores do quadril, reto abdominal.' },
    { name:'Knees to Elbow',      description:'Suspenso na barra, elevar os joelhos até os cotovelos.',               muscles:'Flexores do quadril, abdômen.' },
    { name:'GHD Sit-up',          description:'Sit-up no aparelho GHD com extensão completa do tronco.',              muscles:'Flexores do quadril, reto abdominal.',                 notes:'Cuidado com DOMS severo em alto volume, especialmente em iniciantes.' },
    { name:'AbMat Sit-up',        description:'Sit-up com apoio lombar no AbMat.',                                    muscles:'Reto abdominal.' },
    { name:'Hollow Hold',         description:'Posição de banana sustentada isometricamente.',                         muscles:'Reto abdominal, transverso, serrátil anterior.' },
    { name:'Hollow Rock',         description:'Hollow hold com balanço rítmico.',                                      muscles:'Reto abdominal, transverso.',                          notes:'Mesmo padrão do hold; demanda adicional de controle motor.' },
    { name:'L-Sit',               description:'Suporte com pernas estendidas paralelas ao solo.',                      muscles:'Flexores do quadril, reto abdominal, tríceps.' },
    { name:'V-up',                description:'Deitado, elevar simultaneamente pernas e tronco.',                      muscles:'Reto abdominal, flexores do quadril.' },
    { name:'Plank',               description:'Prancha isométrica com apoio nos cotovelos ou mãos.',                  muscles:'Transverso, reto abdominal, glúteos.' },
    { name:'Side Plank',          description:'Prancha lateral.',                                                       muscles:'Oblíquos, quadrado lombar, abdutores do quadril.' },
    { name:'Dead Bug',            description:'Extensão alternada de braço e perna oposta deitado.',                   muscles:'Transverso abdominal.',                               notes:'Excelente para reeducação postural e controle lombopélvico.' },
    { name:'Russian Twist',       description:'Rotação do tronco sentado, com ou sem peso.',                           muscles:'Oblíquos internos e externos.' },
    { name:'Flutter Kicks',       description:'Deitado, pernas estendidas em chute alternado.',                        muscles:'Flexores do quadril, reto abdominal inferior.' },
    { name:'Hanging Leg Raise',   description:'Suspenso na barra, elevar as pernas com joelhos estendidos.',          muscles:'Flexores do quadril, reto abdominal.' },
    { name:'GHD Back Extension',  description:'Extensão do tronco no aparelho GHD.',                                  muscles:'Eretores da coluna, glúteos, isquiotibiais.' },
    { name:'Dragon Flag',         description:'Elevação do corpo inteiro em posição planchada, apoiado no banco.',    muscles:'Reto abdominal, oblíquos, estabilizadores do ombro.',  notes:'Movimento avançado; exige forte base de força de core.' },
    { name:'Pallof Press',        description:'Press anti-rotação com cabo ou elástico.',                              muscles:'Oblíquos, transverso.',                               notes:'Treina estabilidade do core em vez de flexão; excelente preventivo.' },
    { name:'Banded Good Morning', description:'Good morning com elástico.',                                            muscles:'Isquiotibiais, glúteos, eretores da coluna.',         notes:'Versão mais acessível do good morning com barra.' },
  ],
  'Acessórios': [
    { name:'Hip Thrust',          description:'Empurramento de quadril com barra no colo, ombros apoiados no banco.', muscles:'Glúteo máximo.',                                       notes:'Principal exercício isolado para ativação e hipertrofia do glúteo máximo.' },
    { name:'Glute Bridge',        description:'Ponte de glúteos deitado no chão, sem barra.',                         muscles:'Glúteo máximo, isquiotibiais.',                        notes:'Versão mais acessível do hip thrust; boa para aquecimento.' },
    { name:'Nordic Curl',         description:'Ajoelhado com pés presos, descida controlada à frente.',               muscles:'Isquiotibiais excêntricos.',                           notes:'Excelente para prevenção de lesões nos isquiotibiais.' },
    { name:'Single Leg RDL',      description:'Terra romeno unilateral.',                                              muscles:'Isquiotibiais, glúteo máximo.',                       notes:'Desafio adicional de equilíbrio e estabilidade unilateral.' },
    { name:'Calf Raise',          description:'Elevação de calcâneo em pé ou sentado.',                               muscles:'Gastrocnêmio, sóleo.' },
    { name:'Step-up',             description:'Subida em caixa ou banco com peso.',                                   muscles:'Quadríceps, glúteos.',                                notes:'Equilibra assimetrias laterais; ajuste a altura da caixa.' },
    { name:'Cossack Squat',       description:'Agachamento lateral com perna oposta estendida.',                       muscles:'Adutores, quadríceps.',                               notes:'Excelente para mobilidade de quadril e força dos adutores.' },
    { name:'Banded Squat Walk',   description:'Caminhada lateral com elástico no joelho ou tornozelo.',               muscles:'Glúteo médio, abdutores do quadril.' },
    { name:'Bicep Curl',          description:'Rosca direta com halteres ou barra.',                                  muscles:'Bíceps braquial, braquiorradial.' },
    { name:'Hammer Curl',         description:'Rosca martelo com pegada neutra.',                                      muscles:'Bíceps, braquial, braquiorradial.' },
    { name:'Tricep Extension',    description:'Extensão de tríceps com halteres ou cabo.',                            muscles:'Tríceps (três cabeças).' },
    { name:'Skull Crusher',       description:'Extensão de tríceps deitado com barra.',                               muscles:'Tríceps, ênfase na cabeça longa.' },
    { name:'Lateral Raise',       description:'Elevação lateral com halteres.',                                        muscles:'Deltoide medial.' },
    { name:'Front Raise',         description:'Elevação frontal com halteres ou barra.',                              muscles:'Deltoide anterior, peitoral superior.' },
    { name:'Face Pull',           description:'Puxada para o rosto com cabo ou elástico.',                            muscles:'Deltoide posterior, rotadores externos, retratores da escápula.', notes:'Essencial para saúde dos ombros em atletas com alto volume de press.' },
    { name:'Band Pull-apart',     description:'Abertura do elástico na horizontal.',                                   muscles:'Deltoides posteriores, romboides.',                    notes:'Simples e eficaz; pode ser feito como aquecimento ou finalizador.' },
    { name:'Reverse Fly',         description:'Voador inverso com halteres, tronco inclinado.',                        muscles:'Deltoides posteriores, romboides, infraespinal.' },
    { name:'Dumbbell Row',        description:'Remada unilateral com haltere.',                                        muscles:'Dorsais, romboides, bíceps.' },
    { name:'Incline Press',       description:'Supino inclinado com barra ou halteres.',                              muscles:'Peitoral superior, deltoide anterior, tríceps.' },
    { name:'Seal Row',            description:'Remada deitado no banco sem apoio dos pés.',                           muscles:'Dorsais, romboides.',                                  notes:'Elimina compensações do corpo; isola melhor os puxadores.' },
  ],
  'Aquecimento': [
    { name:'PVC Pass-through',    description:'Passagem do PVC sobre a cabeça com pegada ampla.',                     muscles:'Mobilidade de ombro e torácica.' },
    { name:'PVC OHS',             description:'Overhead squat com PVC.',                                               muscles:'Mobilidade de tornozelo, quadril e ombro.',            notes:'Treina o padrão do agachamento sem carga.' },
    { name:'PVC Good Morning',    description:'Good morning com PVC.',                                                 muscles:'Isquiotibiais, eretores da coluna.' },
    { name:'Air Squat',           description:'Agachamento com o peso corporal.',                                      muscles:'Quadríceps, glúteos.',                                notes:'Base do padrão de agachamento; verifique posição de joelho e tornozelo.' },
    { name:'Inchworm',            description:'Caminhada das mãos à posição de prancha e retorno.',                   muscles:'Core, ombros, isquiotibiais.' },
    { name:'Samson Stretch',      description:'Avanço com braços estendidos acima da cabeça.',                        muscles:'Flexores do quadril, core.' },
    { name:'World\'s Greatest Stretch', description:'Sequência de avanço com rotação torácica e extensão de quadril.',muscles:'Quadril, torácica, posterior de coxa.',                notes:'Um dos melhores movimentos de mobilidade geral para aquecimento.' },
    { name:'Spiderman Lunge',     description:'Avanço com mão no chão ao lado do pé e rotação torácica.',            muscles:'Flexores do quadril, adutores, torácica.' },
    { name:'Leg Swing',           description:'Balanço pendular das pernas, frontal e lateral.',                       muscles:'Mobiliza quadril e ativa musculatura periarticular.' },
    { name:'Arm Circle',          description:'Círculos dos braços.',                                                  muscles:'Manguito rotador, mobilidade de ombro.' },
    { name:'Hip Circle',          description:'Círculos de quadril em pé.',                                            muscles:'Articulação coxofemoral, glúteos.' },
    { name:'Shoulder Dislocate',  description:'Passagem do bastão por trás com pegada ampla.',                        muscles:'Mobilidade de ombro, rotação externa.',               notes:'Execute devagar; a pegada deve ser ampla o suficiente para não causar dor.' },
    { name:'Cat-Cow',             description:'Mobilização da coluna em posição quadrúpede.',                          muscles:'Coluna torácica e lombar, multífidos.' },
    { name:'T-spine Rotation',    description:'Rotação torácica em posição lateral ou quadrúpede.',                   muscles:'Coluna torácica.',                                    notes:'Essencial para movimentos overhead e clean.' },
    { name:'Hip 90/90',           description:'Sentado com quadris em 90° de rotação interna e externa alternados.', muscles:'Rotadores internos e externos do quadril.',            notes:'Um dos movimentos mais eficazes para abrir e mobilizar o quadril.' },
    { name:'Ankle Dorsiflexion',  description:'Exercício ativo de dorsiflexão do tornozelo.',                         muscles:'Tornozelo, panturrilha.',                             notes:'Melhora profundidade do agachamento.' },
    { name:'Box Hip Flexor',      description:'Alongamento de flexor do quadril com apoio em caixa.',                 muscles:'Psoas, ilíaco.' },
    { name:'Banded Distraction',  description:'Distração articular com elástico.',                                    muscles:'Cápsula articular (quadril, tornozelo ou ombro).',    notes:'Pode ser aplicado em diferentes articulações dependendo do treino.' },
    { name:'Wrist Circle',        description:'Círculos de punho.',                                                    muscles:'Punho, antebraço.',                                   notes:'Importante antes de clean, front rack, handstand e ring work.' },
    { name:'Glute Bridge',        description:'Ponte de glúteos sem carga, como ativação.',                           muscles:'Glúteo máximo, isquiotibiais.',                       notes:'Versão sem carga; ideal como ativação pré-treino de quadril/glúteo.' },
  ],
  'Skill': [
    { name:'Kipping Pull-up',     description:'Barra fixa com impulso rítmico do quadril.',                           muscles:'Dorsais, bíceps, core.',                              notes:'Exige base sólida de strict pull-up antes de ser praticado.' },
    { name:'Strict Pull-up',      description:'Barra fixa sem impulso.',                                               muscles:'Dorsais, bíceps, romboides.',                         notes:'Base de força obrigatória antes de kipping ou muscle-up.' },
    { name:'Chest-to-Bar',        description:'Barra fixa com peito tocando a barra.',                                muscles:'Dorsais, bíceps.',                                    notes:'Maior amplitude do pull-up; exige mais força de puxada.' },
    { name:'Bar Muscle-up',       description:'Transição da barra fixa do pull-up para o suporte acima.',             muscles:'Dorsais, tríceps, peitoral.',                         notes:'Exige transição eficiente; habilidade avançada.' },
    { name:'Ring Muscle-up',      description:'Muscle-up nas argolas.',                                                muscles:'Peitoral, dorsais, tríceps.',                         notes:'Mais difícil que o bar muscle-up pela instabilidade das argolas.' },
    { name:'Handstand Hold',      description:'Parada de mão estática contra a parede ou livre.',                     muscles:'Deltoides, tríceps, core.' },
    { name:'Handstand Walk',      description:'Caminhada nas mãos.',                                                   muscles:'Deltoides, tríceps, core.',                           notes:'Exige prática progressiva: começar contra a parede.' },
    { name:'Strict HSPU',         description:'Flexão de braço invertida sem impulso.',                               muscles:'Deltoides, tríceps, trapézio.' },
    { name:'Kipping HSPU',        description:'Flexão de braço invertida com impulso das pernas.',                    muscles:'Deltoides, tríceps, core.',                           notes:'Exige base sólida de strict HSPU e bom controle do kip.' },
    { name:'Pistol Squat',        description:'Agachamento unilateral com perna oposta estendida.',                   muscles:'Quadríceps, glúteos.',                                notes:'Exige mobilidade de tornozelo e quadril; use progressões.' },
    { name:'Ring Row',            description:'Remada nas argolas com corpo inclinado.',                               muscles:'Dorsais, bíceps, romboides.',                         notes:'Ajuste a inclinação do corpo para regular a dificuldade.' },
    { name:'Ring Push-up',        description:'Flexão nas argolas.',                                                   muscles:'Peitoral, tríceps.',                                  notes:'A instabilidade das argolas aumenta a demanda de estabilizadores.' },
    { name:'Ring Dip',            description:'Paralelas nas argolas.',                                                muscles:'Peitoral inferior, tríceps, estabilizadores do ombro.', notes:'Mais desafiador que o bar dip pela instabilidade das argolas.' },
    { name:'Rope Climb',          description:'Subida na corda.',                                                      muscles:'Dorsais, bíceps, antebraços, core.' },
    { name:'Double Under',        description:'Corda passa duas vezes por salto.',                                     muscles:'Gastrocnêmio, sóleo.',                                notes:'Exige ritmo e timing consistentes; manter pace constante ao errar.' },
    { name:'Box Jump',            description:'Salto sobre caixa.',                                                    muscles:'Quadríceps, glúteos, panturrilha.',                   notes:'Aterrissar em flexão de joelho; evitar rebote imediato.' },
    { name:'Broad Jump',          description:'Salto horizontal máximo.',                                              muscles:'Quadríceps, glúteos, panturrilha.' },
    { name:'Bar Dip',             description:'Paralelas fixas.',                                                       muscles:'Peitoral inferior, tríceps, deltoide anterior.' },
    { name:'L-sit (rings)',       description:'L-sit nas argolas.',                                                    muscles:'Flexores do quadril, reto abdominal, tríceps.',       notes:'Mais difícil nas argolas que em paralelas fixas pela instabilidade.' },
    { name:'Tuck Planche',        description:'Planche com joelhos dobrados próximos ao peito.',                      muscles:'Deltoides anteriores, serrátil.',                     notes:'Progressão para o planche completo; foco em protação de ombro.' },
  ],
  'Cardio': [
    { name:'Corrida',             description:'Corrida em esteira ou ao ar livre.',                                    muscles:'Cardiovascular, quadríceps, isquiotibiais, panturrilha, glúteos.' },
    { name:'Remo (Ergômetro)',    description:'Remo na máquina de remo.',                                              muscles:'~86% da musculatura: pernas, dorsais, core e braços.',notes:'Sequência: engage pernas primeiro, depois core, depois braços.' },
    { name:'Bike (Assault/Echo)', description:'Bicicleta ergométrica de ar com guidão.',                              muscles:'Quadríceps, glúteos, isquiotibiais, ombros e braços.',notes:'O guidão engaja os braços simultaneamente; intensidade muito alta.' },
    { name:'Ski Erg',             description:'Remo vertical com as mãos.',                                            muscles:'Dorsais, tríceps, core.',                             notes:'Simula o movimento de esqui nórdico.' },
    { name:'Corda (Jump Rope)',   description:'Pular corda simples ou com variações.',                                 muscles:'Gastrocnêmio, sóleo, cardiovascular.' },
    { name:'Burpee',              description:'Sequência de agachamento, prancha, flexão e salto.',                   muscles:'Full body: cardiovascular, core, ombros, pernas.',    notes:'Pace constante é melhor que explosivo em volumes altos.' },
    { name:'Sled Push',           description:'Empurrar trenó com carga.',                                             muscles:'Quadríceps, glúteos, panturrilha, ombros.',           notes:'Nenhuma fase excêntrica; ideal para recuperação ativa e hipertrofia.' },
    { name:'Sled Pull',           description:'Puxar trenó com cabo ou cinto.',                                        muscles:'Isquiotibiais, glúteos, dorsais.' },
    { name:'Farmer\'s Carry',     description:'Caminhada com pesos pesados nas mãos.',                                muscles:'Trapézio, antebraços, core, estabilizadores do ombro.' },
    { name:'Yoke Carry',          description:'Caminhada com estrutura pesada nos ombros.',                           muscles:'Trapézio, core, glúteos.' },
    { name:'Med Ball Carry',      description:'Caminhada ou corrida com bola medicinal.',                              muscles:'Core, peitoral, ombros.' },
    { name:'Shuttle Run',         description:'Corridas curtas com mudança de direção.',                               muscles:'Quadríceps, glúteos, panturrilha.',                   notes:'Também conhecido como vai-e-vem; treina agilidade e aceleração.' },
    { name:'Step-up Cardio',      description:'Subida contínua em caixa com cadência cardiovascular.',                muscles:'Quadríceps, glúteos, cardiovascular.' },
  ],
  'Mobilidade': [
    { name:'Pigeon Pose',         description:'Pombo do yoga.',                                                        muscles:'Piriforme, glúteo médio, rotadores externos do quadril.' },
    { name:'Couch Stretch',       description:'Flexor do quadril apoiado na parede.',                                  muscles:'Psoas, ilíaco, reto femoral.',                        notes:'Essencial para quem fica muito sentado; melhora postura do agachamento.' },
    { name:'Hamstring Stretch',   description:'Alongamento de isquiotibiais deitado ou em pé.',                       muscles:'Isquiotibiais, panturrilha.' },
    { name:'Lat Stretch (banded)',description:'Alongamento de dorsais com elástico.',                                  muscles:'Latíssimo do dorso, grande redondo.',                 notes:'Melhora posicionamento do overhead squat e clean.' },
    { name:'Shoulder Distraction (banded)',description:'Distração de ombro com elástico.',                            muscles:'Cápsula articular do ombro, manguito rotador.' },
    { name:'Hip Flexor Stretch',  description:'Alongamento de flexores do quadril em avanço.',                        muscles:'Psoas, ilíaco, reto femoral.' },
    { name:'Thoracic Extension',  description:'Extensão torácica sobre rolo ou barra.',                               muscles:'Coluna torácica.',                                    notes:'Alivia rigidez causada por tempo excessivo sentado; melhora overhead.' },
    { name:'Ankle Stretch',       description:'Alongamento de tornozelo.',                                             muscles:'Gastrocnêmio, sóleo, cápsula articular.',             notes:'Melhora profundidade do agachamento ao aumentar dorsiflexão.' },
    { name:'Quad Stretch',        description:'Alongamento de quadríceps em pé ou deitado.',                          muscles:'Reto femoral, vasto lateral, vasto medial.' },
    { name:'Piriformis Stretch',  description:'Figura 4 deitado.',                                                    muscles:'Piriforme, rotadores externos do quadril.',           notes:'Também alivia tensão no nervo ciático.' },
    { name:'Child\'s Pose',       description:'Posição fetal do yoga.',                                               muscles:'Dorsais, glúteos, coluna lombar.' },
    { name:'Downward Dog',        description:'Cachorro olhando para baixo.',                                          muscles:'Isquiotibiais, panturrilha, dorsais, ombros.' },
    { name:'Low Lunge',           description:'Avanço baixo com joelho no chão.',                                     muscles:'Psoas, ilíaco, flexores do quadril da perna de trás.' },
    { name:'Wrist Stretch',       description:'Extensão e flexão de punho.',                                           muscles:'Flexores e extensores do antebraço.',                 notes:'Importante antes de clean, front rack, handstand e ring work.' },
    { name:'Neck Stretch',        description:'Inclinação e rotação lateral da cabeça.',                              muscles:'Trapézio superior, esternocleidomastoideo, escalenos.' },
    { name:'Hip Distraction (banded)',description:'Distração de quadril com elástico.',                               muscles:'Cápsula articular do quadril.',                       notes:'Reduz compressão articular e aumenta amplitude; eficaz para dor de quadril.' },
    { name:'Foam Roll',           description:'Automassagem com rolo de espuma.',                                      muscles:'Liberação miofascial; músculos variados conforme posição.', notes:'30–60 segundos por área; pause sobre pontos de tensão.' },
    { name:'Hip 90/90',           description:'Sentado com quadris em 90° de rotação interna e externa alternados.', muscles:'Rotadores internos e externos do quadril.',            notes:'Muito eficaz para melhorar rotação interna e externa do quadril.' },
  ],
};

// ── Registry init ─────────────────────────────────────────────────────────────
function initRegistry() {
  const migrateEx = ex => typeof ex === 'string' ? { name: ex } : ex;
  const existing  = loadRegistry();
  if (existing && typeof existing === 'object') {
    const reg = {};
    let needsSave = false;
    BLOCK_ORDER.forEach(n => {
      if (!existing[n]) { reg[n] = []; needsSave = true; return; }
      const raw = Array.isArray(existing[n]) ? existing[n] : [];
      if (raw.some(e => typeof e === 'string')) needsSave = true;
      reg[n] = raw.map(migrateEx);
    });
    if (needsSave) saveRegistry(reg);
    return reg;
  }
  const reg = {};
  BLOCK_ORDER.forEach(n => { reg[n] = []; });
  saveRegistry(reg);
  return reg;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ExerciciosTab() {
  const [registry, setRegistryState] = useState(() => initRegistry());
  const [selBlock, setSelBlock]       = useState(null);
  const [pane,     setPane]           = useState(0);
  const [adding,   setAdding]         = useState(false);
  const [newName,  setNewName]        = useState('');
  const [addError, setAddError]       = useState('');
  const [detail,   setDetail]         = useState(null);
  const [dragFrom, setDragFrom]       = useState(null);
  const [dragOver, setDragOver]       = useState(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const isMobile = useIsMobile();

  const blockColor = name => ECOL[name]?.text || MUTED;
  const persist    = reg  => { saveRegistry(reg); APP_CONFIG.blockNames = ['-', ...BLOCK_ORDER]; };
  const blocksOf   = name => BLOCK_ORDER.filter(b => (registry[b] || []).some(e => getExName(e) === name));

  const allEx = useMemo(() => {
    const map = {};
    BLOCK_ORDER.forEach(b => {
      (registry[b] || []).forEach(ex => { const n = getExName(ex); if (!map[n]) map[n] = ex; });
    });
    return Object.values(map).sort((a, b) => getExName(a).localeCompare(getExName(b), 'pt'));
  }, [registry]);

  const exsForPane = useMemo(() => (
    selBlock === null ? allEx : (registry[selBlock] || [])
  ), [registry, selBlock, allEx]);

  // ── Navigation ──────────────────────────────────────────────────────────────
  const goToType = block => {
    setSelBlock(block);
    setDetail(null);
    setAdding(false); setNewName(''); setAddError('');
    if (isMobile) setPane(1);
  };

  const goToEx = exObj => {
    const name = getExName(exObj);
    const blocks = blocksOf(name);
    const o = typeof exObj === 'object' ? exObj : {};
    setDetail({
      origName: name, name, selectedBlocks: [...blocks],
      videoUrl:       o.videoUrl       || '',
      videoPublished: o.videoPublished === true,
      description:    o.description    || '',
      muscles:        o.muscles        || '',
      notes:          o.notes          || '',
    });
    if (isMobile) setPane(2);
  };

  const goBack = () => {
    if (pane === 2) { setPane(1); setDetail(null); }
    else if (pane === 1) { setPane(0); setSelBlock(null); setDetail(null); }
  };

  // ── Operations ──────────────────────────────────────────────────────────────
  const confirmAdd = () => {
    const name = newName.trim();
    if (!name || !selBlock) return;
    if ((registry[selBlock] || []).some(e => getExName(e) === name)) {
      setAddError(`"${name}" já existe em ${selBlock}`); return;
    }
    const reg = { ...registry, [selBlock]: [...(registry[selBlock] || []), { name }] };
    setRegistryState(reg); persist(reg);
    setNewName(''); setAdding(false); setAddError('');
    goToEx({ name });
  };

  const saveDetail = () => {
    if (!detail) return;
    const { origName, name: raw, videoUrl, videoPublished, description, muscles, notes, selectedBlocks } = detail;
    const name = raw.trim();
    if (!name) return;
    if (selectedBlocks.length === 0) {
      setDetail(p => ({ ...p, error: 'Selecione pelo menos um tipo' })); return;
    }
    const newEx = { name };
    if (videoUrl?.trim())    newEx.videoUrl       = videoUrl.trim();
    if (videoPublished)      newEx.videoPublished = true;
    if (description?.trim()) newEx.description    = description.trim();
    if (muscles?.trim())     newEx.muscles        = muscles.trim();
    if (notes?.trim())       newEx.notes          = notes.trim();
    const reg = { ...registry };
    blocksOf(origName).forEach(b => { reg[b] = (reg[b] || []).filter(e => getExName(e) !== origName); });
    selectedBlocks.forEach(b => {
      if (!(reg[b] || []).some(e => getExName(e) === name)) reg[b] = [...(reg[b] || []), newEx];
      else reg[b] = (reg[b] || []).map(e => getExName(e) === name ? newEx : e);
    });
    setRegistryState(reg); persist(reg);
    setDetail(p => ({ ...p, origName: name, saved: true }));
    setTimeout(() => setDetail(p => p ? { ...p, saved: false } : p), 1500);
  };

  const deleteEx = name => {
    const inBlocks = blocksOf(name);
    if (!window.confirm(`Remover "${name}" de ${inBlocks.length} tipo${inBlocks.length > 1 ? 's' : ''}?`)) return;
    const reg = { ...registry };
    inBlocks.forEach(b => { reg[b] = (reg[b] || []).filter(e => getExName(e) !== name); });
    setRegistryState(reg); persist(reg);
    setDetail(null);
    if (isMobile) setPane(1);
  };

  const reorderExs = (from, to) => {
    if (from == null || from === to || !selBlock) return;
    const exs = [...registry[selBlock]];
    const moved = exs.splice(from, 1)[0]; exs.splice(to, 0, moved);
    const reg = { ...registry, [selBlock]: exs };
    setRegistryState(reg); persist(reg);
  };

  const sortAZ = () => {
    if (!selBlock) return;
    const exs = [...(registry[selBlock] || [])].sort((a, b) => getExName(a).localeCompare(getExName(b), 'pt'));
    const reg = { ...registry, [selBlock]: exs };
    setRegistryState(reg); persist(reg);
  };

  const importBase = () => {
    const total = Object.values(BASE_EXERCISES).reduce((s, arr) => s + arr.length, 0);
    if (!window.confirm(`Importar ${total} exercícios base?\n\nVerifique que o registro está vazio antes de confirmar.\nExercícios com nomes já existentes em cada bloco serão ignorados.`)) return;
    const reg = { ...registry };
    Object.entries(BASE_EXERCISES).forEach(([block, exs]) => {
      const existing     = reg[block] || [];
      const existingKeys = new Set(existing.map(e => getExName(e).toLowerCase()));
      exs.forEach(ex => { if (!existingKeys.has(ex.name.toLowerCase())) existing.push(ex); });
      reg[block] = existing;
    });
    setRegistryState(reg); persist(reg);
  };

  const saveConfig = () => {
    const savedSettings = loadSettings();
    const exportCfg = {
      appTitle: APP_CONFIG.appTitle, appDescription: APP_CONFIG.appDescription || '',
      scheduleTitle: APP_CONFIG.scheduleTitle || APP_CONFIG.appTitle,
      leaderboardTitle: APP_CONFIG.leaderboardTitle || APP_CONFIG.appTitle,
      logo: APP_CONFIG.logo || 'icon-192.png',
      fontFamily: APP_CONFIG.fontFamily || "'Arial Black',Arial,sans-serif",
      googleFontsUrl: APP_CONFIG.googleFontsUrl || '',
      themeAccent: APP_CONFIG.themeAccent, themeAccentText: APP_CONFIG.themeAccentText,
      gymName: APP_CONFIG.gymName, fontScale: savedSettings.fontScale || 1.5,
      logoScale: APP_CONFIG.logoScale || 1,
      zoneScales: APP_CONFIG.zoneScales || [1, 1, 1],
      blockTitleScales: APP_CONFIG.blockTitleScales || [1, 1, 1],
      mobileEaglesBg: APP_CONFIG.mobileEaglesBg, mobileMegaManBg: APP_CONFIG.mobileMegaManBg,
      mobileExerciseNoteColor: APP_CONFIG.mobileExerciseNoteColor,
      restDayLabel: APP_CONFIG.restDayLabel, mobileWeeklyLabels: APP_CONFIG.mobileWeeklyLabels,
      exportScale: savedSettings.exportScale || 2,
      blockColors: APP_CONFIG.blockColors || {}, blockNames: ['-', ...BLOCK_ORDER],
      athleteLevels: APP_CONFIG.athleteLevels, athleteGoals: APP_CONFIG.athleteGoals,
      exerciseRegistry: registry, ...savedSettings,
    };
    const raw = window.prompt('Nome do arquivo (sem extensão):', 'config');
    if (raw === null) return;
    const fname = (raw.trim().replace(/[^a-zA-Z0-9_-]/g, '-') || 'config');
    const blob  = new Blob([JSON.stringify(exportCfg, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.download = fname + '.json';
    a.href = URL.createObjectURL(blob); a.click(); URL.revokeObjectURL(a.href);
  };

  // ── Section label helper ────────────────────────────────────────────────────
  const SLabel = ({ children }) => (
    <div style={{ fontSize: 9, fontWeight: 700, color: DIM, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>{children}</div>
  );

  // ── Pane 1: Type list ───────────────────────────────────────────────────────
  const renderPane1 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto', flex: isMobile ? undefined : 1 }}>
      {(() => {
        const isSel = selBlock === null;
        return (
          <div onClick={() => goToType(null)}
            style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '11px 14px', background: isSel ? STONE : 'transparent', borderLeft: `3px solid ${isSel ? 'var(--theme-accent)' : 'transparent'}`, borderBottom: `1px solid ${DIV}`, cursor: 'pointer' }}>
            <i className="ti ti-list" style={{ color: isSel ? 'var(--theme-accent)' : MUTED, fontSize: 13 }} />
            <span style={{ flex: 1, fontSize: 11, fontWeight: 700, color: isSel ? CREAM : SUB, textTransform: 'uppercase', letterSpacing: '.05em' }}>Todos</span>
            <span style={{ fontSize: 11, color: DIM }}>{allEx.length}</span>
          </div>
        );
      })()}
      {BLOCK_ORDER.map(name => {
        const col   = blockColor(name);
        const cnt   = (registry[name] || []).length;
        const isSel = selBlock === name;
        return (
          <div key={name} onClick={() => goToType(name)}
            style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '11px 14px', background: isSel ? STONE : 'transparent', borderLeft: `3px solid ${isSel ? col : 'transparent'}`, borderBottom: `1px solid ${DIV}`, cursor: 'pointer', transition: 'background .1s' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: col, flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 11, fontWeight: 700, color: isSel ? CREAM : SUB, textTransform: 'uppercase', letterSpacing: '.05em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
            <span style={{ fontSize: 11, color: isSel ? MUTED : DIM }}>{cnt}</span>
            {isMobile && <i className="ti ti-chevron-right" style={{ color: DIM, fontSize: 12, flexShrink: 0 }} />}
          </div>
        );
      })}
    </div>
  );

  // ── Pane 2: Exercise list ───────────────────────────────────────────────────
  const renderPane2 = () => {
    const blockCol = selBlock ? blockColor(selBlock) : MUTED;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderBottom: `1px solid ${DIV}`, flexShrink: 0 }}>
          {selBlock === null
            ? <><i className="ti ti-list" style={{ color: MUTED, fontSize: 13 }} /><span style={{ flex: 1, fontSize: 11, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '.06em' }}>Todos · {allEx.length}</span></>
            : <><span style={{ width: 8, height: 8, borderRadius: '50%', background: blockCol, flexShrink: 0 }} /><span style={{ flex: 1, fontSize: 11, fontWeight: 700, color: blockCol, textTransform: 'uppercase', letterSpacing: '.06em' }}>{selBlock}</span><span style={{ fontSize: 11, color: DIM }}>{exsForPane.length}</span></>
          }
          {selBlock && (
            <button type="button" className="b bsm" style={{ padding: '3px 6px' }} onClick={sortAZ} title="A→Z">
              <i className="ti ti-sort-ascending-letters" />
            </button>
          )}
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {exsForPane.length === 0
            ? <div style={{ padding: 20, textAlign: 'center', color: DIM, fontSize: 12, fontStyle: 'italic' }}>
                {selBlock ? 'Nenhum exercício. Adicione abaixo.' : 'Nenhum exercício cadastrado.'}
              </div>
            : exsForPane.map((ex, ei) => {
                const name       = getExName(ex);
                const hasVideo   = typeof ex === 'object' && !!ex.videoUrl;
                const isPubl     = typeof ex === 'object' && ex.videoPublished === true;
                const isActive   = detail?.origName === name;
                const isDragOver = dragOver === ei;
                const exTags     = selBlock === null ? blocksOf(name) : [];
                return (
                  <div key={ei}
                    draggable={selBlock !== null}
                    onDragStart={selBlock !== null ? () => setDragFrom(ei) : undefined}
                    onDragEnd={selBlock !== null ? () => { setDragFrom(null); setDragOver(null); } : undefined}
                    onDragOver={selBlock !== null ? e => { e.preventDefault(); setDragOver(ei); } : undefined}
                    onDrop={selBlock !== null ? e => { e.preventDefault(); reorderExs(dragFrom, ei); setDragOver(null); } : undefined}
                    onClick={() => goToEx(ex)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderBottom: `1px solid ${DIV}`, background: isActive ? STONE : (isDragOver ? '#1a1410' : 'transparent'), borderLeft: `2px solid ${isActive ? 'var(--theme-accent)' : 'transparent'}`, cursor: 'pointer', transition: 'background .1s' }}>
                    {selBlock !== null && <i className="ti ti-grip-vertical" style={{ color: DIM, fontSize: 13, flexShrink: 0, cursor: 'grab' }} />}
                    <span style={{ flex: 1, fontSize: 13, color: isActive ? CREAM : SUB, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                    {selBlock === null && exTags.length > 0 && (
                      <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                        {exTags.slice(0, 2).map(t => {
                          const c = blockColor(t);
                          return <span key={t} style={{ fontSize: 9, fontWeight: 700, padding: '1px 4px', background: c + '22', color: c, textTransform: 'uppercase', letterSpacing: '.03em' }}>{t}</span>;
                        })}
                        {exTags.length > 2 && <span style={{ fontSize: 9, color: DIM }}>+{exTags.length - 2}</span>}
                      </div>
                    )}
                    {hasVideo && <i className="ti ti-video" style={{ color: isPubl ? '#4ac8c0' : DIM, fontSize: 11, flexShrink: 0 }} />}
                    <i className="ti ti-chevron-right" style={{ color: DIM, fontSize: 12, flexShrink: 0 }} />
                  </div>
                );
              })
          }
          {selBlock !== null && (
            <div style={{ borderTop: `1px solid ${DIV}`, padding: '10px 12px' }}>
              {addError && <div style={{ fontSize: 11, color: '#e05848', marginBottom: 6 }}>{addError}</div>}
              {adding ? (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input autoFocus className="ex-input" placeholder="Nome do exercício..." value={newName} style={{ flex: 1 }}
                    onChange={e => { setNewName(e.target.value); setAddError(''); }}
                    onKeyDown={e => { if (e.key === 'Enter') confirmAdd(); if (e.key === 'Escape') { setAdding(false); setNewName(''); setAddError(''); } }} />
                  <button type="button" className="b bsec" style={{ padding: '6px 9px', flexShrink: 0 }} onClick={confirmAdd} disabled={!newName.trim()}><i className="ti ti-check" /></button>
                  <button type="button" className="b bd" style={{ padding: '6px 9px', flexShrink: 0 }} onClick={() => { setAdding(false); setNewName(''); setAddError(''); }}><i className="ti ti-x" /></button>
                </div>
              ) : (
                <button type="button" className="b bsec" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setAdding(true)}>
                  <i className="ti ti-plus" /> Adicionar exercício
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── Pane 3: Exercise detail ─────────────────────────────────────────────────
  const renderPane3 = () => {
    if (!detail) return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: DIM, fontSize: 12, fontStyle: 'italic', padding: 20, textAlign: 'center' }}>
        Selecione um exercício para editar
      </div>
    );

    const toggleTag = block => {
      setDetail(p => {
        const has = p.selectedBlocks.includes(block);
        return { ...p, selectedBlocks: has ? p.selectedBlocks.filter(b => b !== block) : [...p.selectedBlocks, block], error: undefined, saved: false };
      });
    };

    const videoId = extractYouTubeId(detail.videoUrl);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ padding: '9px 14px', borderBottom: `1px solid ${DIV}`, flexShrink: 0 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: DIM, textTransform: 'uppercase', letterSpacing: '.07em' }}>Exercício</span>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Name */}
          <div>
            <SLabel>Nome</SLabel>
            <input className="ex-input" value={detail.name}
              onChange={e => setDetail(p => ({ ...p, name: e.target.value, saved: false, error: undefined }))}
              onKeyDown={e => { if (e.key === 'Enter') saveDetail(); }}
            />
          </div>

          {/* Type tags */}
          <div>
            <SLabel>Tipos</SLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {BLOCK_ORDER.map(block => {
                const col   = blockColor(block);
                const isSel = detail.selectedBlocks.includes(block);
                return (
                  <span key={block} onClick={() => toggleTag(block)}
                    style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', cursor: 'pointer', letterSpacing: '.04em', textTransform: 'uppercase', background: isSel ? col : 'transparent', color: isSel ? BG : col, border: `1px solid ${isSel ? col : col + '55'}`, transition: 'all .1s', userSelect: 'none' }}>
                    {block}
                  </span>
                );
              })}
            </div>
            {detail.error && <div style={{ fontSize: 11, color: '#e05848', marginTop: 6 }}>{detail.error}</div>}
          </div>

          {/* Video URL + published toggle */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <SLabel>Vídeo (YouTube)</SLabel>
              <button type="button"
                onClick={() => setDetail(p => ({ ...p, videoPublished: !p.videoPublished, saved: false }))}
                style={{ fontSize: 9, fontWeight: 900, padding: '3px 10px', letterSpacing: '.08em', textTransform: 'uppercase', border: 'none', cursor: 'pointer', transition: 'all .15s', background: detail.videoPublished ? '#4ac8c0' : DIM, color: detail.videoPublished ? BG : MUTED }}>
                {detail.videoPublished ? 'ON' : 'OFF'}
              </button>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input className="ex-input" placeholder="https://youtu.be/..." value={detail.videoUrl} style={{ flex: 1 }}
                onChange={e => setDetail(p => ({ ...p, videoUrl: e.target.value, saved: false }))}
              />
              {videoId && (
                <button type="button" className="b bsm" style={{ flexShrink: 0, padding: '0 12px' }} title="Pré-visualizar vídeo" onClick={() => setShowVideoModal(true)}>
                  <i className="ti ti-player-play" />
                </button>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <SLabel>Descrição</SLabel>
            <textarea className="ex-input" placeholder="Descrição breve do movimento..." value={detail.description} rows={2}
              style={{ resize: 'vertical', fontFamily: 'inherit' }}
              onChange={e => setDetail(p => ({ ...p, description: e.target.value, saved: false }))}
            />
          </div>

          {/* Muscles */}
          <div>
            <SLabel>Músculo(s) Alvo(s)</SLabel>
            <input className="ex-input" placeholder="Ex: Quadríceps, glúteos, isquiotibiais." value={detail.muscles}
              onChange={e => setDetail(p => ({ ...p, muscles: e.target.value, saved: false }))}
            />
          </div>

          {/* Notes / Detalhe */}
          <div>
            <SLabel>Detalhe</SLabel>
            <textarea className="ex-input" placeholder="Observações, cuidados ou pontos de atenção..." value={detail.notes} rows={2}
              style={{ resize: 'vertical', fontFamily: 'inherit' }}
              onChange={e => setDetail(p => ({ ...p, notes: e.target.value, saved: false }))}
            />
          </div>
        </div>

        <div style={{ borderTop: `1px solid ${DIV}`, padding: '10px 14px', display: 'flex', gap: 8, flexShrink: 0 }}>
          <button type="button" className="b bsec" style={{ flex: 1 }} onClick={saveDetail}>
            {detail.saved ? <><i className="ti ti-check" /> Salvo</> : 'Salvar'}
          </button>
          <button type="button" className="b bd" style={{ padding: '0 12px' }} onClick={() => deleteEx(detail.origName)}>
            <i className="ti ti-trash" />
          </button>
        </div>
      </div>
    );
  };

  // ── Video modal ─────────────────────────────────────────────────────────────
  const videoId = detail ? extractYouTubeId(detail.videoUrl) : null;
  const VideoModal = showVideoModal && videoId ? (
    <div className="settings-overlay" onClick={() => setShowVideoModal(false)}>
      <div className="settings-modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
        <div className="settings-drag-hdr">
          <span style={{ fontSize: 13, fontWeight: 700, color: CREAM }}>{detail.name}</span>
          <button type="button" className="b bd bsm" style={{ marginLeft: 'auto', padding: '3px 8px', minHeight: 24 }} onClick={() => setShowVideoModal(false)}>
            <i className="ti ti-x" />
          </button>
        </div>
        <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', background: '#000' }}>
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&autoplay=1`}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
            allowFullScreen
            allow="autoplay"
          />
        </div>
      </div>
    </div>
  ) : null;

  // ── Footer ──────────────────────────────────────────────────────────────────
  const Footer = () => (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: BG, borderTop: `1px solid ${DIV}`, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, zIndex: 50 }}>
      <span style={{ fontSize: 11, color: DIM, flex: 1 }}>{BLOCK_ORDER.length} tipos · {allEx.length} exercícios</span>
      <button type="button" className="b bd bsm" onClick={importBase} title="Importar lista base de exercícios">
        <i className="ti ti-database-import" /> Importar base
      </button>
      <button type="button" className="b bsec" onClick={saveConfig}>
        <i className="ti ti-download" /> Salvar config.json
      </button>
    </div>
  );

  // ── Mobile layout ───────────────────────────────────────────────────────────
  if (isMobile) {
    const BackBtn = ({ label }) => (
      <button type="button" className="rp-mobile-back" onClick={goBack}>
        <i className="ti ti-chevron-left" /> {label}
      </button>
    );
    return (
      <div style={{ background: BG, minHeight: '100%', paddingBottom: 70 }}>
        {pane === 0 && renderPane1()}
        {pane === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
            <BackBtn label="Tipos" />
            {renderPane2()}
          </div>
        )}
        {pane === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
            <BackBtn label={selBlock || 'Todos'} />
            {renderPane3()}
          </div>
        )}
        <Footer />
        {VideoModal}
      </div>
    );
  }

  // ── Desktop layout ──────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 120px)', minHeight: 400, background: BG }}>
      <div style={{ width: 190, flexShrink: 0, borderRight: `1px solid ${DIV}`, overflowY: 'auto', paddingBottom: 60 }}>
        {renderPane1()}
      </div>
      <div style={{ width: 250, flexShrink: 0, borderRight: `1px solid ${DIV}`, display: 'flex', flexDirection: 'column' }}>
        {renderPane2()}
      </div>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', paddingBottom: 60 }}>
        {renderPane3()}
      </div>
      <Footer />
      {VideoModal}
    </div>
  );
}

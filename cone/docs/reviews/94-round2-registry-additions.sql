-- #94 round 2 — add missing exercises to the registry (prod)
-- ============================================================================
-- ⚠️ Keep the title on LINE 1: the Supabase SQL editor autofills the snippet
-- name from the first line, and a divider there leaves it "Untitled".
-- ============================================================================
-- Run in the Supabase SQL editor (prod). Adds 71 entries across
-- 6 categories, per the coach's round-2 decisions in 94-round2-decisions.md.
--
-- SAFE TO RE-RUN: dedups by lower(name) and prefers the EXISTING row, so it can
-- never duplicate or overwrite an entry you already have. Entries land sorted
-- alphabetically within each category (the registry's canonical order, #55/#87).

UPDATE exercise_registry SET value = value || jsonb_build_object(

  'Core', (
    SELECT jsonb_agg(e ORDER BY lower(e->>'name'))
    FROM (
      SELECT DISTINCT ON (lower(e->>'name')) e
      FROM (
        SELECT jsonb_array_elements(value->'Core') AS e, 0 AS rank
        UNION ALL SELECT jsonb_array_elements($json$[
 {
  "name": "Abs Infra",
  "description": "Abdominal infra: elevação de pernas com a lombar apoiada.",
  "muscles": "Reto abdominal (porção inferior), flexores do quadril."
 },
 {
  "name": "Abs Med Ball",
  "description": "Abdominal segurando ou passando a medicine ball.",
  "muscles": "Reto abdominal, oblíquos."
 },
 {
  "name": "Abs Remador",
  "description": "Abdominal em movimento de remada — tronco e pernas fecham juntos.",
  "muscles": "Reto abdominal, flexores do quadril."
 },
 {
  "name": "Abs KB Unilateral",
  "description": "Abdominal com kettlebell sustentado em um dos lados.",
  "muscles": "Oblíquos, reto abdominal, core anti-lateral."
 },
 {
  "name": "KB Oblíquo",
  "description": "Flexão lateral de tronco com kettlebell em uma das mãos.",
  "muscles": "Oblíquos, quadrado lombar."
 },
 {
  "name": "KB Over Leg",
  "description": "Passagem do kettlebell por cima da perna, no solo.",
  "muscles": "Oblíquos, core, ombros."
 },
 {
  "name": "Russian Twist KB",
  "description": "Rotação de tronco sentado, com kettlebell.",
  "muscles": "Oblíquos, reto abdominal."
 },
 {
  "name": "Elevação de Joelho 2 KB",
  "description": "Elevação de joelhos sustentando dois kettlebells.",
  "muscles": "Flexores do quadril, core, antebraços."
 },
 {
  "name": "Ponte Unipodal",
  "description": "Ponte de glúteo apoiada em uma perna só.",
  "muscles": "Glúteos, isquiotibiais, core."
 },
 {
  "name": "Prancha Dinâmica",
  "description": "Prancha alternando apoio entre antebraços e mãos.",
  "muscles": "Core, ombros, tríceps."
 },
 {
  "name": "Touch Heel",
  "description": "Deitado, toques alternados nos calcanhares.",
  "muscles": "Oblíquos."
 },
 {
  "name": "Lenhador",
  "description": "Movimento diagonal de tronco, como golpe de machado.",
  "muscles": "Oblíquos, core, ombros."
 },
 {
  "name": "Perdigueiro",
  "description": "Em quatro apoios, estende braço e perna opostos.",
  "muscles": "Core, lombar, glúteos."
 }
]$json$::jsonb), 1
      ) u ORDER BY lower(e->>'name'), rank
    ) d
  ),

  'LPO', (
    SELECT jsonb_agg(e ORDER BY lower(e->>'name'))
    FROM (
      SELECT DISTINCT ON (lower(e->>'name')) e
      FROM (
        SELECT jsonb_array_elements(value->'LPO') AS e, 0 AS rank
        UNION ALL SELECT jsonb_array_elements($json$[
 {
  "name": "Jerk Balance",
  "description": "Exercício técnico de recepção do jerk, com passada à frente.",
  "muscles": "Ombros, tríceps, core, pernas."
 },
 {
  "name": "Snatch High Pull",
  "description": "Puxada alta com pegada de arranco, cotovelos acima da barra.",
  "muscles": "Trapézio, deltoides, dorsais, posterior."
 },
 {
  "name": "Clean High Pull",
  "description": "Puxada alta com pegada de arremesso.",
  "muscles": "Trapézio, deltoides, dorsais, posterior."
 },
 {
  "name": "Cluster",
  "description": "Squat clean seguido de thruster, em um movimento contínuo.",
  "muscles": "Full body: pernas, ombros, core."
 },
 {
  "name": "Squat Jerk",
  "description": "Jerk com recepção em agachamento completo.",
  "muscles": "Ombros, tríceps, quadríceps, core."
 },
 {
  "name": "Snatch Push Press",
  "description": "Push press com pegada larga de arranco.",
  "muscles": "Ombros, tríceps, core."
 },
 {
  "name": "Tall Snatch",
  "description": "Arranco a partir da posição alta, sem impulso de perna.",
  "muscles": "Trapézio, deltoides, core."
 },
 {
  "name": "Drop Balance",
  "description": "Exercício técnico de queda sob a barra, sem impulso.",
  "muscles": "Ombros, core, quadríceps."
 },
 {
  "name": "Drop Jerk",
  "description": "Exercício técnico de recepção do jerk, sem impulso.",
  "muscles": "Ombros, tríceps, core."
 },
 {
  "name": "Ground to Overhead (GTOH)",
  "description": "Levar a barra do solo até acima da cabeça, método livre.",
  "muscles": "Full body: pernas, dorsais, ombros."
 },
 {
  "name": "DB Hang Snatch",
  "description": "Arranco com haltere a partir do hang.",
  "muscles": "Posterior, trapézio, ombros."
 },
 {
  "name": "DB Snatch",
  "description": "Arranco com um haltere, do solo até acima da cabeça.",
  "muscles": "Posterior, trapézio, ombros, core."
 },
 {
  "name": "Dual DB Snatch",
  "description": "Arranco com dois halteres simultaneamente.",
  "muscles": "Posterior, trapézio, ombros, core."
 },
 {
  "name": "Dual DB Squat Clean",
  "description": "Clean com dois halteres, recepção em agachamento completo.",
  "muscles": "Quadríceps, glúteos, trapézio, ombros."
 }
]$json$::jsonb), 1
      ) u ORDER BY lower(e->>'name'), rank
    ) d
  ),

  'Força', (
    SELECT jsonb_agg(e ORDER BY lower(e->>'name'))
    FROM (
      SELECT DISTINCT ON (lower(e->>'name')) e
      FROM (
        SELECT jsonb_array_elements(value->'Força') AS e, 0 AS rank
        UNION ALL SELECT jsonb_array_elements($json$[
 {
  "name": "DB Bench Press",
  "description": "Supino executado com halteres.",
  "muscles": "Peitoral, deltoide anterior, tríceps."
 },
 {
  "name": "Dual DB Strict Press",
  "description": "Desenvolvimento estrito com dois halteres.",
  "muscles": "Deltoides, tríceps, core."
 },
 {
  "name": "Dual DB Push Press",
  "description": "Push press com dois halteres.",
  "muscles": "Deltoides, tríceps, pernas, core."
 },
 {
  "name": "KB Deadlift",
  "description": "Levantamento terra com kettlebell.",
  "muscles": "Posterior, glúteos, lombar."
 },
 {
  "name": "DB/KB Deadlift",
  "description": "Levantamento terra com halteres ou kettlebells.",
  "muscles": "Posterior, glúteos, lombar."
 },
 {
  "name": "Stiff Dual DB/KB",
  "description": "Stiff (terra romeno) com dois halteres ou kettlebells.",
  "muscles": "Isquiotibiais, glúteos, lombar."
 },
 {
  "name": "Landmine Press",
  "description": "Desenvolvimento unilateral com a barra ancorada no landmine.",
  "muscles": "Deltoide anterior, tríceps, core."
 },
 {
  "name": "Wall Sit",
  "description": "Isometria sentado contra a parede, joelhos a 90°.",
  "muscles": "Quadríceps, glúteos."
 },
 {
  "name": "Goblet Squat",
  "description": "Agachamento segurando um peso junto ao peito.",
  "muscles": "Quadríceps, glúteos, core."
 }
]$json$::jsonb), 1
      ) u ORDER BY lower(e->>'name'), rank
    ) d
  ),

  'Acessórios', (
    SELECT jsonb_agg(e ORDER BY lower(e->>'name'))
    FROM (
      SELECT DISTINCT ON (lower(e->>'name')) e
      FROM (
        SELECT jsonb_array_elements(value->'Acessórios') AS e, 0 AS rank
        UNION ALL SELECT jsonb_array_elements($json$[
 {
  "name": "DB Step Box Up",
  "description": "Subida na caixa segurando halteres.",
  "muscles": "Quadríceps, glúteos, core."
 },
 {
  "name": "KB Step-up",
  "description": "Subida na caixa segurando kettlebell.",
  "muscles": "Quadríceps, glúteos, core."
 },
 {
  "name": "KB Box Step",
  "description": "Passada na caixa com kettlebell.",
  "muscles": "Quadríceps, glúteos, core."
 },
 {
  "name": "Step Box",
  "description": "Subida e descida da caixa, sem carga.",
  "muscles": "Quadríceps, glúteos."
 },
 {
  "name": "KB Step Down",
  "description": "Descida controlada da caixa com kettlebell.",
  "muscles": "Quadríceps, glúteos, core."
 },
 {
  "name": "DB Cossack Squat",
  "description": "Agachamento cossaco segurando haltere.",
  "muscles": "Adutores, quadríceps, glúteos."
 },
 {
  "name": "KB Cossack Squat",
  "description": "Agachamento cossaco segurando kettlebell.",
  "muscles": "Adutores, quadríceps, glúteos."
 },
 {
  "name": "DB Hip Thruster",
  "description": "Elevação de quadril com haltere sobre a pelve.",
  "muscles": "Glúteos, isquiotibiais."
 },
 {
  "name": "DB OH Lunge",
  "description": "Afundo com haltere sustentado acima da cabeça.",
  "muscles": "Quadríceps, glúteos, ombros, core."
 },
 {
  "name": "KB OH Lunge",
  "description": "Afundo com kettlebell sustentado acima da cabeça.",
  "muscles": "Quadríceps, glúteos, ombros, core."
 },
 {
  "name": "DB Lateral Raise",
  "description": "Elevação lateral com halteres.",
  "muscles": "Deltoide medial."
 },
 {
  "name": "Front Rack Lunge",
  "description": "Afundo com a barra na posição de front rack.",
  "muscles": "Quadríceps, glúteos, core."
 },
 {
  "name": "Arnold Press",
  "description": "Desenvolvimento com halteres e rotação dos punhos.",
  "muscles": "Deltoides (todas as porções), tríceps."
 },
 {
  "name": "Gorila Row",
  "description": "Remada alternada com kettlebells no solo, postura de gorila.",
  "muscles": "Dorsais, bíceps, core."
 },
 {
  "name": "Upright Row",
  "description": "Remada alta com barra ou halteres junto ao corpo.",
  "muscles": "Deltoide medial, trapézio."
 },
 {
  "name": "Front Plate Raise",
  "description": "Elevação frontal segurando uma anilha.",
  "muscles": "Deltoide anterior."
 },
 {
  "name": "Dumbbell Lat Pullover",
  "description": "Pullover com haltere, deitado no banco.",
  "muscles": "Dorsais, peitoral, serrátil."
 },
 {
  "name": "Single Leg Knee Extension",
  "description": "Extensão de joelho unilateral.",
  "muscles": "Quadríceps."
 },
 {
  "name": "Rower Hamstring Curl",
  "description": "Flexão de joelhos usando o remo como deslizante.",
  "muscles": "Isquiotibiais, glúteos."
 },
 {
  "name": "Dead March",
  "description": "Caminhada com carga acima da cabeça ou no rack, tronco rígido.",
  "muscles": "Core, ombros, pernas."
 }
]$json$::jsonb), 1
      ) u ORDER BY lower(e->>'name'), rank
    ) d
  ),

  'Skill', (
    SELECT jsonb_agg(e ORDER BY lower(e->>'name'))
    FROM (
      SELECT DISTINCT ON (lower(e->>'name')) e
      FROM (
        SELECT jsonb_array_elements(value->'Skill') AS e, 0 AS rank
        UNION ALL SELECT jsonb_array_elements($json$[
 {
  "name": "Push-up",
  "description": "Flexão de braço no solo, corpo alinhado.",
  "muscles": "Peitoral, tríceps, deltoide anterior, core."
 },
 {
  "name": "Hand Release Push-up",
  "description": "Flexão com as mãos saindo do solo na descida.",
  "muscles": "Peitoral, tríceps, deltoide anterior."
 },
 {
  "name": "Burpee Broad Jump",
  "description": "Burpee seguido de salto horizontal à frente.",
  "muscles": "Full body: pernas, core, ombros."
 },
 {
  "name": "Burpee to Plate",
  "description": "Burpee com as mãos apoiadas na anilha.",
  "muscles": "Full body: peitoral, tríceps, pernas."
 },
 {
  "name": "Box Jump Over",
  "description": "Salto sobre a caixa, passando para o outro lado.",
  "muscles": "Quadríceps, glúteos, panturrilhas."
 },
 {
  "name": "High Box Jump",
  "description": "Salto na caixa alta, foco em altura máxima.",
  "muscles": "Quadríceps, glúteos, panturrilhas."
 },
 {
  "name": "Shoulder Tap",
  "description": "Em prancha alta, toques alternados nos ombros.",
  "muscles": "Core anti-rotação, ombros."
 },
 {
  "name": "Wall Walk",
  "description": "Da prancha, sobe os pés na parede até a parada de mão.",
  "muscles": "Ombros, core, tríceps."
 },
 {
  "name": "Dip Russo",
  "description": "Dip nas argolas com rotação e apoio na região do bíceps.",
  "muscles": "Peitoral, tríceps, deltoides."
 },
 {
  "name": "Pike up Row",
  "description": "Remada em posição de pike.",
  "muscles": "Dorsais, deltoide posterior, core."
 },
 {
  "name": "Scapular Pull-up",
  "description": "Retração escapular pendurado na barra, sem flexionar cotovelos.",
  "muscles": "Trapézio inferior, romboides, dorsais."
 },
 {
  "name": "Strict Chest-to-Bar",
  "description": "Chest-to-bar sem kipping.",
  "muscles": "Dorsais, bíceps, peitoral."
 },
 {
  "name": "Toes to Ring",
  "description": "Toes to bar executado nas argolas.",
  "muscles": "Reto abdominal, dorsais, flexores do quadril."
 },
 {
  "name": "L-Sit Barra",
  "description": "L-sit sustentado na barra fixa.",
  "muscles": "Reto abdominal, flexores do quadril, dorsais."
 }
]$json$::jsonb), 1
      ) u ORDER BY lower(e->>'name'), rank
    ) d
  ),

  'Cardio', (
    SELECT jsonb_agg(e ORDER BY lower(e->>'name'))
    FROM (
      SELECT DISTINCT ON (lower(e->>'name')) e
      FROM (
        SELECT jsonb_array_elements(value->'Cardio') AS e, 0 AS rank
        UNION ALL SELECT jsonb_array_elements($json$[
 {
  "name": "Sled Drag",
  "description": "Puxada do trenó caminhando de costas ou de frente.",
  "muscles": "Posterior, quadríceps, glúteos, core."
 }
]$json$::jsonb), 1
      ) u ORDER BY lower(e->>'name'), rank
    ) d
  )
) WHERE id = 1;

-- Verify: counts per touched category.
SELECT k AS categoria, jsonb_array_length(value->k) AS total
FROM exercise_registry, unnest(ARRAY['Core','LPO','Força','Acessórios','Skill','Cardio']) AS k
WHERE id = 1;

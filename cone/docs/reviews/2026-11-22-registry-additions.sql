-- #211 — add 92 exercise entries + 2 fixes to the registry (prod)
-- ============================================================================
-- Title on LINE 1: Supabase auto-titles an "Untitled query" by sending the WHOLE
-- query to an AI endpoint when you Run it, so a leading comment steers it to this
-- exact name. If the snippet stays "Untitled query", rename it by hand.
-- ============================================================================
-- Run in the Supabase SQL editor (prod). Three statements, in this order:
--   1. rename "DUal KB Overhead Walking" -> "Dual KB Overhead Walking"   (spelling)
--   2. Devil Press: the description now says ONE dumbbell                (the box's usage)
--   3. add 92 entries across 8 categories                  (29 from the 2026-09-20 review,
--      with "Low Snatch" renamed "Low Hang Snatch", + 63 from the 2026-11-22 answers)
-- Source of the text: docs/reviews/2026-11-22-exercise-names-decisions.md (B1, B2, Batch E).
-- Plan: docs/plans/103-registry-names-apply.md. The alias / resolver changes are CODE and
-- ship only AFTER this file has run — run this first, then tell the session.
--
-- SAFE TO RE-RUN: statements 1 and 2 match on the OLD value, so a second run changes
-- nothing; statement 3 dedups by lower(name) and prefers the EXISTING row, so it can never
-- duplicate or overwrite an entry you already have. Entries land sorted alphabetically within
-- each category (the registry's canonical order, #55/#87). Rows keep every other field
-- (videoUrl, notes, defaults, videoPublished).
--
-- ⚠️ The pt-BR description/muscles are DRAFTED, not coach-authored: they are the text athletes
-- see on the exercise detail. Read them in the decision doc before you run this.

-- 1 · spelling: DUal -> Dual (every category; the rows keep their position and fields)
UPDATE exercise_registry SET value = (
  SELECT jsonb_object_agg(x.k, CASE WHEN jsonb_typeof(x.v) = 'array' THEN COALESCE((
    SELECT jsonb_agg(
      CASE WHEN t.e->>'name' = 'DUal KB Overhead Walking'
           THEN jsonb_set(t.e, '{name}', '"Dual KB Overhead Walking"'::jsonb)
           ELSE t.e END
      ORDER BY t.ord)
    FROM jsonb_array_elements(x.v) WITH ORDINALITY AS t(e, ord)
  ), '[]'::jsonb) ELSE x.v END)
  FROM jsonb_each(value) AS x(k, v)
) WHERE id = 1;

-- 2 · Devil Press: one dumbbell (in this box "Devil Press" means a single dumbbell)
UPDATE exercise_registry SET value = (
  SELECT jsonb_object_agg(x.k, CASE WHEN jsonb_typeof(x.v) = 'array' THEN COALESCE((
    SELECT jsonb_agg(
      CASE WHEN t.e->>'name' = 'Devil Press'
           THEN jsonb_set(t.e, '{description}', to_jsonb('Burpee com um halter seguido da elevação do halter acima da cabeça, em um único movimento.'::text))
           ELSE t.e END
      ORDER BY t.ord)
    FROM jsonb_array_elements(x.v) WITH ORDINALITY AS t(e, ord)
  ), '[]'::jsonb) ELSE x.v END)
  FROM jsonb_each(value) AS x(k, v)
) WHERE id = 1;

-- 3 · the 92 entries
UPDATE exercise_registry SET value = value || jsonb_build_object(

  'Acessórios', (
    SELECT jsonb_agg(e ORDER BY lower(e->>'name'))
    FROM (
      SELECT DISTINCT ON (lower(e->>'name')) e
      FROM (
        SELECT jsonb_array_elements(value->'Acessórios') AS e, 0 AS rank
        UNION ALL SELECT jsonb_array_elements($json$[
          {"name":"Reverse Nordic",
           "description":"Ajoelhado, inclinar o tronco para trás mantendo o quadril estendido e retornar.",
           "muscles":"Quadríceps, flexores do quadril."},
          {"name":"Triceps Pushdown",
           "description":"Extensão de cotovelos na polia alta, cotovelos fixos ao lado do tronco.",
           "muscles":"Tríceps."},
          {"name":"Crucifixo",
           "description":"Abertura dos braços em arco com halteres, deitado no banco, cotovelos levemente flexionados.",
           "muscles":"Peitoral, deltoide anterior."},
          {"name":"Tríceps no Banco",
           "description":"Mergulho com as mãos apoiadas no banco atrás do corpo, podendo receber carga sobre as pernas.",
           "muscles":"Tríceps, deltoide anterior."},
          {"name":"Sandbag Lunge",
           "description":"Afundo carregando o sandbag no ombro ou abraçado ao peito.",
           "muscles":"Quadríceps, glúteos, core."},
          {"name":"Dual DB Row",
           "description":"Remada curvada com dois halteres, tronco inclinado e coluna neutra.",
           "muscles":"Dorsais, romboides, bíceps."},
          {"name":"Dual DB Dead March",
           "description":"Caminhada com dois halteres acima da cabeça ou no rack, tronco rígido.",
           "muscles":"Core, ombros, pernas."},
          {"name":"Dual KB Front Rack Walking Lunge",
           "description":"Afundo caminhando com dois kettlebells na posição de front rack, tronco ereto.",
           "muscles":"Quadríceps, glúteos, core, parte superior das costas."},
          {"name":"KB Goblet Reverse Lunge",
           "description":"Afundo para trás segurando um kettlebell junto ao peito (posição goblet).",
           "muscles":"Glúteos, quadríceps, core."},
          {"name":"DB OH Walking Lunge",
           "description":"Afundo caminhando com um halter sustentado acima da cabeça, braço estendido.",
           "muscles":"Quadríceps, glúteos, ombros, core."},
          {"name":"Sandbag Walking Lunge",
           "description":"Afundo caminhando com o sandbag no ombro ou abraçado ao peito.",
           "muscles":"Quadríceps, glúteos, core."},
          {"name":"Walking Lunge",
           "description":"Afundo à frente caminhando, alternando as pernas a cada passada.",
           "muscles":"Quadríceps, glúteos, isquiotibiais."},
          {"name":"Dual DB Walking Lunge",
           "description":"Afundo caminhando segurando dois halteres.",
           "muscles":"Quadríceps, glúteos, core."},
          {"name":"Box Step Over",
           "description":"Subida na caixa e descida pelo lado oposto, um pé de cada vez.",
           "muscles":"Quadríceps, glúteos."},
          {"name":"DB Box Step Over",
           "description":"Subida na caixa e descida pelo lado oposto segurando um halter.",
           "muscles":"Quadríceps, glúteos, core."},
          {"name":"Dual DB Box Step Over",
           "description":"Subida na caixa e descida pelo lado oposto segurando dois halteres.",
           "muscles":"Quadríceps, glúteos, core."},
          {"name":"DB Incline Press",
           "description":"Supino inclinado com halteres, banco entre 30° e 45°.",
           "muscles":"Peitoral superior, deltoide anterior, tríceps."}
        ]$json$), 1 AS rank
      ) s ORDER BY lower(e->>'name'), rank
    ) d
  ),

  'Aquecimento', (
    SELECT jsonb_agg(e ORDER BY lower(e->>'name'))
    FROM (
      SELECT DISTINCT ON (lower(e->>'name')) e
      FROM (
        SELECT jsonb_array_elements(value->'Aquecimento') AS e, 0 AS rank
        UNION ALL SELECT jsonb_array_elements($json$[
          {"name":"A-Skip",
           "description":"Skip com elevação de joelho e apoio ativo do antepé, alternando as pernas.",
           "muscles":"Flexores do quadril, panturrilha."},
          {"name":"C-Skip",
           "description":"Skip com abertura circular do quadril a cada passada.",
           "muscles":"Abdutores, flexores do quadril."},
          {"name":"Standing Banded Hip Adduction",
           "description":"Em pé, aduzir a perna contra a resistência do elástico, quadril estável.",
           "muscles":"Adutores."},
          {"name":"Kipping Swing",
           "description":"Balanço na barra alternando as posições arqueada e oca (arch e hollow), braços estendidos — a base do kipping.",
           "muscles":"Dorsais, core, ombros."},
          {"name":"Mountain Climber",
           "description":"Em prancha alta, levar os joelhos alternadamente em direção ao peito, em ritmo constante.",
           "muscles":"Core, flexores do quadril, ombros."},
          {"name":"KB Halo",
           "description":"Circundar a cabeça com o kettlebell segurado pelos chifres, tronco estável e cotovelos próximos.",
           "muscles":"Ombros, core, parte superior das costas."},
          {"name":"Kang Squat",
           "description":"Good morning seguido de agachamento: inclinar o tronco à frente com a coluna neutra, descer ao agachamento e voltar pelo mesmo caminho.",
           "muscles":"Isquiotibiais, glúteos, quadríceps, eretores da espinha."},
          {"name":"Plate Jump",
           "description":"Saltos sobre uma anilha no solo, com aterrissagem leve e controlada.",
           "muscles":"Panturrilha, quadríceps, glúteos."}
        ]$json$), 1 AS rank
      ) s ORDER BY lower(e->>'name'), rank
    ) d
  ),

  'Cardio', (
    SELECT jsonb_agg(e ORDER BY lower(e->>'name'))
    FROM (
      SELECT DISTINCT ON (lower(e->>'name')) e
      FROM (
        SELECT jsonb_array_elements(value->'Cardio') AS e, 0 AS rank
        UNION ALL SELECT jsonb_array_elements($json$[
          {"name":"Sandbag Carry",
           "description":"Deslocamento carregando o sandbag abraçado ao peito ou sobre o ombro.",
           "muscles":"Core, trapézio, pernas."},
          {"name":"Dual KB Front Rack Carry",
           "description":"Deslocamento com dois kettlebells na posição de front rack, tronco ereto.",
           "muscles":"Core, trapézio, ombros, pernas."},
          {"name":"Burpee Box Step-up",
           "description":"Burpee seguido de subida no caixote, descendo com controle.",
           "muscles":"Quadríceps, glúteos, peitoral, core."},
          {"name":"Burpee to Target",
           "description":"Burpee finalizado com um salto tocando um alvo acima da cabeça.",
           "muscles":"Corpo todo: pernas, core, ombros."}
        ]$json$), 1 AS rank
      ) s ORDER BY lower(e->>'name'), rank
    ) d
  ),

  'Core', (
    SELECT jsonb_agg(e ORDER BY lower(e->>'name'))
    FROM (
      SELECT DISTINCT ON (lower(e->>'name')) e
      FROM (
        SELECT jsonb_array_elements(value->'Core') AS e, 0 AS rank
        UNION ALL SELECT jsonb_array_elements($json$[
          {"name":"Copenhagen Plank",
           "description":"Prancha lateral com a perna de cima apoiada no banco, sustentando o quadril elevado.",
           "muscles":"Adutores, oblíquos, core."},
          {"name":"Arch Hold (Superman)",
           "description":"Sustentação em decúbito ventral com braços e pernas elevados, corpo em arco.",
           "muscles":"Eretores da espinha, glúteos, posteriores de coxa."},
          {"name":"KB Windmill",
           "description":"Com o kettlebell sustentado acima da cabeça, flexão lateral do tronco até tocar o solo.",
           "muscles":"Oblíquos, ombros, isquiotibiais."},
          {"name":"GHD Hip Extension",
           "description":"Extensão de quadril no GHD mantendo a coluna neutra — o movimento vem do quadril, não da lombar.",
           "muscles":"Glúteos, isquiotibiais."},
          {"name":"Plank Drag",
           "description":"Em prancha alta, arrastar o peso de um lado ao outro sem rotação do quadril.",
           "muscles":"Core, oblíquos, ombros."},
          {"name":"Prancha Lateral Dinâmica",
           "description":"Prancha lateral descendo e elevando o quadril de forma controlada, um lado de cada vez.",
           "muscles":"Oblíquos, glúteo médio, core."},
          {"name":"Strict Toes to Bar",
           "description":"Toes to bar sem balanço: elevar os pés até a barra com o corpo estável, sem kipping.",
           "muscles":"Flexores do quadril, reto abdominal, dorsais."},
          {"name":"Hip Extension",
           "description":"Extensão de quadril a partir do tronco flexionado, coluna neutra — o movimento vem do quadril.",
           "muscles":"Glúteos, isquiotibiais, eretores da espinha."}
        ]$json$), 1 AS rank
      ) s ORDER BY lower(e->>'name'), rank
    ) d
  ),

  'Força', (
    SELECT jsonb_agg(e ORDER BY lower(e->>'name'))
    FROM (
      SELECT DISTINCT ON (lower(e->>'name')) e
      FROM (
        SELECT jsonb_array_elements(value->'Força') AS e, 0 AS rank
        UNION ALL SELECT jsonb_array_elements($json$[
          {"name":"Dual DB Thruster",
           "description":"Agachamento frontal com dois halteres no ombro seguido de passagem acima da cabeça, em um movimento único.",
           "muscles":"Quadríceps, glúteos, ombros, tríceps."},
          {"name":"DB Push Press",
           "description":"Passagem do halter acima da cabeça usando impulso de pernas, com um halter por vez.",
           "muscles":"Ombros, tríceps, quadríceps, core."},
          {"name":"Z Press",
           "description":"Desenvolvimento acima da cabeça sentado no solo com pernas estendidas, sem apoio de tronco.",
           "muscles":"Ombros, tríceps, core, eretores da espinha."},
          {"name":"Dual DB Cluster",
           "description":"Clean dos dois halteres do solo até o ombro seguido de thruster, sem pausa entre as fases.",
           "muscles":"Cadeia posterior, quadríceps, ombros, tríceps."},
          {"name":"KB Strict Press",
           "description":"Desenvolvimento do kettlebell da posição de rack até acima da cabeça, sem impulso das pernas.",
           "muscles":"Ombros, tríceps, core."},
          {"name":"KB Sumo Deadlift High Pull (SDHP)",
           "description":"Levantamento do kettlebell com base sumô até a altura do queixo, cotovelos acima das mãos.",
           "muscles":"Cadeia posterior, trapézio, deltoides."},
          {"name":"DB Strict Press",
           "description":"Desenvolvimento estrito com um halter, da altura do ombro até acima da cabeça, sem impulso das pernas.",
           "muscles":"Ombros, tríceps, core."},
          {"name":"Deficit Deadlift",
           "description":"Levantamento terra em pé sobre uma anilha ou plataforma, aumentando a amplitude da puxada.",
           "muscles":"Glúteos, isquiotibiais, eretores da espinha, quadríceps."},
          {"name":"Supinated Barbell Row",
           "description":"Remada curvada com barra e pegada supinada (palmas para cima), tronco inclinado e coluna neutra.",
           "muscles":"Dorsais, romboides, bíceps."},
          {"name":"Back Thruster",
           "description":"Thruster com a barra apoiada nas costas: agachamento seguido de push press por trás da cabeça, em um movimento contínuo.",
           "muscles":"Quadríceps, glúteos, ombros, tríceps."},
          {"name":"Supinated Loaded Strict Pull-up",
           "description":"Barra fixa sem impulso, pegada supinada, com carga adicional no cinto ou colete.",
           "muscles":"Dorsais, bíceps, romboides."},
          {"name":"Seated Strict Press",
           "description":"Desenvolvimento estrito com barra, sentado, sem impulso das pernas.",
           "muscles":"Ombros, tríceps, trapézio superior."},
          {"name":"Block Deadlift",
           "description":"Levantamento terra com as anilhas apoiadas em blocos, começando acima do solo — amplitude reduzida.",
           "muscles":"Glúteos, isquiotibiais, eretores da espinha, trapézio."}
        ]$json$), 1 AS rank
      ) s ORDER BY lower(e->>'name'), rank
    ) d
  ),

  'LPO', (
    SELECT jsonb_agg(e ORDER BY lower(e->>'name'))
    FROM (
      SELECT DISTINCT ON (lower(e->>'name')) e
      FROM (
        SELECT jsonb_array_elements(value->'LPO') AS e, 0 AS rank
        UNION ALL SELECT jsonb_array_elements($json$[
          {"name":"Hang High Pull",
           "description":"Puxada alta a partir do hang, cotovelos conduzindo acima da linha da barra.",
           "muscles":"Trapézio, deltoides, cadeia posterior."},
          {"name":"Tall Clean",
           "description":"Clean iniciado com a barra na altura do quadril e pernas estendidas, sem puxada — só a passagem por baixo.",
           "muscles":"Trapézio, deltoides, quadríceps."},
          {"name":"Low Hang Snatch",
           "description":"Snatch iniciado no low hang — barra entre o hang e o solo, abaixo do joelho.",
           "muscles":"Cadeia posterior, ombros, quadríceps."},
          {"name":"Power Snatch Balance",
           "description":"Snatch balance recebido em power, acima da paralela, com a barra travada acima da cabeça.",
           "muscles":"Ombros, quadríceps, core."},
          {"name":"DB Clean & Jerk",
           "description":"Clean do halter até o ombro seguido de jerk até acima da cabeça.",
           "muscles":"Cadeia posterior, quadríceps, ombros, tríceps."},
          {"name":"Squat Clean",
           "description":"Clean com recepção no agachamento completo, abaixo da paralela.",
           "muscles":"Cadeia posterior, quadríceps, trapézio, core."},
          {"name":"Hang Squat Clean",
           "description":"Clean iniciado no hang (barra na coxa), recepção no agachamento completo.",
           "muscles":"Cadeia posterior, quadríceps, trapézio."},
          {"name":"Floor Squat Clean",
           "description":"Clean iniciado com a barra no solo, recepção no agachamento completo.",
           "muscles":"Cadeia posterior, quadríceps, trapézio."},
          {"name":"Low Hang Squat Clean",
           "description":"Clean iniciado no low hang (barra abaixo do joelho), recepção no agachamento completo.",
           "muscles":"Cadeia posterior, quadríceps, trapézio."},
          {"name":"High Hang Squat Clean",
           "description":"Clean iniciado no high hang (barra na altura do quadril), recepção no agachamento completo.",
           "muscles":"Quadríceps, trapézio, core."},
          {"name":"Low Hang Clean",
           "description":"Clean iniciado no low hang — barra entre o hang e o solo, abaixo do joelho.",
           "muscles":"Cadeia posterior, trapézio."},
          {"name":"High Hang Clean",
           "description":"Clean iniciado no high hang (barra na altura do quadril).",
           "muscles":"Trapézio, quadríceps, core."},
          {"name":"Floor Power Clean",
           "description":"Power clean iniciado com a barra no solo, recepção acima da paralela.",
           "muscles":"Cadeia posterior, trapézio, quadríceps."},
          {"name":"Low Hang Power Clean",
           "description":"Power clean iniciado no low hang — barra entre o hang e o solo, abaixo do joelho.",
           "muscles":"Cadeia posterior, trapézio."},
          {"name":"High Hang Power Clean",
           "description":"Power clean iniciado no high hang (barra na altura do quadril).",
           "muscles":"Trapézio, quadríceps, glúteos."},
          {"name":"Hang Muscle Clean",
           "description":"Muscle clean iniciado no hang: a barra sobe até o rack sem flexão de joelhos na recepção.",
           "muscles":"Trapézio, deltoides, cadeia posterior."},
          {"name":"Squat Snatch",
           "description":"Snatch com recepção no agachamento completo, barra travada acima da cabeça.",
           "muscles":"Cadeia posterior, ombros, quadríceps, core."},
          {"name":"Hang Squat Snatch",
           "description":"Snatch iniciado no hang (barra na coxa), recepção no agachamento completo.",
           "muscles":"Cadeia posterior, ombros, quadríceps."},
          {"name":"Floor Squat Snatch",
           "description":"Snatch iniciado com a barra no solo, recepção no agachamento completo.",
           "muscles":"Cadeia posterior, ombros, quadríceps, core."},
          {"name":"Low Hang Squat Snatch",
           "description":"Snatch iniciado no low hang (barra abaixo do joelho), recepção no agachamento completo.",
           "muscles":"Cadeia posterior, ombros, quadríceps, core."},
          {"name":"High Hang Squat Snatch",
           "description":"Snatch iniciado no high hang (barra na altura do quadril), recepção no agachamento completo.",
           "muscles":"Ombros, quadríceps, trapézio, core."},
          {"name":"Position Power Snatch",
           "description":"Power snatch iniciado em uma posição definida no treino (high hang, hang ou low hang), com uma pausa na posição antes da puxada.",
           "muscles":"Cadeia posterior, ombros, trapézio."},
          {"name":"Block Power Snatch",
           "description":"Power snatch iniciado com a barra apoiada em blocos.",
           "muscles":"Cadeia posterior, ombros, trapézio."},
          {"name":"Block Snatch High Pull",
           "description":"Puxada alta com pegada de snatch, iniciada com a barra apoiada em blocos.",
           "muscles":"Trapézio, deltoides, cadeia posterior."},
          {"name":"Low Hang High Pull",
           "description":"Puxada alta iniciada no low hang (barra abaixo do joelho), cotovelos conduzindo acima da linha da barra.",
           "muscles":"Trapézio, deltoides, cadeia posterior."},
          {"name":"DB Hang Clean & Jerk",
           "description":"Clean do halter a partir do hang até o ombro, seguido de jerk até acima da cabeça.",
           "muscles":"Cadeia posterior, ombros, tríceps, quadríceps."}
        ]$json$), 1 AS rank
      ) s ORDER BY lower(e->>'name'), rank
    ) d
  ),

  'Mobilidade', (
    SELECT jsonb_agg(e ORDER BY lower(e->>'name'))
    FROM (
      SELECT DISTINCT ON (lower(e->>'name')) e
      FROM (
        SELECT jsonb_array_elements(value->'Mobilidade') AS e, 0 AS rank
        UNION ALL SELECT jsonb_array_elements($json$[
          {"name":"Front Rack Stretch",
           "description":"Alongamento da posição de front rack para punho, tríceps e região torácica.",
           "muscles":"Punho, tríceps, torácica."}
        ]$json$), 1 AS rank
      ) s ORDER BY lower(e->>'name'), rank
    ) d
  ),

  'Skill', (
    SELECT jsonb_agg(e ORDER BY lower(e->>'name'))
    FROM (
      SELECT DISTINCT ON (lower(e->>'name')) e
      FROM (
        SELECT jsonb_array_elements(value->'Skill') AS e, 0 AS rank
        UNION ALL SELECT jsonb_array_elements($json$[
          {"name":"Jump Squat",
           "description":"Agachamento seguido de salto vertical, aterrissando com joelhos alinhados e absorvendo o impacto.",
           "muscles":"Quadríceps, glúteos, panturrilha."},
          {"name":"Hurdle Jump",
           "description":"Salto com os dois pés sobre uma barreira baixa, com aterrissagem controlada.",
           "muscles":"Quadríceps, glúteos, panturrilha."},
          {"name":"Ring Support Hold",
           "description":"Sustentação estática acima das argolas com cotovelos estendidos e ombros deprimidos.",
           "muscles":"Ombros, tríceps, core."},
          {"name":"Back Lever",
           "description":"Sustentação invertida nas argolas com o corpo horizontal e voltado para baixo.",
           "muscles":"Dorsais, peitoral, core, bíceps."},
          {"name":"Forward Roll to Support",
           "description":"Rolamento à frente nas argolas terminando em sustentação acima delas.",
           "muscles":"Ombros, tríceps, core."},
          {"name":"L-Sit (parallettes)",
           "description":"L-sit executado em parallettes, pernas estendidas e paralelas ao solo.",
           "muscles":"Core, flexores do quadril, tríceps, ombros."},
          {"name":"Double Under Crossover",
           "description":"Double under em que os braços cruzam à frente do corpo em uma das duas passagens da corda.",
           "muscles":"Panturrilha, ombros, antebraços."},
          {"name":"Single Under Crossover",
           "description":"Pular corda alternando passagens com os braços abertos e cruzados à frente do corpo.",
           "muscles":"Panturrilha, ombros, antebraços."},
          {"name":"Handstand Push-up (HSPU)",
           "description":"Flexão de braço invertida na parede — variação livre: strict ou kipping.",
           "muscles":"Deltoides, tríceps, trapézio, core."},
          {"name":"Deficit Strict HSPU",
           "description":"Strict HSPU com as mãos elevadas sobre anilhas ou paralelas, aumentando a amplitude.",
           "muscles":"Deltoides, tríceps, trapézio."},
          {"name":"Eccentric Deficit HSPU",
           "description":"Descida lenta e controlada do HSPU com as mãos elevadas — só a fase excêntrica.",
           "muscles":"Deltoides, tríceps, trapézio."},
          {"name":"Supinated Strict Pull-up",
           "description":"Barra fixa sem impulso, pegada supinada (palmas voltadas para o corpo).",
           "muscles":"Dorsais, bíceps, romboides."},
          {"name":"Pronated Strict Pull-up",
           "description":"Barra fixa sem impulso, pegada pronada (palmas voltadas para a frente).",
           "muscles":"Dorsais, bíceps, romboides."},
          {"name":"Box Jump Step Down",
           "description":"Salto em cima da caixa e descida com passada, sem saltar para baixo.",
           "muscles":"Quadríceps, glúteos, panturrilha."},
          {"name":"Dual DB Devil Press",
           "description":"Burpee com dois halteres seguido da elevação dos dois halteres acima da cabeça, em um único movimento.",
           "muscles":"Ombros, peitoral, posterior de coxa, core."}
        ]$json$), 1 AS rank
      ) s ORDER BY lower(e->>'name'), rank
    ) d
  )

) WHERE id = 1;

-- Verify: expect the per-category counts to rise by exactly the numbers below.
--   Acessórios: +17
--   Aquecimento: +8
--   Cardio: +4
--   Core: +8
--   Força: +13
--   LPO: +26
--   Mobilidade: +1
--   Skill: +15
--   (total +92; before -> after: 260 -> 352 entries, 8 empty block-type categories untouched)
SELECT key AS categoria, jsonb_array_length(value_arr) AS entradas
FROM exercise_registry,
     LATERAL jsonb_each(value) AS t(key, value_arr)
WHERE id = 1
ORDER BY key;

-- Verify the two fixes: expect 1 row 'Dual KB Overhead Walking', 0 rows 'DUal…', and the
-- Devil Press description reading "…com um halter…".
SELECT t.key AS categoria, e->>'name' AS nome, left(e->>'description', 60) AS descricao
FROM exercise_registry,
     LATERAL jsonb_each(value) AS t(key, arr),
     LATERAL jsonb_array_elements(arr) AS e
WHERE id = 1
  AND (lower(e->>'name') IN ('dual kb overhead walking', 'devil press', 'low hang snatch', 'low snatch'));

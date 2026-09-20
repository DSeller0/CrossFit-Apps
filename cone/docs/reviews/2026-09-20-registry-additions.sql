-- 2026-09-20 review — add missing exercises to the registry (prod)
-- ============================================================================
-- Title on LINE 1: Supabase auto-titles an "Untitled query" by sending the WHOLE
-- query to an AI endpoint when you Run it, so a leading comment steers it to this
-- exact name. If the snippet stays "Untitled query", rename it by hand.
-- ============================================================================
-- Run in the Supabase SQL editor (prod). Adds 29 entries across 8 categories,
-- derived from the 2026-09-18 prod snapshot — see 2026-09-20-exercises.md for the
-- evidence behind every one (occurrence counts + why it is an entry and not an alias).
--
-- SAFE TO RE-RUN: dedups by lower(name) and prefers the EXISTING row, so it can
-- never duplicate or overwrite an entry you already have. Entries land sorted
-- alphabetically within each category (the registry's canonical order, #55/#87).
--
-- ⚠️ The pt-BR description/muscles below are DRAFTED, not coach-authored. Read them
-- before running — they are the text athletes will see on the exercise detail.
--
-- ⚠️ This SQL adds ENTRIES only. The ~115 alias proposals and the 4 resolver rules
-- in the same report are CODE changes (src/public/lib/registry.js) and are filed as
-- a backlog row instead — do not expect this file to fix the shorthand names.

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
           "muscles":"Quadríceps, glúteos, core."}
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
           "muscles":"Adutores."}
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
           "muscles":"Core, trapézio, ombros, pernas."}
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
           "muscles":"Core, oblíquos, ombros."}
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
           "muscles":"Cadeia posterior, quadríceps, ombros, tríceps."}
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
          {"name":"Low Snatch",
           "description":"Snatch recebido direto no agachamento profundo, sem fase de puxada alta.",
           "muscles":"Cadeia posterior, ombros, quadríceps."}
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
           "muscles":"Core, flexores do quadril, tríceps, ombros."}
        ]$json$), 1 AS rank
      ) s ORDER BY lower(e->>'name'), rank
    ) d
  )

) WHERE id = 1;

-- Verify: expect the per-category counts to rise by exactly the numbers below.
--   Acessórios: +5
--   Aquecimento: +3
--   Cardio: +2
--   Core: +5
--   Força: +4
--   LPO: +3
--   Mobilidade: +1
--   Skill: +6
SELECT key AS categoria, jsonb_array_length(value_arr) AS entradas
FROM exercise_registry,
     LATERAL jsonb_each(value) AS t(key, value_arr)
WHERE id = 1
ORDER BY key;

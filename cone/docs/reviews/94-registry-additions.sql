-- #94 — add missing exercises to the registry (prod)
-- ============================================================================
-- ⚠️ Keep the title on LINE 1: the Supabase SQL editor autofills the snippet
-- name from the first line, and a decorative divider there leaves it "Untitled".
-- ============================================================================
-- Run in the Supabase SQL editor (prod). Adds 22 entries across 4 categories,
-- per the coach's decisions recorded in 94-session-registry-audit.md.
--
-- SAFE TO RE-RUN: dedups by lower(name) and prefers the EXISTING row, so it can
-- never duplicate or overwrite an entry you already have. Entries land sorted
-- alphabetically within each category (the registry's canonical order, #55/#87).
--
-- Categories set by the coach: Wall Ball → Cardio · Devil Press → Skill ·
-- Thruster → Força · Single Under → Skill AND Cardio · Burpee Over the Bar →
-- Cardio · Lunge variations → Acessórios · Shoulder to Overhead → Força.

UPDATE exercise_registry SET value = value || jsonb_build_object(

  'Cardio', (
    SELECT jsonb_agg(e ORDER BY lower(e->>'name'))
    FROM (
      SELECT DISTINCT ON (lower(e->>'name')) e
      FROM (
        SELECT jsonb_array_elements(value->'Cardio') AS e, 0 AS rank
        UNION ALL SELECT jsonb_array_elements($json$[
          {"name":"Wall Ball",
           "description":"Agachamento completo seguido de arremesso da medicine ball no alvo.",
           "muscles":"Quadríceps, glúteos, ombros, tríceps e core.",
           "notes":"Peso da bola e altura do alvo mudam por escala."},
          {"name":"Sprint",
           "description":"Corrida em intensidade máxima por distância curta.",
           "muscles":"Quadríceps, isquiotibiais, glúteos e panturrilhas.",
           "notes":"Distinto de Run: esforço máximo em distância curta, com recuperação entre tiros."},
          {"name":"Sprawl",
           "description":"Queda ao solo em prancha e retorno em pé, sem flexão e sem salto.",
           "muscles":"Full body: core, ombros e pernas.",
           "notes":"É o burpee sem a flexão e sem o salto final."},
          {"name":"Burpee Over the Bar (BOB)",
           "description":"Burpee seguido de salto por cima da barra.",
           "muscles":"Full body: cardiovascular, core e pernas.",
           "notes":"Pode ser lateral ou de frente para a barra."},
          {"name":"Single Under (SU)",
           "description":"Pulo de corda simples — uma passagem da corda por salto.",
           "muscles":"Panturrilhas, ombros e cardiovascular."}
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
          {"name":"Devil Press",
           "description":"Burpee com halteres seguido de elevação dos halteres acima da cabeça.",
           "muscles":"Ombros, peitoral, posterior de coxa e core.",
           "notes":"É por definição com halteres — \"DB Devil Press\" e \"Devil's Press\" são o mesmo movimento."},
          {"name":"Burpee Box Jump Over",
           "description":"Burpee seguido de salto por cima da caixa.",
           "muscles":"Full body: pernas, core e ombros.",
           "notes":"Pode ser com step down na descida."},
          {"name":"Pull-up",
           "description":"Barra fixa, pegada pronada, queixo acima da barra — variação livre.",
           "muscles":"Dorsais, bíceps e core.",
           "notes":"Usar quando a variação fica a critério do atleta; para exigir uma, prescrever Strict ou Kipping Pull-up."},
          {"name":"Single Under (SU)",
           "description":"Pulo de corda simples — uma passagem da corda por salto.",
           "muscles":"Panturrilhas, ombros e cardiovascular."}
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
          {"name":"Thruster",
           "description":"Front squat seguido de push press, em um movimento contínuo.",
           "muscles":"Quadríceps, glúteos, ombros, tríceps e core."},
          {"name":"DB Thruster",
           "description":"Thruster executado com halteres.",
           "muscles":"Quadríceps, glúteos, ombros, tríceps e core."},
          {"name":"Plate Thruster",
           "description":"Thruster executado segurando uma anilha.",
           "muscles":"Quadríceps, glúteos, ombros e core."},
          {"name":"Shoulder to Overhead (S2OH)",
           "description":"Levar a barra dos ombros até acima da cabeça — press, push press ou jerk.",
           "muscles":"Ombros, tríceps e core.",
           "notes":"A escolha do método fica a critério do atleta."}
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
          {"name":"Lunge",
           "description":"Afundo à frente, alternando as pernas.",
           "muscles":"Quadríceps, glúteos e isquiotibiais."},
          {"name":"Back Lunge",
           "description":"Afundo com passada para trás.",
           "muscles":"Glúteos, quadríceps e isquiotibiais.",
           "notes":"Menor estresse no joelho que o afundo à frente."},
          {"name":"DB Lunge",
           "description":"Afundo à frente segurando um haltere.",
           "muscles":"Quadríceps, glúteos e core."},
          {"name":"DB Back Lunge",
           "description":"Afundo para trás segurando um haltere.",
           "muscles":"Glúteos, quadríceps e core."},
          {"name":"Dual DB Lunge",
           "description":"Afundo à frente segurando dois halteres.",
           "muscles":"Quadríceps, glúteos e core."},
          {"name":"Dual DB Back Lunge",
           "description":"Afundo para trás segurando dois halteres.",
           "muscles":"Glúteos, quadríceps e core."},
          {"name":"KB Lunge",
           "description":"Afundo à frente segurando um kettlebell.",
           "muscles":"Quadríceps, glúteos e core."},
          {"name":"KB Back Lunge",
           "description":"Afundo para trás segurando um kettlebell.",
           "muscles":"Glúteos, quadríceps e core."},
          {"name":"Dual KB Lunge",
           "description":"Afundo à frente segurando dois kettlebells.",
           "muscles":"Quadríceps, glúteos e core."},
          {"name":"Dual KB Back Lunge",
           "description":"Afundo para trás segurando dois kettlebells.",
           "muscles":"Glúteos, quadríceps e core."}
        ]$json$::jsonb), 1
      ) u ORDER BY lower(e->>'name'), rank
    ) d
  )

) WHERE id = 1;

-- Verify: counts per touched category (expect Cardio 18, Skill 27, Força 24, Acessórios 31).
SELECT k AS categoria, jsonb_array_length(value->k) AS total
FROM exercise_registry, unnest(ARRAY['Cardio','Skill','Força','Acessórios']) AS k
WHERE id = 1;

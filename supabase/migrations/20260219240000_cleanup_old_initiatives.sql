-- Cleanup: remove old structure (non-functional), keep only initiatives
-- registered in Programa de Trabalho (current structure)
--
-- Keeps: initiative "Plano de Atividades - Protocolo 5-3-9" (0c01053c) in project 923de4b3
-- Deletes: 20 old initiatives, 7 old deliveries, old project 236e3ef3

-- 1. Delete 20 old initiatives (cascades: milestones, tasks, team, evidence)
DELETE FROM initiatives WHERE id != '0c01053c-5019-4ffb-b7e9-2d6f32c1fc3c';

-- 2. Delete 7 deliveries from old project
DELETE FROM deliveries WHERE project_id = '236e3ef3-69df-425b-8041-a5ccbaf0d04d';

-- 3. Delete old project
DELETE FROM projects WHERE id = '236e3ef3-69df-425b-8041-a5ccbaf0d04d';

ALTER TABLE tarefas
  ADD COLUMN horario_final TIME NULL AFTER horario,
  ADD CONSTRAINT tarefas_horario_final_valido CHECK (
    horario_final IS NULL OR (horario IS NOT NULL AND horario_final >= '00:00:00' AND horario_final < '24:00:00' AND horario_final <> horario)
  );

ALTER TABLE tarefas
  ADD COLUMN area ENUM('rotina', 'casa') NOT NULL DEFAULT 'rotina',
  ADD COLUMN ambiente VARCHAR(60) NULL,
  ADD CONSTRAINT tarefas_ambiente_casa CHECK (
    (area = 'rotina' AND ambiente IS NULL) OR
    (area = 'casa' AND ambiente IS NOT NULL AND CHAR_LENGTH(TRIM(ambiente)) > 0)
  );

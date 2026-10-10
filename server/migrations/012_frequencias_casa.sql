ALTER TABLE configuracoes_series
  MODIFY COLUMN tipo ENUM('diaria', 'semanal', 'quinzenal', 'mensal') NULL,
  ADD COLUMN inicio DATE NULL;

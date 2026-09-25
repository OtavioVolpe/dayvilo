CREATE TABLE ocorrencias_series (
  tarefa_id INT UNSIGNED NOT NULL,
  serie_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  PRIMARY KEY (tarefa_id),
  KEY ocorrencias_por_serie (serie_id, tarefa_id),
  CONSTRAINT ocorrencias_tarefa_fk FOREIGN KEY (tarefa_id) REFERENCES tarefas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

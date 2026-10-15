CREATE TABLE leituras_agendadas (
  tarefa_id INT UNSIGNED NOT NULL PRIMARY KEY,
  livro_id INT UNSIGNED NULL,
  CONSTRAINT leituras_tarefa_fk FOREIGN KEY (tarefa_id) REFERENCES tarefas(id) ON DELETE CASCADE,
  CONSTRAINT leituras_livro_fk FOREIGN KEY (livro_id) REFERENCES livros(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

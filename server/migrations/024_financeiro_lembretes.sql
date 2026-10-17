CREATE TABLE financeiro_lembretes (
  lancamento_id INT UNSIGNED NOT NULL PRIMARY KEY,
  tarefa_id INT UNSIGNED NOT NULL UNIQUE,
  FOREIGN KEY (lancamento_id) REFERENCES financeiro_lancamentos(id) ON DELETE CASCADE,
  FOREIGN KEY (tarefa_id) REFERENCES tarefas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

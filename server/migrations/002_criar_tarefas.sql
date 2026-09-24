CREATE TABLE tarefas (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id INT UNSIGNED NOT NULL,
  titulo VARCHAR(200) NOT NULL,
  observacao TEXT NULL,
  data_prevista DATE NULL,
  horario TIME NULL,
  prioridade BOOLEAN NOT NULL DEFAULT FALSE,
  situacao ENUM('pendente', 'concluida', 'pulada') NOT NULL DEFAULT 'pendente',
  ordem INT UNSIGNED NOT NULL DEFAULT 0,
  concluida_em TIMESTAMP NULL DEFAULT NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY tarefas_usuario_data_ordem (usuario_id, data_prevista, ordem, id),
  CONSTRAINT tarefas_usuario_fk FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
  CONSTRAINT tarefas_titulo_obrigatorio CHECK (CHAR_LENGTH(TRIM(titulo)) > 0),
  CONSTRAINT tarefas_prioridade_booleana CHECK (prioridade IN (0, 1)),
  CONSTRAINT tarefas_horario_valido CHECK (
    horario IS NULL OR (horario >= '00:00:00' AND horario < '24:00:00')
  ),
  CONSTRAINT tarefas_conclusao_consistente CHECK (
    (situacao = 'concluida' AND concluida_em IS NOT NULL)
    OR (situacao <> 'concluida' AND concluida_em IS NULL)
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE recuperacoes_senha (
  conta_id INT UNSIGNED NOT NULL,
  token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  criado_em DATETIME NOT NULL,
  expira_em DATETIME NOT NULL,
  PRIMARY KEY (conta_id),
  UNIQUE KEY recuperacoes_token (token_hash),
  CONSTRAINT recuperacoes_conta_fk FOREIGN KEY (conta_id) REFERENCES contas (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

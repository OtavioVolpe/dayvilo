CREATE TABLE confirmacoes_email (
  conta_id INT UNSIGNED NOT NULL,
  token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  criado_em DATETIME NULL,
  expira_em DATETIME NULL,
  confirmado_em DATETIME NULL,
  PRIMARY KEY (conta_id),
  UNIQUE KEY confirmacoes_email_token (token_hash),
  CONSTRAINT confirmacoes_email_conta_fk FOREIGN KEY (conta_id) REFERENCES contas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

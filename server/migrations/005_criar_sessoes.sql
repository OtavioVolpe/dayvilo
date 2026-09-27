CREATE TABLE sessoes (
  token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  conta_id INT UNSIGNED NOT NULL,
  csrf CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  expira_em DATETIME NOT NULL,
  PRIMARY KEY (token_hash),
  KEY sessoes_expiracao (expira_em),
  CONSTRAINT sessoes_conta_fk FOREIGN KEY (conta_id) REFERENCES contas (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE vinculos_conta (
  usuario_id INT UNSIGNED NOT NULL,
  codigo_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  expira_em DATETIME NOT NULL,
  PRIMARY KEY (usuario_id),
  UNIQUE KEY vinculos_codigo (codigo_hash),
  CONSTRAINT vinculos_usuario_fk FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

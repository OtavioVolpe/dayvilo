CREATE TABLE contas (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id INT UNSIGNED NOT NULL,
  email VARCHAR(254) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  senha_hash VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  criada_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY contas_email (email),
  UNIQUE KEY contas_usuario (usuario_id),
  CONSTRAINT contas_usuario_fk FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

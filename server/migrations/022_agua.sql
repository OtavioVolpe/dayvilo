CREATE TABLE agua_metas (
  usuario_id INT UNSIGNED NOT NULL,
  desde DATE NOT NULL,
  ml INT UNSIGNED NULL,
  PRIMARY KEY (usuario_id, desde),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  CHECK (ml IS NULL OR ml BETWEEN 1 AND 10000)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE agua_registros (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT UNSIGNED NOT NULL,
  dia DATE NOT NULL,
  ml INT UNSIGNED NOT NULL,
  chave CHAR(36) NOT NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY agua_requisicao (usuario_id, chave),
  KEY agua_dia (usuario_id, dia, id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  CHECK (ml BETWEEN 1 AND 10000)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

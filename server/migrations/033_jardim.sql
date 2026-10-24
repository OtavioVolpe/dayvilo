CREATE TABLE jardim_conquistas (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT UNSIGNED NOT NULL,
  meta_id CHAR(36) NOT NULL,
  inicio DATE NOT NULL,
  fim DATE NOT NULL,
  conquistada_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY jardim_meta_periodo (usuario_id,meta_id,inicio),
  CONSTRAINT jardim_usuario_fk FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

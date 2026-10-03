CREATE TABLE configuracoes_series (
  serie_id CHAR(36) NOT NULL,
  usuario_id INT UNSIGNED NOT NULL,
  tipo ENUM('diaria', 'semanal') NULL,
  dias JSON NULL,
  ate DATE NOT NULL,
  PRIMARY KEY (serie_id),
  CONSTRAINT configuracoes_series_usuario_fk FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

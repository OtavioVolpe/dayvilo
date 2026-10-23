CREATE TABLE metas_semanais (
  usuario_id INT UNSIGNED NOT NULL PRIMARY KEY,
  tipo ENUM('rotina','treino','leitura','casa','manual') NOT NULL,
  titulo VARCHAR(80) NOT NULL,
  dias TINYINT UNSIGNED NOT NULL,
  semana_manual DATE NULL,
  dias_manuais JSON NOT NULL,
  CONSTRAINT metas_semanais_usuario_fk FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  CONSTRAINT metas_semanais_dias_validos CHECK (dias BETWEEN 1 AND 7)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

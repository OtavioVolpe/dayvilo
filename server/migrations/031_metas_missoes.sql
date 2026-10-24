CREATE TABLE metas (
  id CHAR(36) NOT NULL PRIMARY KEY,
  usuario_id INT UNSIGNED NOT NULL,
  tipo ENUM('rotina','treino','leitura','casa','manual') NOT NULL,
  periodo ENUM('semanal','mensal') NOT NULL,
  medida ENUM('dias','ocorrencias') NOT NULL,
  titulo VARCHAR(80) NOT NULL,
  quantidade SMALLINT UNSIGNED NOT NULL,
  origem ENUM('sugestao','pessoal') NOT NULL,
  versao INT UNSIGNED NOT NULL DEFAULT 1,
  periodo_manual DATE NULL,
  dias_manuais JSON NOT NULL,
  legado_usuario_id INT UNSIGNED NULL UNIQUE,
  KEY metas_usuario_periodo (usuario_id,periodo),
  CONSTRAINT metas_usuario_fk FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  CONSTRAINT metas_quantidade CHECK (quantidade BETWEEN 1 AND 1000)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

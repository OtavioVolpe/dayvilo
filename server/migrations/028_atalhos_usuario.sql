CREATE TABLE atalhos_usuario (
 usuario_id INT UNSIGNED NOT NULL PRIMARY KEY,
 areas JSON NOT NULL,
 CONSTRAINT atalhos_usuario_fk FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

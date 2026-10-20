CREATE TABLE feedback (
 id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 usuario_id INT UNSIGNED NOT NULL,
 envio_id CHAR(36) NOT NULL,
 tipo ENUM('sugestao', 'problema') NOT NULL,
 area VARCHAR(30) NOT NULL,
 mensagem VARCHAR(2000) NOT NULL,
 criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY feedback_envio (usuario_id, envio_id),
 CONSTRAINT feedback_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

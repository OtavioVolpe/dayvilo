CREATE TABLE financeiro_investimentos (
 id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 usuario_id INT UNSIGNED NOT NULL,
 tipo ENUM('fixa','variavel') NOT NULL,
 nome VARCHAR(120) NOT NULL,
 instituicao VARCHAR(120) NOT NULL,
 detalhes JSON NOT NULL,
 versao INT UNSIGNED NOT NULL DEFAULT 1,
 CONSTRAINT financeiro_investimento_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

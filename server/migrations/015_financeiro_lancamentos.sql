CREATE TABLE financeiro_lancamentos (
 id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 usuario_id INT UNSIGNED NOT NULL,
 tipo ENUM('receita','despesa') NOT NULL,
 descricao VARCHAR(120) NOT NULL,
 categoria VARCHAR(60) NOT NULL,
 valor_centavos BIGINT UNSIGNED NOT NULL,
 data_prevista DATE NOT NULL,
 data_pagamento DATE NULL,
 observacao VARCHAR(1000) NOT NULL DEFAULT '',
 serie CHAR(36) NULL,
 versao INT UNSIGNED NOT NULL DEFAULT 1,
 INDEX financeiro_usuario_data (usuario_id, data_prevista),
 INDEX financeiro_usuario_serie (usuario_id, serie),
 CONSTRAINT financeiro_lancamento_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

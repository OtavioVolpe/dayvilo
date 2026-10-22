CREATE TABLE alteracoes_email (
 conta_id INT UNSIGNED NOT NULL PRIMARY KEY,
 novo_email VARCHAR(254) NOT NULL,
 token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 criado_em DATETIME NOT NULL,
 expira_em DATETIME NOT NULL,
 UNIQUE KEY alteracoes_email_token (token_hash),
 CONSTRAINT alteracoes_email_conta_fk FOREIGN KEY (conta_id) REFERENCES contas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

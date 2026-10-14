CREATE TABLE financeiro_registros (
 id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 investimento_id INT UNSIGNED NOT NULL,
 tipo ENUM('aporte','resgate','saldo') NOT NULL,
 valor_centavos BIGINT UNSIGNED NOT NULL,
 data DATE NOT NULL,
 observacao VARCHAR(500) NOT NULL DEFAULT '',
 INDEX financeiro_registro_data (investimento_id, data, id),
 CONSTRAINT financeiro_registro_investimento FOREIGN KEY (investimento_id) REFERENCES financeiro_investimentos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

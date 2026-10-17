ALTER TABLE financeiro_registros
 ADD lancamento_id INT UNSIGNED NULL UNIQUE,
 MODIFY observacao VARCHAR(1000) NOT NULL DEFAULT '',
 ADD CONSTRAINT financeiro_aporte_lancamento FOREIGN KEY (lancamento_id) REFERENCES financeiro_lancamentos(id) ON DELETE CASCADE;

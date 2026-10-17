ALTER TABLE financeiro_lancamentos
 MODIFY tipo ENUM('receita','despesa','aporte') NOT NULL,
 ADD investimento_id INT UNSIGNED NULL,
 ADD CONSTRAINT financeiro_aporte_destino FOREIGN KEY (investimento_id) REFERENCES financeiro_investimentos(id) ON DELETE RESTRICT;

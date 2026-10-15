CREATE TABLE livros (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT UNSIGNED NOT NULL,
  titulo VARCHAR(180) NOT NULL,
  autor VARCHAR(160) NOT NULL DEFAULT '',
  estado ENUM('quero_ler', 'lendo', 'lido') NOT NULL DEFAULT 'quero_ler',
  total_paginas INT UNSIGNED NULL,
  pagina_atual INT UNSIGNED NULL,
  inicio DATE NULL,
  termino DATE NULL,
  versao INT UNSIGNED NOT NULL DEFAULT 1,
  CONSTRAINT livros_usuario_fk FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
  CONSTRAINT livros_paginas CHECK ((total_paginas IS NULL OR total_paginas > 0) AND (pagina_atual IS NULL OR total_paginas IS NULL OR pagina_atual <= total_paginas)),
  CONSTRAINT livros_datas CHECK (inicio IS NULL OR termino IS NULL OR termino >= inicio),
  INDEX livros_usuario (usuario_id, estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

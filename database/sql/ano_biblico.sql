-- Módulo "Ano Bíblico"
-- Cria tabelas: plano_leitura, leitura_usuario
-- Compatível com MySQL/MariaDB (utf8mb4)

CREATE TABLE IF NOT EXISTS `plano_leitura` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `dia` SMALLINT UNSIGNED NOT NULL,
  `livro_id` BIGINT UNSIGNED NOT NULL,
  `capitulo` SMALLINT UNSIGNED NOT NULL,
  PRIMARY KEY (`id`),
  KEY `plano_leitura_dia_idx` (`dia`),
  KEY `plano_leitura_livro_cap_idx` (`livro_id`, `capitulo`),
  CONSTRAINT `plano_leitura_dia_chk` CHECK (`dia` >= 1 AND `dia` <= 365),
  CONSTRAINT `plano_leitura_livro_fk` FOREIGN KEY (`livro_id`) REFERENCES `bible_books` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `leitura_usuario` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `usuario_id` BIGINT UNSIGNED NOT NULL,
  `dia` SMALLINT UNSIGNED NOT NULL,
  `concluido` TINYINT(1) NOT NULL DEFAULT 0,
  `data_conclusao` DATETIME NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `leitura_usuario_usuario_dia_uniq` (`usuario_id`, `dia`),
  KEY `leitura_usuario_usuario_concluido_idx` (`usuario_id`, `concluido`),
  KEY `leitura_usuario_dia_idx` (`dia`),
  CONSTRAINT `leitura_usuario_dia_chk` CHECK (`dia` >= 1 AND `dia` <= 365)
  -- FK para users é opcional: descomente se a tabela for `users` e quiser cascata.
  -- ,CONSTRAINT `leitura_usuario_usuario_fk` FOREIGN KEY (`usuario_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `leitura_usuario_capitulo` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `usuario_id` BIGINT UNSIGNED NOT NULL,
  `dia` SMALLINT UNSIGNED NOT NULL,
  `livro_id` BIGINT UNSIGNED NOT NULL,
  `capitulo` SMALLINT UNSIGNED NOT NULL,
  `concluido` TINYINT(1) NOT NULL DEFAULT 0,
  `data_conclusao` DATETIME NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `leitura_usuario_capitulo_uniq` (`usuario_id`, `dia`, `livro_id`, `capitulo`),
  KEY `leitura_usuario_capitulo_usuario_dia_idx` (`usuario_id`, `dia`),
  KEY `leitura_usuario_capitulo_dia_idx` (`dia`),
  CONSTRAINT `leitura_usuario_capitulo_dia_chk` CHECK (`dia` >= 1 AND `dia` <= 365),
  CONSTRAINT `leitura_usuario_capitulo_livro_fk` FOREIGN KEY (`livro_id`) REFERENCES `bible_books` (`id`) ON DELETE CASCADE
  -- FK para users é opcional: descomente se a tabela for `users` e quiser cascata.
  -- ,CONSTRAINT `leitura_usuario_capitulo_usuario_fk` FOREIGN KEY (`usuario_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ano_biblico_usuario` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `usuario_id` BIGINT UNSIGNED NOT NULL,
  `data_inicio` DATE NOT NULL,
  `data_fim` DATE NULL,
  `status` VARCHAR(20) NULL,
  `created_at` DATETIME NULL,
  `updated_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ano_biblico_usuario_usuario_uniq` (`usuario_id`)
  -- FK para users é opcional: descomente se a tabela for `users` e quiser cascata.
  -- ,CONSTRAINT `ano_biblico_usuario_usuario_fk` FOREIGN KEY (`usuario_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ano_biblico_usuario_itens` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `usuario_id` BIGINT UNSIGNED NOT NULL,
  `dia` SMALLINT UNSIGNED NOT NULL,
  `data_leitura` DATE NOT NULL,
  `livro_id` BIGINT UNSIGNED NOT NULL,
  `capitulo` SMALLINT UNSIGNED NOT NULL,
  `concluido` TINYINT(1) NOT NULL DEFAULT 0,
  `data_conclusao` DATETIME NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ab_ui_usuario_livro_cap_uniq` (`usuario_id`, `livro_id`, `capitulo`),
  KEY `ab_ui_usuario_data_idx` (`usuario_id`, `data_leitura`),
  KEY `ab_ui_usuario_dia_idx` (`usuario_id`, `dia`),
  CONSTRAINT `ab_ui_dia_chk` CHECK (`dia` >= 1 AND `dia` <= 365),
  CONSTRAINT `ab_ui_livro_fk` FOREIGN KEY (`livro_id`) REFERENCES `bible_books` (`id`) ON DELETE CASCADE
  -- FK para users é opcional: descomente se a tabela for `users` e quiser cascata.
  -- ,CONSTRAINT `ab_ui_usuario_fk` FOREIGN KEY (`usuario_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- DESAFIOS BÍBLICOS (múltiplos planos por usuário)
-- Mantém o módulo antigo funcionando sem alteração.
-- ============================================================

CREATE TABLE IF NOT EXISTS `ano_biblico_desafios` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `chave` VARCHAR(40) NOT NULL,
  `nome` VARCHAR(120) NOT NULL,
  `descricao` VARCHAR(255) NOT NULL,
  `tipo` VARCHAR(30) NOT NULL,
  `duracao_dias` SMALLINT UNSIGNED NULL,
  `escopo` VARCHAR(10) NOT NULL DEFAULT 'all',
  `ativo` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NULL,
  `updated_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ab_desafios_chave_uniq` (`chave`),
  KEY `ab_desafios_ativo_idx` (`ativo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ano_biblico_desafio_usuario` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `usuario_id` BIGINT UNSIGNED NOT NULL,
  `desafio_id` BIGINT UNSIGNED NOT NULL,
  `data_inicio` DATE NOT NULL,
  `data_fim` DATE NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'active', -- active | archived | finished
  `criado_em` DATETIME NULL,
  `atualizado_em` DATETIME NULL,
  `arquivado_em` DATETIME NULL,
  PRIMARY KEY (`id`),
  KEY `ab_du_usuario_status_idx` (`usuario_id`, `status`),
  KEY `ab_du_usuario_desafio_idx` (`usuario_id`, `desafio_id`),
  CONSTRAINT `ab_du_desafio_fk` FOREIGN KEY (`desafio_id`) REFERENCES `ano_biblico_desafios` (`id`) ON DELETE CASCADE
  -- FK para users é opcional: descomente se a tabela for `users` e quiser cascata.
  -- ,CONSTRAINT `ab_du_usuario_fk` FOREIGN KEY (`usuario_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ano_biblico_desafio_itens` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `usuario_desafio_id` BIGINT UNSIGNED NOT NULL,
  `usuario_id` BIGINT UNSIGNED NOT NULL,
  `dia` SMALLINT UNSIGNED NOT NULL,
  `data_leitura` DATE NOT NULL,
  `livro_id` BIGINT UNSIGNED NOT NULL,
  `capitulo` SMALLINT UNSIGNED NOT NULL,
  `concluido` TINYINT(1) NOT NULL DEFAULT 0,
  `data_conclusao` DATETIME NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ab_di_uniq` (`usuario_desafio_id`, `livro_id`, `capitulo`),
  KEY `ab_di_usuario_data_idx` (`usuario_id`, `data_leitura`),
  KEY `ab_di_ud_dia_idx` (`usuario_desafio_id`, `dia`),
  CONSTRAINT `ab_di_ud_fk` FOREIGN KEY (`usuario_desafio_id`) REFERENCES `ano_biblico_desafio_usuario` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ab_di_livro_fk` FOREIGN KEY (`livro_id`) REFERENCES `bible_books` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed (idempotente): catálogo de desafios
INSERT INTO `ano_biblico_desafios` (`chave`, `nome`, `descricao`, `tipo`, `duracao_dias`, `escopo`, `ativo`, `created_at`, `updated_at`)
SELECT * FROM (
  SELECT 'fim_do_ano'           AS chave, 'Ano Bíblico Tradicional' AS nome, 'Leia a Bíblia até o fim do ano.' AS descricao, 'fim_do_ano' AS tipo, NULL AS duracao_dias, 'all' AS escopo, 1 AS ativo, NOW() AS created_at, NOW() AS updated_at
  UNION ALL
  SELECT 'um_ano'               AS chave, 'Ano Bíblico em 1 ano'    AS nome, 'Finalize em 365 dias a partir de hoje.' AS descricao, 'um_ano' AS tipo, 365 AS duracao_dias, 'all' AS escopo, 1 AS ativo, NOW(), NOW()
  UNION ALL
  SELECT 'data_personalizada'   AS chave, 'Meta personalizada'      AS nome, 'Escolha a data final do desafio.' AS descricao, 'data_personalizada' AS tipo, NULL AS duracao_dias, 'all' AS escopo, 1 AS ativo, NOW(), NOW()
  UNION ALL
  SELECT 'noventa_dias'         AS chave, 'Desafio 90 dias'         AS nome, 'Leia a Bíblia inteira em 90 dias.' AS descricao, 'noventa_dias' AS tipo, 90 AS duracao_dias, 'all' AS escopo, 1 AS ativo, NOW(), NOW()
  UNION ALL
  SELECT 'novo_testamento_30'   AS chave, 'Novo Testamento em 30 dias' AS nome, 'Leia apenas o Novo Testamento em 30 dias.' AS descricao, 'novo_testamento_30' AS tipo, 30 AS duracao_dias, 'new' AS escopo, 1 AS ativo, NOW(), NOW()
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM `ano_biblico_desafios` d WHERE d.`chave` = seed.`chave`);


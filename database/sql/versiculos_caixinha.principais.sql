-- Caixinha Bíblica (principais) - lista inicial curada
-- Observação: este arquivo só depende das referências (livro/capítulo/verso).
-- Para gerar uma lista maior automaticamente a partir do banco, use:
--   php artisan bible:caixinha-gerar --out=database/sql/versiculos_caixinha.seed.sql

INSERT INTO versiculos_caixinha
(livro, capitulo, versiculo_inicio, versiculo_fim, categoria, nota, peso)
VALUES
('Isaías', 41, 10, 10, 'Coragem', 10, 10),
('Isaías', 43, 2, 2, 'Consolo', 10, 10),
('Josué', 1, 9, 9, 'Coragem', 10, 10),
('Salmos', 23, 1, 1, 'Confiança', 10, 10),
('Salmos', 23, 4, 4, 'Consolo', 10, 10),
('Salmos', 46, 1, 1, 'Consolo', 10, 10),
('Salmos', 91, 1, 1, 'Confiança', 10, 10),
('Salmos', 121, 1, 1, 'Confiança', 9, 8),
('Jeremias', 29, 11, 11, 'Esperança', 10, 10),
('Provérbios', 3, 5, 5, 'Confiança', 10, 10),
('Provérbios', 3, 6, 6, 'Sabedoria', 10, 10),
('Mateus', 11, 28, 28, 'Consolo', 10, 10),
('João', 3, 16, 16, 'Salvação', 10, 10),
('João', 14, 27, 27, 'Consolo', 10, 10),
('Romanos', 8, 28, 28, 'Esperança', 10, 10),
('Romanos', 8, 31, 31, 'Confiança', 9, 7),
('Filipenses', 4, 6, 6, 'Oração', 10, 10),
('Filipenses', 4, 7, 7, 'Consolo', 10, 10),
('Filipenses', 4, 13, 13, 'Coragem', 10, 10),
('2 Timóteo', 1, 7, 7, 'Coragem', 10, 10),
('Hebreus', 11, 1, 1, 'Fé', 10, 10),
('1 Pedro', 5, 7, 7, 'Consolo', 10, 10),
('Apocalipse', 21, 4, 4, 'Esperança', 10, 10),
('1 João', 1, 9, 9, 'Perdão', 10, 10),
('Efésios', 2, 8, 8, 'Salvação', 10, 10),
('Efésios', 2, 9, 9, 'Salvação', 9, 7),
('Êxodo', 20, 8, 8, 'Sábado', 9, 7),
('Êxodo', 20, 10, 10, 'Sábado', 9, 7),
('Isaías', 58, 13, 13, 'Sábado', 9, 7),
('Isaías', 58, 14, 14, 'Sábado', 9, 7),
('João', 14, 3, 3, 'Volta de Jesus', 9, 7),
('1 Tessalonicenses', 4, 16, 16, 'Volta de Jesus', 9, 7),
('1 Tessalonicenses', 4, 17, 17, 'Volta de Jesus', 9, 7),
('Apocalipse', 22, 20, 20, 'Volta de Jesus', 10, 10);


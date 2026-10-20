USE defaultdb;
SET time_zone = '-03:00';
SELECT f.id, f.criado_em, u.nome, f.tipo, f.area, f.mensagem
FROM feedback f
JOIN usuarios u ON u.id = f.usuario_id
ORDER BY f.criado_em DESC, f.id DESC
LIMIT 100;

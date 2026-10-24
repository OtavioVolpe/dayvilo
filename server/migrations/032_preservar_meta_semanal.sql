INSERT INTO metas (id,usuario_id,tipo,periodo,medida,titulo,quantidade,origem,periodo_manual,dias_manuais,legado_usuario_id)
SELECT UUID(),usuario_id,tipo,'semanal','dias',titulo,dias,'pessoal',semana_manual,dias_manuais,usuario_id FROM metas_semanais;

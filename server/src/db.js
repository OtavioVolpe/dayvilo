import mysql from 'mysql2/promise';

export function criarPoolBanco() {
  const obrigatorias = ['MYSQL_HOST', 'MYSQL_USER', 'MYSQL_PASSWORD', 'MYSQL_DATABASE'];
  const ausentes = obrigatorias.filter(chave => !process.env[chave]);
  if (ausentes.length) throw new Error(`Configure ${ausentes.join(', ')} em server/.env.`);
  const porta = Number(process.env.MYSQL_PORT || 3306);
  if (!Number.isInteger(porta) || porta < 1 || porta > 65535) throw new Error('MYSQL_PORT inválida.');
  return mysql.createPool({
    host: process.env.MYSQL_HOST, port: porta,
    user: process.env.MYSQL_USER, password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE, connectionLimit: 5,
    charset: 'utf8mb4', dateStrings: true, multipleStatements: false,
    timezone: 'Z', connectTimeout: 10000,
  });
}

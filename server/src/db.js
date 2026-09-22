import mysql from 'mysql2/promise';

export function createDatabasePool() {
  const required = ['MYSQL_HOST', 'MYSQL_USER', 'MYSQL_PASSWORD', 'MYSQL_DATABASE'];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length) throw new Error(`Configure ${missing.join(', ')} em server/.env.`);
  const port = Number(process.env.MYSQL_PORT || 3306);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('MYSQL_PORT inválida.');
  return mysql.createPool({
    host: process.env.MYSQL_HOST, port,
    user: process.env.MYSQL_USER, password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE, connectionLimit: 5,
    charset: 'utf8mb4', dateStrings: true, multipleStatements: false,
  });
}

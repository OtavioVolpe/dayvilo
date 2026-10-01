import { isIP } from 'node:net';
import { readFileSync } from 'node:fs';
import mysql from 'mysql2/promise';

export function configurarBanco(ambiente = process.env) {
  const obrigatorias = ['MYSQL_HOST', 'MYSQL_USER', 'MYSQL_PASSWORD', 'MYSQL_DATABASE'];
  const ausentes = obrigatorias.filter(chave => !ambiente[chave]);
  if (ausentes.length) throw new Error(`Configure ${ausentes.join(', ')} em server/.env.`);
  const porta = Number(ambiente.MYSQL_PORT || 3306);
  if (!Number.isInteger(porta) || porta < 1 || porta > 65535) throw new Error('MYSQL_PORT inválida.');
  const tls = ambiente.MYSQL_SSL === 'true';
  if (ambiente.MYSQL_SSL !== undefined && !['true', 'false'].includes(ambiente.MYSQL_SSL)) throw new Error('MYSQL_SSL deve ser true ou false.');
  if (ambiente.NODE_ENV === 'production' && !tls) throw new Error('Produção exige MYSQL_SSL=true.');
  if (ambiente.MYSQL_SSL_CA && ambiente.MYSQL_SSL_CA_FILE) throw new Error('Informe apenas MYSQL_SSL_CA ou MYSQL_SSL_CA_FILE.');
  if (!tls && (ambiente.MYSQL_SSL_CA || ambiente.MYSQL_SSL_CA_FILE)) throw new Error('Ative MYSQL_SSL para usar o certificado CA.');
  if (tls && isIP(ambiente.MYSQL_HOST)) throw new Error('Com TLS, use o hostname do servidor MySQL para verificar sua identidade.');
  const ca = ambiente.MYSQL_SSL_CA || (ambiente.MYSQL_SSL_CA_FILE ? readFileSync(ambiente.MYSQL_SSL_CA_FILE, 'utf8') : undefined);
  return {
    host: ambiente.MYSQL_HOST, port: porta,
    user: ambiente.MYSQL_USER, password: ambiente.MYSQL_PASSWORD,
    database: ambiente.MYSQL_DATABASE, connectionLimit: 5,
    charset: 'utf8mb4', dateStrings: true, multipleStatements: false,
    ssl: tls ? { rejectUnauthorized: true, verifyIdentity: true, minVersion: 'TLSv1.2', ...(ca ? { ca } : {}) } : undefined,
    timezone: 'Z', connectTimeout: 10000,
  };
}

export function criarPoolBanco(ambiente = process.env) {
  return mysql.createPool(configurarBanco(ambiente));
}

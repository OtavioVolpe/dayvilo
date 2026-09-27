import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const derivar = promisify(scrypt);
const parametros = { N: 131072, r: 8, p: 1, maxmem: 160 * 1024 * 1024 };
const prefixo = 'scrypt$131072$8$1';
const hashAusente = `${prefixo}$${'00'.repeat(16)}$${'00'.repeat(64)}`;

export async function protegerSenha(senha) {
  const sal = randomBytes(16).toString('hex');
  const hash = await derivar(senha, sal, 64, parametros);
  return `${prefixo}$${sal}$${hash.toString('hex')}`;
}

export async function conferirSenha(senha, armazenada = hashAusente) {
  if (!/^scrypt\$131072\$8\$1\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(armazenada)) return false;
  const partes = armazenada.split('$');
  const calculado = await derivar(senha, partes[4], 64, parametros);
  return timingSafeEqual(calculado, Buffer.from(partes[5], 'hex'));
}

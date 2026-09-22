import { app } from './app.js';

const port = Number(process.env.PORT || 3001);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT inválida.');
const host = process.env.HOST || '127.0.0.1';
const server = app.listen(port, host, () => console.log(`Dayvilo API: http://${host}:${port}`));
server.on('error', error => { console.error(`Não foi possível iniciar a API (${error.code}).`); process.exitCode = 1; });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));

import express from 'express';

export const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));
app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok', service: 'dayvilo-api' });
});
app.use((_request, response) => response.status(404).json({ error: 'Recurso não encontrado.' }));
app.use((error, _request, response, _next) => {
  const status = error.status === 400 ? 400 : error.status === 413 ? 413 : 500;
  response.status(status).json({ error: status === 400 ? 'JSON inválido.' : status === 413 ? 'Conteúdo muito grande.' : 'Não foi possível processar a solicitação.' });
});

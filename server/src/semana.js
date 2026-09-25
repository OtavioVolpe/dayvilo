import { validarData, ErroValidacao } from './validacao-tarefas.js';

export function obterSemana(valor) {
  validarData(valor);
  const inicio = new Date(`${valor}T12:00:00Z`);
  inicio.setUTCDate(inicio.getUTCDate() - (inicio.getUTCDay() + 6) % 7);
  const dias = Array.from({ length: 7 }, (_, indice) => {
    const dia = new Date(inicio);
    dia.setUTCDate(dia.getUTCDate() + indice);
    return dia.toISOString().slice(0, 10);
  });
  if (dias.some(dia => !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(dia))) throw new ErroValidacao('Semana fora do intervalo permitido.');
  return { inicio: dias[0], fim: dias[6], dias };
}

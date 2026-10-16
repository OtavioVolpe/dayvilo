import { Activity } from 'lucide-react';
import { formatarData } from './datas.js';

export const modalidadesCardio = [['bicicleta', 'Bicicleta'], ['esteira', 'Esteira'], ['escada', 'Escada'], ['corrida', 'Corrida de rua'], ['caminhada', 'Caminhada'], ['outro', 'Outro cardio']];
export const novoCardio = () => ({ tipo: 'cardio', nome: 'Bicicleta', modalidade: 'bicicleta', duracao: 20, distancia: null, observacao: '' });
const numerico = v => v === '' ? null : Number(v);
const medida = v => v == null ? '—' : v.toLocaleString('pt-BR');

export function CamposCardio({ exercicio: ex, alterar, modalidade }) {
  return <>
    <label>Modalidade<select value={ex.modalidade} onChange={e => modalidade(e.target.value)}>{modalidadesCardio.map(([valor, nome]) => <option key={valor} value={valor}>{nome}</option>)}</select></label>
    <label>Nome da atividade<input required maxLength={120} value={ex.nome} onChange={e => alterar('nome', e.target.value)} placeholder="Ex.: bicicleta após o treino" /></label>
    <div className="treino-campos treino-cardio-campos">
      <label>Duração planejada (min)<input required type="number" min="0.01" max="1440" step="0.01" value={ex.duracao ?? ''} onChange={e => alterar('duracao', numerico(e.target.value))} /></label>
      <label>Distância planejada (km) · opcional<input type="number" min="0" max="2000" step="0.01" value={ex.distancia ?? ''} onChange={e => alterar('distancia', numerico(e.target.value))} /></label>
    </div>
  </>;
}

export function RegistroCardio({ exercicio: ex, indice, registro, referencia, alterar, copiar }) {
  return <section className="treino-exercicio">
    <header><div><span className="treino-tipo"><Activity size={16} aria-hidden="true" />Cardio</span><h3>{indice + 1}. {ex.nome}</h3></div><button type="button" aria-pressed={registro.feita} onClick={() => alterar({ ...registro, feita: !registro.feita })}>{registro.feita ? '✓ Feito · desmarcar' : 'Marcar feito'}</button></header>
    <p className="treino-ajuda">Planejado: {medida(ex.duracao)} min{ex.distancia != null && ` · ${medida(ex.distancia)} km`}</p>
    {ex.observacao && <p className="treino-observacao">{ex.observacao}</p>}
    <div className="treino-referencia-topo">{referencia ? <><span>Último registro · {formatarData(referencia.data, { day: '2-digit', month: '2-digit', year: 'numeric' })}<br />{medida(referencia.duracao)} min · {medida(referencia.distancia)} km</span><button type="button" disabled={registro.feita} onClick={copiar}>Copiar último registro</button></> : <span>Sem registro anterior desta atividade nesta ficha.</span>}</div>
    <div className="treino-campos treino-cardio-campos">
      <label>Tempo realizado (min) · opcional<input type="number" min="0" max="1440" step="0.01" value={registro.duracao ?? ''} placeholder="Ex.: 20" onChange={e => alterar({ ...registro, duracao: numerico(e.target.value) })} /></label>
      <label>Distância (km) · opcional<input type="number" min="0" max="2000" step="0.01" value={registro.distancia ?? ''} placeholder="Ex.: 6,2" onChange={e => alterar({ ...registro, distancia: numerico(e.target.value) })} /></label>
    </div>
    <label>Nota do treino<textarea maxLength={500} value={registro.observacao} placeholder="Ex.: nível 5, inclinação ou percurso" onChange={e => alterar({ ...registro, observacao: e.target.value })} /></label>
  </section>;
}

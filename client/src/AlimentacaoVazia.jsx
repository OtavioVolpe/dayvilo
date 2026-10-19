import { Plus, Utensils } from 'lucide-react';
import { formatarData } from './datas.js';
import './rotina-vazia.css';
import './alimentacao-vazia.css';

export default function AlimentacaoVazia({ dia, bloqueado, aoCriar }) {
  return <section className="rotina-vazia alimentacao-inicio" aria-labelledby="alimentacao-inicio-titulo">
    <span className="rotina-vazia-icone"><Utensils size={26} aria-hidden="true" /></span>
    <h2 id="alimentacao-inicio-titulo">O que vai ter neste dia?</h2>
    <p>Ainda não há refeições para {formatarData(dia, { day: '2-digit', month: 'long', year: 'numeric' })}. Adicione uma refeição e descreva os alimentos do seu planejamento.</p>
    <button type="button" className="botao-principal" disabled={bloqueado} onClick={() => aoCriar()}><Plus size={18} aria-hidden="true" />Adicionar refeição</button>
    <div className="rotina-vazia-sugestoes"><p>Por qual refeição quer começar?</p><div>{['Café da manhã', 'Almoço', 'Jantar'].map(titulo => <button type="button" key={titulo} disabled={bloqueado} onClick={() => aoCriar(titulo)} aria-label={`Usar sugestão: ${titulo}`}>{titulo}</button>)}</div><small>Preenchemos apenas o nome. Você escolhe os alimentos, a data e se quer mostrar a refeição na Rotina antes de salvar.</small></div>
    <p className="alimentacao-inicio-copia">Já planejou outro dia? Abra a data que tem as refeições e use Copiar dia para reaproveitar o planejamento.</p>
  </section>;
}

import { CircleCheck, Sprout } from 'lucide-react';
import './progresso-dia.css';

export default function ProgressoDia({ concluidas, total, puladas, celebracao }) {
  const completo = total > 0 && concluidas === total;
  const percentual = total ? Math.round(concluidas / total * 100) : 0;
  const mensagem = completo ? 'Você concluiu o que planejou para hoje.'
    : total === 0 ? 'Hoje você ajustou seus planos. Tudo bem.'
    : concluidas > 0 ? 'Cada passo conta. Siga no seu ritmo.'
    : 'Um passo de cada vez, no seu ritmo.';
  const Icone = completo ? CircleCheck : Sprout;

  return <section className="progresso-dia" aria-label="Seu progresso de hoje">
    <div className="progresso-dia-cabecalho">
      <span className="progresso-dia-icone" key={celebracao || 'repouso'} data-celebrando={Boolean(celebracao)}><Icone size={22} aria-hidden="true" /></span>
      <div className="progresso-dia-texto"><strong>{completo ? 'Seu plano de hoje está concluído' : 'Seu progresso de hoje'}</strong><p>{mensagem}</p></div>
      <span className="progresso-dia-percentual" aria-hidden="true">{percentual}%</span>
    </div>
    <progress aria-label="Tarefas concluídas hoje" value={concluidas} max={total || 1} aria-valuetext={`${concluidas} de ${total} tarefas concluídas`} />
    <div className="progresso-dia-rodape"><span>{concluidas} de {total} {total === 1 ? 'tarefa concluída' : 'tarefas concluídas'}{puladas > 0 && ` · ${puladas} ${puladas === 1 ? 'pulada' : 'puladas'}`}</span><span role="status" className="progresso-dia-retorno">{celebracao ? completo ? 'Plano concluído. Boa!' : 'Mais um passo dado!' : ''}</span></div>
  </section>;
}

import { formatarData } from './datas.js';

export default function ResumoCopiaAlimentacao({ resumo }) {
  const novas = resumo.reduce((total, dia) => total + dia.adicionar, 0);
  const removidas = resumo.reduce((total, dia) => total + dia.remover, 0);
  const mantidas = resumo.reduce((total, dia) => total + dia.existentes - dia.remover, 0);
  return <div className="ali-previa ali-previa-compacta">
    <p className="ali-previa-destaque" role="status"><strong>{novas} {novas === 1 ? 'refeição será adicionada' : 'refeições serão adicionadas'}</strong><span>em {resumo.length} {resumo.length === 1 ? 'dia selecionado' : 'dias selecionados'}</span></p>
    {removidas > 0 && <p className="ali-previa-substituicao">{removidas} {removidas === 1 ? 'refeição pendente será removida' : 'refeições pendentes serão removidas'} para dar lugar às novas.</p>}
    {mantidas > 0 && <p>{mantidas} {mantidas === 1 ? 'refeição existente será preservada' : 'refeições existentes serão preservadas'}.</p>}
    <details><summary>Ver detalhes por dia</summary><div className="ali-previa-dias" tabIndex={0} role="region" aria-label="Detalhes da cópia por dia">{resumo.map(r => <div className="ali-previa-dia" key={r.data}><strong>{formatarData(r.data)}</strong><span>{r.adicionar} novas{r.remover > 0 ? ` · ${r.remover} removidas` : ''}{r.existentes > r.remover ? ` · ${r.existentes - r.remover} preservadas` : ''}</span></div>)}</div></details>
  </div>;
}

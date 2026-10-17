import { useEffect, useId, useRef, useState } from 'react';
import { CalendarPlus, CalendarX, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';

export default function FichaTreinoCard({ ficha, bloqueado, agendar, desagendar, editar, excluir }) {
  const [aberto, setAberto] = useState(false);
  const grupo = useRef(null), gatilho = useRef(null), id = useId();
  useEffect(() => {
    if (!aberto) return;
    const fecharFora = e => { if (!grupo.current?.contains(e.target)) setAberto(false); };
    const fecharTeclado = e => { if (e.key === 'Escape') { setAberto(false); gatilho.current?.focus(); } };
    document.addEventListener('pointerdown', fecharFora);
    document.addEventListener('keydown', fecharTeclado);
    return () => { document.removeEventListener('pointerdown', fecharFora); document.removeEventListener('keydown', fecharTeclado); };
  }, [aberto]);
  return <article className="treino-ficha-card">
    <header className="treino-ficha-cabecalho"><h3>{ficha.nome}</h3></header>
    <p>{ficha.exercicios.length} exercício(s)</p>
    <div className="treino-ficha-rodape"><button className="treino-ficha-agendar" disabled={bloqueado} onClick={agendar}><CalendarPlus size={17} aria-hidden="true" />Agendar</button>
      <div className="treino-ficha-opcoes" ref={grupo} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setAberto(false); }}>
        <button ref={gatilho} className="treino-ficha-icone" aria-label={'Mais opções da ficha ' + ficha.nome} aria-expanded={aberto} aria-controls={id} disabled={bloqueado} onClick={() => setAberto(v => !v)}><MoreHorizontal size={20} aria-hidden="true" /></button>
        {aberto && <div id={id} className="treino-ficha-menu" role="group" aria-label={'Ações da ficha ' + ficha.nome}>
          <button disabled={bloqueado} onClick={() => { setAberto(false); editar(); }}><Pencil size={17} aria-hidden="true" />Editar ficha</button>
          <button disabled={bloqueado} onClick={() => { setAberto(false); desagendar(); }}><CalendarX size={17} aria-hidden="true" />Desagendar</button>
          <button className="treino-ficha-excluir" disabled={bloqueado} onClick={() => { setAberto(false); excluir(); }}><Trash2 size={17} aria-hidden="true" />Excluir ficha</button>
        </div>}
      </div>
    </div>
  </article>;
}

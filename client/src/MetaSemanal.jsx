import { useEffect, useRef, useState } from 'react';
import { Target, Check, ChevronDown } from 'lucide-react';
import { solicitar } from './api.js';
import { formatarData } from './datas.js';
import './meta-semanal.css';

const opcoes = [
  ['rotina', 'Avançar na rotina', 4, 'Conta os dias com pelo menos uma tarefa concluída na Rotina, incluindo as outras áreas.'],
  ['treino', 'Manter os treinos', 3, 'Conta os dias com pelo menos um treino agendado marcado como concluído.'],
  ['leitura', 'Reservar tempo para ler', 3, 'Conta os dias com pelo menos uma leitura agendada marcada como concluída.'],
  ['casa', 'Cuidar da casa', 2, 'Conta os dias com pelo menos uma tarefa de Casa concluída.'],
  ['manual', 'Criar minha meta', 3, 'Você marca os dias em que cumpriu a meta. Ex.: praticar violão.'],
];

export default function MetaSemanal({ revisao }) {
  const [dados, definirDados] = useState(null), [erro, definirErro] = useState('');
  const [aberto, definirAberto] = useState(false), [editando, definirEditando] = useState(false);
  const [tipo, definirTipo] = useState('rotina'), [titulo, definirTitulo] = useState(''), [dias, definirDias] = useState(4);
  const [salvando, definirSalvando] = useState(false), [carregando, definirCarregando] = useState(true);
  const [confirmarRemocao, definirConfirmarRemocao] = useState(false), [aviso, definirAviso] = useState('');
  const [tentativa, definirTentativa] = useState(0);
  const consulta = useRef(0);
  useEffect(() => {
    const numero = ++consulta.current;
    definirCarregando(true); definirErro('');
    solicitar('/meta-semanal').then(resultado => { if (consulta.current === numero) definirDados(resultado); })
      .catch(falha => { if (consulta.current === numero) definirErro(falha.message); })
      .finally(() => { if (consulta.current === numero) definirCarregando(false); });
    return () => { if (consulta.current === numero) consulta.current++; };
  }, [revisao, tentativa]);
  const meta = dados?.meta;
  const quantidade = meta?.cumpridos.length || 0;
  const completa = Boolean(meta && quantidade >= meta.dias);
  const bloqueado = salvando || carregando;
  function abrirEdicao() {
    definirTipo(meta?.tipo || 'rotina'); definirTitulo(meta?.tipo === 'manual' ? meta.titulo : ''); definirDias(meta?.dias || 4);
    definirEditando(true); definirAberto(true); definirConfirmarRemocao(false); definirAviso('');
  }
  async function enviar(caminho, method, body) {
    definirSalvando(true); definirErro(''); definirAviso('');
    ++consulta.current;
    try {
      const resultado = await solicitar('/meta-semanal' + caminho, { method, ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}) });
      definirDados(anterior => ({ ...anterior, ...resultado }));
      if (method === 'PUT') { definirEditando(false); definirAviso('Meta salva. Vá no seu ritmo.'); }
      if (method === 'DELETE') { definirConfirmarRemocao(false); definirEditando(false); definirAberto(false); definirAviso('Meta removida. Suas tarefas foram mantidas.'); }
    } catch (falha) { definirErro(falha.message); }
    finally { definirSalvando(false); }
  }
  return <section className="meta-semanal" aria-label="Meta semanal">
    <button className="meta-semanal-resumo" aria-expanded={aberto} onClick={() => definirAberto(v => !v)}>
      <Target size={19} aria-hidden="true" /><span><strong>{meta ? meta.titulo : 'Uma meta para a semana'}</strong><small>{carregando ? 'Atualizando…' : meta ? `${Math.min(quantidade, meta.dias)} de ${meta.dias} dias${completa ? ' · Meta cumprida!' : ''}` : 'Opcional. Escolha um pequeno compromisso.'}</small></span><ChevronDown size={17} aria-hidden="true" />
    </button>
    {erro && <p className="mensagem-erro" role="alert">{erro} <button type="button" className="botao-secundario" disabled={salvando} onClick={() => definirTentativa(v => v + 1)}>Tentar novamente</button></p>}
    {aviso && <p className="meta-semanal-aviso" role="status">{aviso}</p>}
    {aberto && !carregando && dados && <div className="meta-semanal-conteudo">
      {!editando && !meta && <><p>Escolha uma sugestão ou crie sua própria meta. Os dias de descanso fazem parte.</p><button className="botao-secundario" onClick={abrirEdicao}>Escolher meta</button></>}
      {!editando && meta && <>
        <p>{formatarData(dados.semana.inicio, { day: '2-digit', month: '2-digit' })} a {formatarData(dados.semana.fim, { day: '2-digit', month: '2-digit' })} · Segunda a domingo</p>
        <div className="meta-semanal-dias">{dados.semana.dias.map((dia, indice) => {
          const cumprido = meta.cumpridos.includes(dia);
          const rotulo = `${formatarData(dia, { weekday: 'long', day: 'numeric', month: 'long' })}: ${cumprido ? 'cumprido' : 'não marcado'}`;
          const conteudo = <><span>{['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'][indice]}</span><span>{cumprido ? <Check size={16} aria-hidden="true" /> : dia.slice(-2)}</span></>;
          return meta.tipo === 'manual' ? <button key={dia} type="button" aria-label={rotulo} aria-pressed={cumprido} className={cumprido ? 'meta-dia-cumprido' : ''} disabled={bloqueado || dia > dados.hoje} onClick={() => enviar('/dias', 'PATCH', { dia, cumprido: !cumprido })}>{conteudo}</button>
            : <div key={dia} aria-label={rotulo} className={cumprido ? 'meta-dia-cumprido' : ''}>{conteudo}</div>;
        })}</div>
        <p>{opcoes.find(o => o[0] === meta.tipo)[3]}</p>
        <p className="meta-semanal-nota">{meta.tipo === 'manual' ? 'Toque em um dia para marcar ou desfazer.' : 'Cada data planejada conta uma vez, mesmo com várias conclusões. Desfazer uma conclusão atualiza a contagem.'} A contagem recomeça na segunda; sua meta continua.</p>
        {completa && <p className="meta-semanal-conquista">Você cumpriu seu compromisso desta semana. Boa!</p>}
        <div className="meta-semanal-acoes"><button className="botao-secundario" disabled={bloqueado} onClick={abrirEdicao}>Editar meta</button><button className="botao-secundario" disabled={bloqueado} onClick={() => definirConfirmarRemocao(true)}>Remover meta</button></div>
        {confirmarRemocao && <div className="meta-semanal-confirmacao"><p>Remover esta meta e suas marcações manuais? As tarefas e os registros das áreas continuam salvos.</p><div className="meta-semanal-acoes"><button className="botao-secundario" disabled={bloqueado} onClick={() => definirConfirmarRemocao(false)}>Cancelar</button><button className="botao-principal" disabled={bloqueado} onClick={() => enviar('', 'DELETE')}>Confirmar remoção</button></div></div>}
      </>}
      {editando && <form onSubmit={e => { e.preventDefault(); enviar('', 'PUT', { tipo, titulo, dias }); }}>
        <fieldset disabled={bloqueado}><legend>{meta ? 'Editar meta semanal' : 'Sua meta semanal'}</legend>
          <label>O que você quer manter na semana?<select value={tipo} onChange={e => { definirTipo(e.target.value); definirDias(opcoes.find(o => o[0] === e.target.value)[2]); }}>{opcoes.map(([valor, nome]) => <option key={valor} value={valor}>{nome}</option>)}</select></label>
          <p>{opcoes.find(o => o[0] === tipo)[3]}</p>
          {tipo === 'manual' && <label>Nome da meta<input required maxLength={80} value={titulo} onChange={e => definirTitulo(e.target.value)} placeholder="Ex.: praticar violão" /></label>}
          <label>Quantos dias por semana?<select value={dias} onChange={e => definirDias(Number(e.target.value))}>{[1,2,3,4,5,6,7].map(d => <option key={d} value={d}>{d} {d === 1 ? 'dia' : 'dias'}</option>)}</select></label>
          <p className="meta-semanal-nota">Uma meta ativa por vez. As automáticas incluem as conclusões já registradas nesta semana, até hoje. Esta versão não guarda um histórico de conquistas.</p>
          {meta?.tipo === 'manual' && <p>Salvar alterações apaga as marcações manuais desta meta.</p>}
          <div className="meta-semanal-acoes"><button type="button" className="botao-secundario" onClick={() => definirEditando(false)}>Cancelar</button><button className="botao-principal" type="submit">{salvando ? 'Salvando…' : 'Salvar meta'}</button></div>
        </fieldset>
      </form>}
    </div>}
  </section>;
}

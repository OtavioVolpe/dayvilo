import { useEffect, useRef, useState } from 'react';
import { Droplets, RotateCcw } from 'lucide-react';
import { solicitar } from './api.js';
import { formatarData } from './datas.js';
import './agua.css';

const numero = n => n.toLocaleString('pt-BR');
export default function AguaDia({ data, bloqueado, aoOcupar }) {
  const [dados, setDados] = useState(null), [erro, setErro] = useState(''), [ocupado, setOcupado] = useState(false);
  const [modo, setModo] = useState(null), [valor, setValor] = useState(''), [tentativa, setTentativa] = useState(0);
  const trava = useRef(false), pendente = useRef(null);
  useEffect(() => {
    const controller = new AbortController();
    solicitar('/alimentacao/agua?data=' + data, { signal: controller.signal }).then(r => { if (!controller.signal.aborted) setDados(r); }).catch(e => { if (!controller.signal.aborted) setErro(e.message); });
    return () => controller.abort();
  }, [data, tentativa]);
  async function salvar(method, caminho, corpo) {
    if (trava.current) return;
    trava.current = true; setOcupado(true); aoOcupar(true); setErro('');
    const pedido = pendente.current || { method, caminho, corpo };
    pendente.current = pedido;
    try {
      const r = await solicitar('/alimentacao/agua' + pedido.caminho, { method: pedido.method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pedido.corpo) });
      setDados(r); pendente.current = null; setModo(null); setValor('');
    } catch (e) { setErro(e.message); }
    finally { trava.current = false; setOcupado(false); aoOcupar(false); }
  }
  function adicionar(ml) { return salvar('POST', '', { data, ml, chave: crypto.randomUUID() }); }
  const desabilitado = bloqueado || ocupado || !dados || !!pendente.current;
  return <section className="agua-card" aria-label="Água do dia" aria-busy={ocupado}>
    <header><div><h2><Droplets size={21} aria-hidden="true" />Água do dia</h2><p>{formatarData(data, { day: '2-digit', month: '2-digit', year: 'numeric' })}</p></div>
      <button type="button" className="agua-link" disabled={desabilitado} onClick={() => { setModo('meta'); setValor(dados.meta ?? ''); }}>{dados?.meta ? 'Editar meta' : 'Definir meta'}</button></header>
    {dados ? <>
      <p className="agua-total" aria-live="polite"><strong>{numero(dados.total)}</strong>{dados.meta ? ` / ${numero(dados.meta)} ml` : ' ml registrados'}</p>
      {dados.meta && <><progress max={dados.meta} value={Math.min(dados.total, dados.meta)} aria-label="Progresso da meta de água" /><p className="agua-progresso">{dados.total >= dados.meta ? 'Meta atingida' : `${numero(dados.meta - dados.total)} ml para sua meta`}</p></>}
      <div className="agua-acoes"><button type="button" disabled={desabilitado} onClick={() => adicionar(200)}>+ 200 ml</button><button type="button" disabled={desabilitado} onClick={() => adicionar(300)}>+ 300 ml</button><button type="button" disabled={desabilitado} onClick={() => { setModo('quantidade'); setValor(''); }}>Outro valor</button>
        {dados.ultimo && <button type="button" className="agua-link" disabled={desabilitado} onClick={() => salvar('DELETE', '/ultimo', { data, id: dados.ultimo.id })}><RotateCcw size={15} aria-hidden="true" />Desfazer {numero(dados.ultimo.ml)} ml</button>}</div>
      {modo && <form className="agua-form" onSubmit={e => { e.preventDefault(); modo === 'meta' ? salvar('PUT', '/meta', { data, ml: valor === '' ? null : Number(valor) }) : adicionar(Number(valor)); }}>
        <label>{modo === 'meta' ? 'Meta diária em ml (opcional)' : 'Quantidade em ml'}<input autoFocus type="number" min="1" max="10000" step="1" required={modo !== 'meta'} value={valor} disabled={desabilitado} onChange={e => setValor(e.target.value)} placeholder={modo === 'meta' ? 'Sem meta' : 'Ex.: 500'} /></label>
        {modo === 'meta' && <p>Vale a partir de {formatarData(data)} até sua próxima mudança de meta. Dias anteriores não mudam. Deixe em branco para acompanhar sem meta.</p>}
        <div className="agua-acoes"><button type="submit" disabled={desabilitado}>{modo === 'meta' ? 'Salvar meta' : 'Registrar água'}</button><button type="button" disabled={ocupado} onClick={() => setModo(null)}>Cancelar</button></div>
      </form>}
    </> : !erro && <p role="status">Carregando água do dia…</p>}
    {ocupado && <p role="status">Salvando…</p>}
    {erro && <div role="alert"><p>{erro}</p><button type="button" disabled={ocupado} onClick={() => { if (pendente.current) salvar(); else { setErro(''); setTentativa(n => n + 1); } }}>Tentar novamente</button><button type="button" disabled={ocupado} onClick={() => { pendente.current = null; setDados(null); setErro(''); setTentativa(n => n + 1); }}>Atualizar card</button></div>}
  </section>;
}

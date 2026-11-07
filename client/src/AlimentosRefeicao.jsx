import { Plus, Trash2 } from 'lucide-react';
import { lerAlimentos } from './alimentos-refeicao.js';

export function ListaAlimentos({ texto }) {
  const { alimentos, detalhe } = lerAlimentos(texto);
  return <div className="ali-alimentos"><ul className="ali-lista-alimentos">{alimentos.map(a => <li key={a.id}><span>{a.nome}</span>{a.quantidade && <span className="ali-quantidade">{a.quantidade}</span>}</li>)}</ul>{detalhe && <p className="ali-detalhe">{detalhe}</p>}</div>;
}

export default function AlimentosRefeicao({ form, alterar }) {
  const editar = (id, campo, valor) => alterar('alimentos', form.alimentos.map(a => a.id === id ? { ...a, [campo]: valor } : a));
  return <section className="ali-editor-alimentos" aria-label="Alimentos da refeição">
    <h2>O que vai na refeição?</h2><p className="ali-ajuda">Adicione os alimentos. As quantidades são opcionais.</p>
    <div className="ali-itens-editor">{form.alimentos.map((a, i) => <div className="ali-item-editor" key={a.id}>
      <label>Alimento {i + 1}<input required maxLength={4000} value={a.nome} onChange={e => editar(a.id, 'nome', e.target.value)} placeholder="Ex.: Maçã" /></label>
      <label>Quantidade · opcional<input maxLength={4000} value={a.quantidade} onChange={e => editar(a.id, 'quantidade', e.target.value)} placeholder="Ex.: 1 unidade" /></label>
      <button type="button" className="ali-icone ali-remover-alimento" disabled={form.alimentos.length === 1} aria-label={`Remover alimento ${i + 1}`} onClick={() => alterar('alimentos', form.alimentos.filter(item => item.id !== a.id))}><Trash2 size={18} /></button>
    </div>)}</div>
    <button type="button" className="ali-discreto" onClick={() => { const id = Math.max(...form.alimentos.map(a => a.id)) + 1; alterar('alimentos', [...form.alimentos, { id, nome: '', quantidade: '' }]); requestAnimationFrame(() => document.querySelector('.ali-item-editor:last-child input')?.focus()); }}><Plus size={16} />Adicionar alimento</button>
    {form.mostrarDetalhe ? <label className="ali-observacao-planejada">Observação · opcional<textarea maxLength={4000} value={form.detalhe} onChange={e => alterar('detalhe', e.target.value)} placeholder="Ex.: preparar na noite anterior" /></label> : <button type="button" className="ali-discreto ali-adicionar-observacao" onClick={() => alterar('mostrarDetalhe', true)}>Adicionar observação</button>}
  </section>;
}

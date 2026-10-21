import { useEffect, useId, useRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { erroSenhaNova, requisitosSenha, nivelSenha } from '../../shared/politica-senha.js';
import './senha-nova.css';

export default function SenhaNova({ rotulo = 'Senha', nome = 'senha' }) {
  const id = useId(), senha = useRef(null), confirmacao = useRef(null);
  const [mostrar, definirMostrar] = useState(false);
  const [valor, definirValor] = useState('');
  const [estimador, definirEstimador] = useState(null), [falhou, definirFalhou] = useState(false);
  useEffect(() => {
    let ativo = true;
    import('zxcvbn').then(m => { if (ativo) definirEstimador(() => m.default); }).catch(() => { if (ativo) definirFalhou(true); });
    return () => { ativo = false; };
  }, []);
  const nivel = valor && estimador ? nivelSenha(valor, estimador([...valor].slice(0, 128).join(''), ['dayvilo', 'senha', 'senhasegura', 'minhasenha', 'bemvindo']).score) : 0;
  const [divergente, definirDivergente] = useState(false);
  function conferir(mostrarErro = false) {
    const valor = senha.current.value, repetida = confirmacao.current.value;
    definirValor(valor);
    senha.current.setCustomValidity(valor ? erroSenhaNova(valor) : '');
    const diferentes = Boolean(repetida && valor !== repetida);
    confirmacao.current.setCustomValidity(diferentes ? 'As senhas não coincidem. Confira a confirmação.' : '');
    definirDivergente(atual => diferentes && (mostrarErro || atual));
  }
  return <>
    <label htmlFor={id}>{rotulo}</label>
    <div className="campo-senha acesso-senha-nova"><input ref={senha} id={id} name={nome} type={mostrar ? 'text' : 'password'} autoComplete="new-password" autoCapitalize="none" spellCheck={false} maxLength={256} required aria-describedby={`${id}-dica`} onInput={() => conferir()} /><button type="button" onClick={() => definirMostrar(!mostrar)} aria-label={mostrar ? 'Ocultar as senhas' : 'Mostrar as senhas'} aria-pressed={mostrar}>{mostrar ? <EyeOff size={19} aria-hidden="true" /> : <Eye size={19} aria-hidden="true" />}</button></div>
    <div className="senha-orientacao" id={`${id}-dica`}>
      <ul className="senha-requisitos">{requisitosSenha(valor).map(r => <li key={r.texto} data-atende={r.atende}><span aria-hidden="true">{r.atende ? '✓' : '○'}</span>{r.texto}<span className="senha-sr">{r.atende ? ' — atendido' : ' — pendente'}</span></li>)}</ul>
      {valor && <div className="senha-forca" data-nivel={nivel}><div className="senha-barras" aria-hidden="true">{[1, 2, 3].map(n => <span key={n} data-ativa={nivel >= n} />)}</div><p role="status">{nivel ? `Força estimada: ${['', 'Fraca', 'Média', 'Forte'][nivel]}` : falhou ? 'Indicador indisponível. Confira os requisitos acima.' : 'Avaliando a senha…'}</p></div>}
      <p>Prefira 15 ou mais caracteres e evite nomes, datas e sequências. A força é uma estimativa, não uma garantia.</p>
    </div>
    <label htmlFor={`${id}-confirmacao`}>Confirme {rotulo === 'Nova senha' ? 'a nova senha' : 'sua senha'}</label>
    <input className="acesso-confirmar-senha" ref={confirmacao} id={`${id}-confirmacao`} name="confirmacao" type={mostrar ? 'text' : 'password'} autoComplete="new-password" autoCapitalize="none" spellCheck={false} maxLength={256} required onInput={() => conferir()} onBlur={() => conferir(true)} aria-invalid={divergente || undefined} aria-describedby={divergente ? `${id}-erro` : undefined} />
    {divergente && <p id={`${id}-erro`} className="mensagem-erro" role="alert">As senhas não coincidem. Confira a confirmação.</p>}
  </>;
}

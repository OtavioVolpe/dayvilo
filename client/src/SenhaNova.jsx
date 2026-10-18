import { useId, useRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function SenhaNova({ rotulo = 'Senha' }) {
  const id = useId(), senha = useRef(null), confirmacao = useRef(null);
  const [mostrar, definirMostrar] = useState(false);
  const [quantidade, definirQuantidade] = useState(0);
  const [divergente, definirDivergente] = useState(false);
  function conferir(mostrarErro = false) {
    const valor = senha.current.value, repetida = confirmacao.current.value;
    const tamanho = [...valor].length;
    definirQuantidade(tamanho);
    senha.current.setCustomValidity(valor && (tamanho < 15 || tamanho > 128) ? 'Use uma senha com 15 a 128 caracteres. Pode ser uma frase.' : '');
    const diferentes = Boolean(repetida && valor !== repetida);
    confirmacao.current.setCustomValidity(diferentes ? 'As senhas não coincidem. Confira a confirmação.' : '');
    definirDivergente(atual => diferentes && (mostrarErro || atual));
  }
  return <>
    <label htmlFor={id}>{rotulo}</label>
    <div className="campo-senha acesso-senha-nova"><input ref={senha} id={id} name="senha" type={mostrar ? 'text' : 'password'} autoComplete="new-password" autoCapitalize="none" spellCheck={false} maxLength={256} required aria-describedby={`${id}-dica`} onInput={() => conferir()} /><button type="button" onClick={() => definirMostrar(!mostrar)} aria-label={mostrar ? 'Ocultar as senhas' : 'Mostrar as senhas'} aria-pressed={mostrar}>{mostrar ? <EyeOff size={19} aria-hidden="true" /> : <Eye size={19} aria-hidden="true" />}</button></div>
    <p className="acesso-dica acesso-regra-senha" id={`${id}-dica`}>Use de 15 a 128 caracteres. Uma frase longa também funciona.{quantidade > 0 && <span>{quantidade < 15 ? `Faltam ${15 - quantidade} caracteres para o mínimo.` : quantidade <= 128 ? 'Comprimento mínimo atingido.' : 'A senha ultrapassou 128 caracteres.'}</span>}</p>
    <label htmlFor={`${id}-confirmacao`}>Confirme {rotulo === 'Nova senha' ? 'a nova senha' : 'sua senha'}</label>
    <input className="acesso-confirmar-senha" ref={confirmacao} id={`${id}-confirmacao`} name="confirmacao" type={mostrar ? 'text' : 'password'} autoComplete="new-password" autoCapitalize="none" spellCheck={false} maxLength={256} required onInput={() => conferir()} onBlur={() => conferir(true)} aria-invalid={divergente || undefined} aria-describedby={divergente ? `${id}-erro` : undefined} />
    {divergente && <p id={`${id}-erro`} className="mensagem-erro" role="alert">As senhas não coincidem. Confira a confirmação.</p>}
  </>;
}

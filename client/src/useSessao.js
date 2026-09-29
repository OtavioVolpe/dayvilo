import { useCallback, useEffect, useRef, useState } from 'react';
import { definirCsrf, solicitar } from './api.js';

export function useSessao() {
  const [sessao, definirSessao] = useState(undefined);
  const [erro, definirErro] = useState('');
  const [aviso, definirAviso] = useState('');
  const [saindo, definirSaindo] = useState(false);
  const canal = useRef(null);
  const versao = useRef(0);

  const atualizar = useCallback(async () => {
    const consulta = ++versao.current;
    definirErro('');
    try {
      const dados = await solicitar('/contas/sessao');
      if (consulta !== versao.current) return;
      definirCsrf(dados.csrf); definirSessao(dados.usuario);
    } catch (falha) {
      if (consulta === versao.current) definirErro(falha.message);
    }
  }, []);

  useEffect(() => {
    atualizar();
    const expirar = () => {
      versao.current++; definirCsrf(''); definirSessao(null);
      definirAviso('Sua sessão terminou. Entre novamente para continuar.');
    };
    const sincronizar = () => { definirSessao(undefined); atualizar(); };
    window.addEventListener('dayvilo:sessao-expirada', expirar);
    window.addEventListener('focus', atualizar);
    if ('BroadcastChannel' in window) {
      canal.current = new BroadcastChannel('dayvilo-conta');
      canal.current.onmessage = sincronizar;
    }
    return () => {
      versao.current++;
      window.removeEventListener('dayvilo:sessao-expirada', expirar);
      window.removeEventListener('focus', atualizar);
      canal.current?.close();
    };
  }, [atualizar]);

  function entrar(dados) {
    versao.current++; definirCsrf(dados.csrf); definirSessao(dados.usuario);
    definirAviso(dados.aviso_confirmacao || ''); definirErro(''); canal.current?.postMessage('atualizar');
  }
  async function sair() {
    if (saindo) return;
    definirSaindo(true); definirErro('');
    try {
      await solicitar('/contas/saida', { method: 'POST' });
      versao.current++; definirCsrf(''); definirSessao(null); definirAviso('');
      canal.current?.postMessage('atualizar');
    } catch (falha) { definirErro(falha.message); }
    finally { definirSaindo(false); }
  }
  return { sessao, erro, aviso, saindo, entrar, sair, atualizar };
}

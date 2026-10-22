import { ArrowRight, BookOpen, Check, Clock3, Dumbbell, House, Sun, Utensils, Wallet } from 'lucide-react';
import { useEffect } from 'react';
import { abrirPrivacidade, registrarEvento } from './analytics.js';
import './apresentacao.css';

const areas = [
  [Sun, 'Rotina', 'Veja o que fazer hoje, organize a semana e consulte seu histórico.'],
  [House, 'Casa', 'Organize os cuidados da casa e os dias em que cada tarefa se repete.'],
  [Dumbbell, 'Treino', 'Monte suas fichas e consulte pesos e repetições dos treinos anteriores.'],
  [Wallet, 'Financeiro', 'Acompanhe entradas, despesas e aportes, com consulta por mês.'],
  [Utensils, 'Alimentação', 'Planeje suas refeições e registre a água que bebe ao longo do dia.'],
  [BookOpen, 'Leitura', 'Organize seus livros, planeje as leituras e guarde suas anotações.'],
];

export default function Apresentacao({ cadastroAberto }) {
  useEffect(() => { if (window.location.hash !== '#conhecer-dayvilo') window.scrollTo(0, 0); }, []);
  const destino = cadastroAberto ? '#criar-conta' : '#entrar';
  return <main className="apresentacao" onClick={e => { if (e.target.closest('a')?.getAttribute('href') === '#criar-conta') registrarEvento('start_signup'); }}>
    <section className="apresentacao-hero" aria-labelledby="apresentacao-titulo">
      <div className="apresentacao-convite">
        <p className="apresentacao-etiqueta">Um espaço para o seu dia a dia</p>
        <h1 id="apresentacao-titulo">Seu dia,<br /><span>no seu ritmo.</span></h1>
        <p className="apresentacao-descricao">Organize sua rotina, seus treinos e seu dinheiro em um só lugar. Com espaço também para a casa, a alimentação e a leitura.</p>
        <div className="apresentacao-acoes"><a className="botao-principal" href={destino}>{cadastroAberto ? 'Criar minha conta' : 'Entrar na minha conta'}<ArrowRight size={18} aria-hidden="true" /></a><a className="apresentacao-link" href="#conhecer-dayvilo">Conhecer o Dayvilo</a></div>
        <p className="apresentacao-nota">{cadastroAberto ? 'Comece pelo que faz sentido para você. Não precisa configurar tudo de uma vez.' : 'Novos cadastros estão temporariamente fechados. Quem já tem conta pode continuar entrando.'}</p>
      </div>
      <figure className="apresentacao-previa">
        <div className="apresentacao-previa-topo"><span><Sun size={18} aria-hidden="true" /> Minha rotina</span><span>Hoje</span></div>
        <p className="apresentacao-previa-frase">Um dia com espaço para você.</p>
        <ul className="apresentacao-tarefas">
          <li><span className="apresentacao-check"><Check size={15} aria-hidden="true" /></span><div><strong>Cuidar da casa</strong><small><House size={14} aria-hidden="true" />Casa <span>·</span> Concluída</small></div></li>
          <li><span className="apresentacao-check apresentacao-check-vazio" aria-hidden="true" /><div><strong>Treino B - Perna</strong><small><Dumbbell size={14} aria-hidden="true" />Treino <span>·</span> 18:00</small></div><ArrowRight size={17} aria-hidden="true" /></li>
          <li><span className="apresentacao-check apresentacao-check-vazio" aria-hidden="true" /><div><strong>Ler mais um capítulo</strong><small><BookOpen size={14} aria-hidden="true" />Leitura <span>·</span> 21:00</small></div><ArrowRight size={17} aria-hidden="true" /></li>
        </ul>
        <div className="apresentacao-previa-rodape"><Clock3 size={15} aria-hidden="true" /> Um passo de cada vez.</div>
        <figcaption>Exemplo ilustrativo de uma rotina no Dayvilo.</figcaption>
      </figure>
    </section>
    <section id="conhecer-dayvilo" className="apresentacao-areas" aria-labelledby="apresentacao-areas-titulo">
      <p className="apresentacao-etiqueta">Tudo encontra seu lugar</p>
      <h2 id="apresentacao-areas-titulo">As partes do seu dia, mais organizadas.</h2>
      <p>Use as áreas que ajudam você. As outras continuam disponíveis para quando precisar.</p>
      <div className="apresentacao-grade">{areas.map(([Icone, nome, descricao]) => <article key={nome}><Icone size={23} aria-hidden="true" /><h3>{nome}</h3><p>{descricao}</p></article>)}</div>
    </section>
    <section className="apresentacao-final" aria-labelledby="apresentacao-final-titulo"><div><h2 id="apresentacao-final-titulo">Comece com uma coisa do seu dia.</h2><p>Uma tarefa, um treino ou uma leitura. Seu espaço vai tomando forma com o uso.</p></div><a className="botao-principal" href={destino}>{cadastroAberto ? 'Criar minha conta' : 'Entrar'}<ArrowRight size={18} aria-hidden="true" /></a></section>
    <footer className="apresentacao-rodape"><span>Dayvilo · Seu dia, no seu ritmo.</span><button type="button" className="botao-secundario" onClick={abrirPrivacidade}>Privacidade</button><a href="#entrar">Já tenho uma conta</a></footer>
  </main>;
}

import { useEffect, useRef } from 'react';
import { ArrowRight, BookOpen, Dumbbell, House, Sun, Utensils, Wallet } from 'lucide-react';
import './boas-vindas.css';

const opcoes = [
  { area: 'Rotina', destino: 'Hoje', Icone: Sun, texto: 'Organizar o que preciso fazer', detalhe: 'Comece adicionando uma tarefa ao seu dia.' },
  { area: 'Casa', destino: 'Casa', Icone: House, texto: 'Cuidar das tarefas da casa', detalhe: 'Escolha os cuidados e os dias em que eles se repetem.' },
  { area: 'Treino', destino: 'Treino', Icone: Dumbbell, texto: 'Acompanhar meus treinos', detalhe: 'Monte sua primeira ficha e registre pesos e repetições.' },
  { area: 'Financeiro', destino: 'Financeiro', Icone: Wallet, texto: 'Organizar meu dinheiro', detalhe: 'Registre uma entrada, despesa ou aporte em investimento.' },
  { area: 'Alimentação', destino: 'Alimentação', Icone: Utensils, texto: 'Planejar minha alimentação', detalhe: 'Adicione uma refeição ou registre a água do dia.' },
  { area: 'Leitura', destino: 'Leitura', Icone: BookOpen, texto: 'Reservar um tempo para ler', detalhe: 'Adicione um livro e organize suas próximas leituras.' },
];

// Marcador de apresentação, sem dados pessoais e sem efeito nas permissões da conta.
export function orientarNovaConta(id) {
  try { localStorage.setItem(`dayvilo-boas-vindas-${id}`, 'pendente'); } catch { /* A escolha continua disponível nesta sessão. */ }
}
export function temOrientacaoPendente(id) {
  try { return localStorage.getItem(`dayvilo-boas-vindas-${id}`) === 'pendente'; } catch { return false; }
}
export function concluirOrientacao(id) {
  try { localStorage.removeItem(`dayvilo-boas-vindas-${id}`); } catch { /* Não bloqueia a navegação. */ }
}

export default function BoasVindas({ aoEscolher }) {
  const titulo = useRef(null);
  useEffect(() => { titulo.current?.focus({ preventScroll: true }); window.scrollTo(0, 0); }, []);
  return <section className="boas-vindas" aria-labelledby="boas-vindas-titulo">
    <header><p className="boas-vindas-etiqueta">Seu espaço começa com você</p><h1 id="boas-vindas-titulo" ref={titulo} tabIndex={-1}>Por onde você quer começar?</h1><p>Escolha uma área para explorar. Não precisa configurar tudo agora, e você pode mudar de área quando quiser.</p></header>
    <div className="boas-vindas-opcoes">{opcoes.map(({ area, destino, Icone, texto, detalhe }) => <button key={area} type="button" onClick={() => aoEscolher(destino)} aria-label={`${area}: ${texto}`}><span className="boas-vindas-area"><Icone size={21} aria-hidden="true" />{area}</span><strong>{texto}</strong><span className="boas-vindas-detalhe">{detalhe}</span><span className="boas-vindas-abrir">Abrir {area}<ArrowRight size={16} aria-hidden="true" /></span></button>)}</div>
    <footer><button type="button" className="botao-secundario" onClick={() => aoEscolher('Hoje')}>Pular e ir para a Rotina</button><p>Você pode rever estas opções em Minha conta → Conhecer as áreas.</p></footer>
  </section>;
}

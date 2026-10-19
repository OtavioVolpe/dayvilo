import { Dumbbell, Plus } from 'lucide-react';
import './rotina-vazia.css';
import './treino-vazio.css';

export default function TreinoVazio({ bloqueado, aoCriar }) {
  return <section className="rotina-vazia treino-primeiros-passos" aria-labelledby="treino-vazio-titulo">
    <span className="rotina-vazia-icone"><Dumbbell size={26} aria-hidden="true" /></span>
    <h2 id="treino-vazio-titulo">Seu treino começa com uma ficha.</h2>
    <p>Adicione os exercícios do treino que você já faz. A ficha pode ter musculação, cardio ou os dois.</p>
    <button type="button" className="botao-principal" disabled={bloqueado} onClick={() => aoCriar()}><Plus size={18} aria-hidden="true" />Criar minha ficha</button>
    <ol className="treino-passos"><li><strong>1. Monte a ficha</strong><span>Dê um nome e preencha seus exercícios. Salvar a ficha não marca nenhum dia.</span></li><li><strong>2. Escolha quando treinar</strong><span>Use Agendar para escolher os dias da semana e até quando repetir. Os treinos aparecem também na Rotina.</span></li><li><strong>3. Registre o que fez</strong><span>Abra o treino do dia para anotar pesos e repetições, ou tempo e distância no cardio.</span></li></ol>
    <div className="rotina-vazia-sugestoes"><p>Quer começar só com cardio?</p><div><button type="button" disabled={bloqueado} onClick={() => aoCriar('cardio')}>Montar uma ficha de cardio</button></div><small>O formulário começa com uma atividade de cardio em branco. Você escolhe o nome, preenche os detalhes e salva.</small></div>
  </section>;
}

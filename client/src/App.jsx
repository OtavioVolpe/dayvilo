import { useState } from 'react';
import Planejamento from './Planejamento.jsx';
import { Sprout, Sun, Utensils, Dumbbell, BookOpen } from 'lucide-react';

const areas = [
  { name: 'Rotina', icon: Sun },
  { name: 'Alimentação', icon: Utensils },
  { name: 'Treino', icon: Dumbbell },
  { name: 'Leitura', icon: BookOpen },
];

export default function App() {
  const [view, setView] = useState('Hoje');
  const date = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

  return (
    <div className="app-shell">
      <header className="app-header">
        <span className="brand"><span className="brand-mark"><Sprout size={22} aria-hidden="true" /></span>Dayvilo</span>
      </header>
      <div className="app-layout">
        <nav className="areas" aria-label="Áreas pessoais">
          <p className="areas-label">Seu espaço</p>
          {areas.map(({ name, icon: Icon }) => (
            <button key={name} disabled={name !== 'Rotina'} aria-current={name === 'Rotina' ? 'page' : undefined} aria-label={name === 'Rotina' ? name : `${name}, indisponível`} onClick={() => setView('Hoje')}>
              <Icon size={20} aria-hidden="true" /><span>{name}</span>
            </button>
          ))}
        </nav>
        <main>
          <nav className="routine-tabs" aria-label="Visualizações da rotina">
            {['Hoje', 'Semana', 'Histórico'].map(item => <button key={item} aria-pressed={view === item} onClick={() => setView(item)}>{item}</button>)}
          </nav>
          <header className="page-heading">
            <p className="date-label">{date}</p>
            <h1>{view === 'Hoje' ? 'Seu dia, no seu ritmo.' : view === 'Semana' ? 'Uma semana possível.' : 'Um dia de cada vez.'}</h1>
            <p className="subtitle">{view === 'Hoje' ? 'Espaço para o que importa hoje.' : view === 'Semana' ? 'Uma visão dos seus próximos dias.' : 'Reveja o que fez parte da sua rotina.'}</p>
          </header>
          <Planejamento key={view} semanal={view === 'Semana'} historico={view === 'Histórico'} />
        </main>
      </div>
    </div>
  );
}


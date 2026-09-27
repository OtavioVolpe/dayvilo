import { Circle, CircleCheck, SkipForward } from 'lucide-react';

const situacoes = {
  pendente: { texto: 'Pendente', Icone: Circle },
  concluida: { texto: 'Concluída', Icone: CircleCheck },
  pulada: { texto: 'Pulada', Icone: SkipForward },
};

export default function SeloSituacao({ situacao, id }) {
  const { texto, Icone } = situacoes[situacao];
  return <span id={id} className={`selo-situacao selo-${situacao}`}>
    <Icone size={14} aria-hidden="true" />{texto}
  </span>;
}

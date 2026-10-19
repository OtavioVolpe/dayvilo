import { ArrowDownLeft, ArrowUpRight, Landmark, Plus, Wallet } from 'lucide-react';
import { formatarData } from './datas.js';
import './financeiro-vazio.css';

export default function FinanceiroVazio({ carteira = false, mes, temInvestimentos, bloqueado, aoLancamento, aoInvestimento }) {
  return <section className="financeiro-inicio" aria-labelledby="financeiro-inicio-titulo">
    <span className="financeiro-inicio-icone">{carteira ? <Landmark size={26} aria-hidden="true" /> : <Wallet size={26} aria-hidden="true" />}</span>
    <h2 id="financeiro-inicio-titulo">{carteira ? 'Dê um lugar aos seus investimentos.' : 'Comece com uma movimentação do mês.'}</h2>
    <p>{carteira ? 'Cadastre um investimento que você já tem, com o nome e o banco ou a corretora. Depois, registre seus aportes e o valor da posição.' : `Ainda não há lançamentos em ${formatarData(mes + '-01', { month: 'long', year: 'numeric' })}. Escolha o que quer registrar e preencha os detalhes.`}</p>
    {carteira ? <>
      <button className="botao-principal" type="button" disabled={bloqueado} onClick={aoInvestimento}><Plus size={18} aria-hidden="true" />Cadastrar meu investimento</button>
      <p className="financeiro-inicio-nota">O cadastro abre em renda fixa; você pode mudar para renda variável. Salvar o investimento não cria uma movimentação financeira.</p>
    </> : <div className="financeiro-inicio-opcoes">
      <button type="button" disabled={bloqueado} onClick={() => aoLancamento('receita')}><span className="fin-entrada"><ArrowDownLeft size={20} aria-hidden="true" />Receita</span><strong>Registrar uma entrada</strong><small>Dinheiro recebido ou que você espera receber.</small></button>
      <button type="button" disabled={bloqueado} onClick={() => aoLancamento('despesa')}><span className="fin-saida"><ArrowUpRight size={20} aria-hidden="true" />Despesa</span><strong>Registrar um gasto</strong><small>Uma compra ou conta, já paga ou ainda pendente.</small></button>
      <button type="button" disabled={bloqueado} onClick={() => temInvestimentos ? aoLancamento('aporte') : aoInvestimento()}><span className="fin-aporte"><Landmark size={20} aria-hidden="true" />Aporte</span><strong>{temInvestimentos ? 'Registrar um aporte' : 'Cadastrar um investimento'}</strong><small>{temInvestimentos ? 'Dinheiro destinado a um investimento, separado das despesas.' : 'Antes de registrar um aporte, cadastre o investimento que receberá o dinheiro.'}</small></button>
    </div>}
    {!carteira && <p className="financeiro-inicio-nota">Você revisa a data, o valor e a situação antes de salvar. Nenhum lançamento é criado só por escolher uma opção.</p>}
  </section>;
}

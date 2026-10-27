import React from 'react';
import { createRoot } from 'react-dom/client';
import SitePublico from './SitePublico.jsx';
import { destinoLegado } from './rota-site-publico.js';
import './styles.css';

const urlApp = __DAYVILO_APP__;
// Domínios de prévia e localhost não entram nas estatísticas de produção.
if (window.location.hostname !== 'dayvilo.com.br') document.querySelector('meta[name="dayvilo-analytics"]')?.remove();
const destino = () => destinoLegado(window.location.hash, urlApp,
  window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true);
const redirecionamento = destino();
if (redirecionamento) window.location.replace(redirecionamento);
else {
  // Não importa App/useSessao: a apresentação não consulta nem acorda a API.
  createRoot(document.getElementById('root')).render(<SitePublico urlApp={urlApp} cadastroAberto={__DAYVILO_CADASTRO__} />);
  window.addEventListener('hashchange', () => { const url = destino(); if (url) window.location.replace(url); });
}

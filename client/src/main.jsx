import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { aplicarTema, lerTema } from './MinhaConta.jsx';
import './styles.css';
import './planejamento.css';

aplicarTema(lerTema());

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);

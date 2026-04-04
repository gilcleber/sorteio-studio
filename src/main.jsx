import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

console.log("APP START - BROWSER ENGINE INITIALIZED");

// --- DEBUG SAFETY NET (PATCH PARA ERRO removeChild) ---
// Sobrescreve removeChild para evitar crash por conflito de DOM (comum em React + Extensões/Electron)
const originalRemoveChild = Node.prototype.removeChild;
Node.prototype.removeChild = function (child) {
  if (child.parentNode !== this) {
    if (console) console.warn('⚠️ Ignorando erro removeChild: O nó não é filho deste pai.');
    return child;
  }
  return originalRemoveChild.apply(this, arguments);
};

// Captura erros globais pesados que explodem o hydration do React
window.onerror = function (msg, url, line, col, error) {
  console.error("ERRO GLOBAL FATAL:", msg, url, line, error);
  if (typeof msg === 'string' && (msg.includes('removeChild') || msg.includes('ResizeObserver'))) return true;
  // Opcional: Mostrar outros erros na tela se desejar, ou deixar pro console
  return false;
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

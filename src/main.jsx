import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// O app foi escrito usando window.storage (armazenamento do Claude).
// Aqui fora do Claude, essa mesma API é implementada usando o localStorage
// do próprio navegador, para que o app funcione exatamente igual, mas
// salvando os dados neste computador/dispositivo.
window.storage = {
  async get(key) {
    const raw = localStorage.getItem(key);
    if (raw === null) throw new Error('not found');
    return { key, value: raw };
  },
  async set(key, value) {
    localStorage.setItem(key, value);
    return { key, value };
  },
  async delete(key) {
    localStorage.removeItem(key);
    return { key, deleted: true };
  },
  async list(prefix) {
    const keys = Object.keys(localStorage).filter((k) => !prefix || k.startsWith(prefix));
    return { keys };
  },
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { applyTheme } from './components/Header';
import { storage } from './lib/util';
import './styles.css';

const saved = storage.get('jb-theme');
applyTheme(saved === 'light' || saved === 'dark' ? saved : null);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

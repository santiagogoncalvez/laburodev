import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import '@fontsource-variable/bricolage-grotesque';
import './index.css';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('No se encontró el contenedor #root');
}

createRoot(rootElement).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
);

import { BrowserRouter } from 'react-router'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/bricolage-grotesque'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
)

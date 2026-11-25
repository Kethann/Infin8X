import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/unbounded/latin-500.css';
import '@fontsource/space-grotesk/latin-500.css';
import '@fontsource/inter/latin-400.css';
import '@fontsource-variable/manrope/wght.css';
import '@fontsource-variable/bricolage-grotesque/opsz.css';
import './styles/globals.css';
import { App } from './App';


createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);

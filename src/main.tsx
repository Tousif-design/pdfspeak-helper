
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import './fonts.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(<App />);

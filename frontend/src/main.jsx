import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { LangProvider } from './useLang';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LangProvider>
      <App />
    </LangProvider>
  </React.StrictMode>
);
 
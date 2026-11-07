import React from 'react';
import ReactDOM from 'react-dom/client';
import ManorWorld from './world/ManorWorld';
import '@fontsource/be-vietnam-pro/400.css';
import '@fontsource/be-vietnam-pro/500.css';
import '@fontsource/be-vietnam-pro/600.css';
import '@fontsource/libre-caslon-display/400.css';
import './styles.css';
import { batGoiY } from './goi-y';

batGoiY();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><ManorWorld /></React.StrictMode>,
);

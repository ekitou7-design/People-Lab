import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './v2/WorkbenchApp';
import './v2/v2.css';
import './v2/pages.css';
import './v2/WorkspaceTheme.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>,
);

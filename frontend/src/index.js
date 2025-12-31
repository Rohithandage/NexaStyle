import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));

// Disable StrictMode in production to avoid double renders on mobile
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction) {
  root.render(<App />);
} else {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}



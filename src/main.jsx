import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'    // Alterado de '@/App.jsx' para './App.jsx'
import './index.css'          // Alterado de '@/index.css' para './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
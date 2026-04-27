import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import PowerProvider from '@/PowerProvider.tsx'
import '@/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <PowerProvider>
    <App />
  </PowerProvider>
)

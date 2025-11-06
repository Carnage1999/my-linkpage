import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles.css'
import './i18n.js' // 初始化 i18n（必須在 App 前 import）

createRoot(document.getElementById('root')).render(<App />)

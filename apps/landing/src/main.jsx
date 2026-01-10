import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import Front from './pages/Front.jsx'
import LandingPage from './pages/LandingPage.jsx'
import IdCard from './pages/IdCard.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/team" element={<IdCard />} />
      </Routes>
    </HashRouter>
  </StrictMode>,
)

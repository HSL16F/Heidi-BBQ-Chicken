import { Routes, Route } from 'react-router-dom'
import Home from './components/Home'
import ReferralForm from './components/ReferralForm'
import './App.css'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/referral" element={<div className="app"><ReferralForm /></div>} />
    </Routes>
  )
}

export default App

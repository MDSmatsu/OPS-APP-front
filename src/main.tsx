
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Dashboard from './pages/Dashboard'
import WorkOrders from './pages/WorkOrders'
import Results from './pages/Results'
import Inventory from './pages/Inventory'
import Purchasing from './pages/Purchasing'
import Stocktake from './pages/Stocktake'
import Masters from './pages/Masters'
import Homework from './pages/Homework'
import './styles.css'

const qc = new QueryClient()

function App() {
  return (
    <div className="container">
      <h1>業務効率化アプリ Full</h1>
      <nav>
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/work-orders">指示書</Link>
        <Link to="/results">実績</Link>
        <Link to="/inventory">在庫</Link>
        <Link to="/purchasing">発注</Link>
        <Link to="/stocktake">棚卸</Link>
        <Link to="/masters">マスタ</Link>
        <Link to="/homework">内職</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Dashboard/>} />
        <Route path="/dashboard" element={<Dashboard/>} />
        <Route path="/work-orders" element={<WorkOrders/>} />
        <Route path="/results" element={<Results/>} />
        <Route path="/inventory" element={<Inventory/>} />
        <Route path="/purchasing" element={<Purchasing/>} />
        <Route path="/stocktake" element={<Stocktake/>} />
        <Route path="/masters" element={<Masters/>} />
        <Route path="/homework" element={<Homework/>} />
      </Routes>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <BrowserRouter><App/></BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
)

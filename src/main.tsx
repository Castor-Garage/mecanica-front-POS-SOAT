import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { TrackOrder } from './TrackOrder.tsx'
import { Payment } from './Payment.tsx'
import { PaymentSuccess } from './PaymentSuccess.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/acompanhar" element={<TrackOrder />} />
        <Route path="/pagamento" element={<Payment />} />
        <Route path="/pagamento/sucesso" element={<PaymentSuccess />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)

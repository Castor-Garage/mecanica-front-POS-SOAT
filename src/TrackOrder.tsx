import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

type TrackedOrder = {
  id: string
  orderNumber: string
  status: string
  problemDescription: string | null
  diagnosis: string | null
  quoteTotalAmount: number | null
  client: { name: string; document: string; phone: string }
  vehicle: { licensePlate: string; brand: string; model: string; year: number }
  items: { id: string; serviceName: string; quantity: number; unitPrice: number }[]
  parts: { id: string; partName: string; quantity: number; unitPrice: number }[]
}

const STATUS_LABELS: Record<string, string> = {
  RECEBIDA: 'Recebida',
  EM_DIAGNOSTICO: 'Em diagnóstico',
  AGUARDANDO_APROVACAO: 'Aguardando aprovação',
  EM_EXECUCAO: 'Em execução',
  FINALIZADA: 'Finalizada',
  ENTREGUE: 'Entregue',
}

function money(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function TrackOrder() {
  const [trackingId, setTrackingId] = useState('OS-')
  const [order, setOrder] = useState<TrackedOrder | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setOrder(null)
    try {
      const response = await fetch(`${API_URL}/service-orders/track/${trackingId.trim()}`)
      if (!response.ok) {
        let message = `Erro ${response.status}`
        try {
          const body = (await response.json()) as { detail?: string; message?: string }
          message = body.detail ?? body.message ?? message
        } catch { /* ignore */ }
        throw new Error(message)
      }
      const data = (await response.json()) as TrackedOrder
      setOrder(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OS não encontrada')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="app-shell login-screen">
      <section className="ink-card login-card">
        <img className="brand-logo" src="/Castor-garage.png" alt="Oficina Castor Garage" />
        <p className="eyebrow">ACOMPANHE SUA OS</p>
        <h1>STATUS DO SERVIÇO</h1>
        <p className="sub">Informe o ID da sua Ordem de Serviço.</p>

        <form onSubmit={handleSubmit} className="grid-form">
          <label>
            ID da OS
            <input
              value={trackingId}
              onChange={(e) => setTrackingId(e.target.value)}
              placeholder="ex: OS-2026-00123"
              required
            />
          </label>
          <button className="btn btn-solid" type="submit" disabled={loading}>
            {loading ? 'Buscando...' : 'Consultar'}
          </button>
        </form>

        {error && <p className="feedback error" style={{ marginTop: '0.75rem' }}>{error}</p>}

        {order && (
          <div className="tracking-result">
            <p className="tracking-number">{order.orderNumber}</p>
            <p className="tracking-status">{STATUS_LABELS[order.status] ?? order.status}</p>
            <div className="tracking-info">
              <p><strong>Cliente:</strong> {order.client.name}</p>
              <p><strong>Veículo:</strong> {order.vehicle.brand} {order.vehicle.model} {order.vehicle.year} — {order.vehicle.licensePlate}</p>
              {order.problemDescription && (
                <p><strong>Problema:</strong> {order.problemDescription}</p>
              )}
              {order.diagnosis && (
                <p><strong>Diagnóstico:</strong> {order.diagnosis}</p>
              )}
              {order.quoteTotalAmount !== null && (
                <p><strong>Orçamento:</strong> {money(order.quoteTotalAmount)}</p>
              )}
            </div>
            {order.items.length > 0 && (
              <>
                <p className="tracking-section-title">Serviços</p>
                <ul className="tracking-list">
                  {order.items.map((item) => (
                    <li key={item.id}>
                      {item.serviceName} × {item.quantity} — {money(item.unitPrice * item.quantity)}
                    </li>
                  ))}
                </ul>
              </>
            )}
            {order.parts.length > 0 && (
              <>
                <p className="tracking-section-title">Peças</p>
                <ul className="tracking-list">
                  {order.parts.map((part) => (
                    <li key={part.id}>
                      {part.partName} × {part.quantity} — {money(part.unitPrice * part.quantity)}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}

        <Link to="/" className="btn" style={{ marginTop: '1rem', width: '100%', textAlign: 'center', textDecoration: 'none', display: 'block' }}>
          Voltar ao login
        </Link>
      </section>
    </main>
  )
}

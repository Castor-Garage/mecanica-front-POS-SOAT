import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
const BILLING_URL = import.meta.env.VITE_BILLING_URL ?? 'http://localhost:3002'

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

  const [showEmailForm, setShowEmailForm] = useState(false)
  const [emailTo, setEmailTo] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailFeedback, setEmailFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [decisionLoading, setDecisionLoading] = useState(false)
  const [decisionFeedback, setDecisionFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [showCheckoutModal, setShowCheckoutModal] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setOrder(null)
    setShowEmailForm(false)
    setEmailFeedback(null)
    setDecisionFeedback(null)
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

  async function handleSendEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!order) return
    setSendingEmail(true)
    setEmailFeedback(null)
    try {
      const response = await fetch(`${API_URL}/service-orders/${order.id}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailTo }),
      })
      if (!response.ok) {
        let message = `Erro ${response.status}`
        try {
          const body = (await response.json()) as { detail?: string; message?: string }
          message = body.detail ?? body.message ?? message
        } catch { /* ignore */ }
        throw new Error(message)
      }
      setEmailFeedback({ type: 'success', text: 'E-mail enviado com sucesso.' })
      setEmailTo('')
    } catch (err) {
      setEmailFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Não foi possível enviar o e-mail',
      })
    } finally {
      setSendingEmail(false)
    }
  }

  async function handleStripeCheckout() {
    if (!order) return
    setCheckoutLoading(true)
    setCheckoutError(null)
    try {
      const description = order.items.length > 0
        ? order.items.map((i) => i.serviceName).join(', ')
        : order.problemDescription ?? 'Serviço automotivo'
      const amount = order.quoteTotalAmount ?? 0
      const res = await fetch(`${BILLING_URL}/debug/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceOrderId: order.id, description, amount }),
      })
      if (!res.ok) {
        const body = (await res.json()) as { detail?: string; message?: string }
        throw new Error(body.detail ?? body.message ?? `Erro ${res.status}`)
      }
      const data = (await res.json()) as { checkoutUrl: string }
      window.open(data.checkoutUrl, '_blank')
      setShowCheckoutModal(false)
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : 'Erro ao criar checkout')
    } finally {
      setCheckoutLoading(false)
    }
  }

  async function handleDecision(action: 'approve' | 'reject') {
    if (!order) return
    setDecisionLoading(true)
    setDecisionFeedback(null)
    try {
      const response = await fetch(`${API_URL}/service-orders/track/${order.orderNumber}/${action}`, {
        method: 'POST',
      })
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
      setDecisionFeedback({
        type: 'success',
        text: action === 'approve' ? 'Orçamento aprovado com sucesso.' : 'Orçamento rejeitado.',
      })
    } catch (err) {
      setDecisionFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Não foi possível registrar sua decisão',
      })
    } finally {
      setDecisionLoading(false)
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

            {order.status === 'AGUARDANDO_APROVACAO' && (
              <div className="action-row" style={{ marginTop: '1rem' }}>
                <button
                  className="btn mini btn-solid"
                  onClick={() => { setShowCheckoutModal(true); setCheckoutError(null) }}
                >
                  Aprovar e Pagar
                </button>
                <button
                  className="btn mini"
                  disabled={decisionLoading}
                  onClick={() => void handleDecision('reject')}
                >
                  Rejeitar
                </button>
              </div>
            )}

            {decisionFeedback && (
              <p
                className={`feedback ${decisionFeedback.type === 'error' ? 'error' : 'success'}`}
                style={{ marginTop: '0.75rem' }}
              >
                {decisionFeedback.text}
              </p>
            )}

            {showCheckoutModal && order && (
              <div style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem',
              }}>
                <div className="ink-card" style={{ width: 'min(460px, 100%)', display: 'grid', gap: '0.75rem' }}>
                  <p className="eyebrow" style={{ margin: 0 }}>Confirmar pagamento</p>
                  <h2 style={{ margin: 0 }}>Resumo do orçamento</h2>

                  <div style={{ display: 'grid', gap: '0.3rem', borderTop: '2px solid var(--line)', paddingTop: '0.6rem' }}>
                    {order.items.map((item) => (
                      <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
                        <span>{item.serviceName} × {item.quantity}</span>
                        <strong>{money(item.unitPrice * item.quantity)}</strong>
                      </div>
                    ))}
                    {order.parts.map((part) => (
                      <div key={part.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
                        <span>{part.partName} × {part.quantity}</span>
                        <strong>{money(part.unitPrice * part.quantity)}</strong>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid var(--line)', paddingTop: '0.6rem' }}>
                    <span style={{ fontFamily: 'Anton, sans-serif', fontSize: '1.1rem', textTransform: 'uppercase' }}>Total</span>
                    <span style={{ fontFamily: 'Anton, sans-serif', fontSize: '1.4rem' }}>{money(order.quoteTotalAmount ?? 0)}</span>
                  </div>

                  {checkoutError && <p className="feedback error" style={{ margin: 0 }}>{checkoutError}</p>}

                  <div className="grid-form">
                    <button
                      className="btn btn-solid"
                      disabled={checkoutLoading}
                      onClick={() => void handleStripeCheckout()}
                    >
                      {checkoutLoading ? 'Aguarde...' : 'Pagar com Stripe'}
                    </button>
                    <button className="btn" onClick={() => setShowCheckoutModal(false)}>
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {!showEmailForm && (
              <button
                type="button"
                className="btn"
                style={{ marginTop: '1rem', width: '100%' }}
                onClick={() => {
                  setShowEmailForm(true)
                  setEmailFeedback(null)
                }}
              >
                Enviar por e-mail
              </button>
            )}

            {showEmailForm && (
              <form onSubmit={handleSendEmail} className="grid-form" style={{ marginTop: '1rem' }}>
                <label>
                  E-mail de destino
                  <input
                    type="email"
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                    placeholder="cliente@exemplo.com"
                    required
                  />
                </label>
                <button className="btn btn-solid" type="submit" disabled={sendingEmail}>
                  {sendingEmail ? 'Enviando...' : 'Enviar'}
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setShowEmailForm(false)
                    setEmailFeedback(null)
                  }}
                >
                  Voltar
                </button>
              </form>
            )}

            {emailFeedback && (
              <p
                className={`feedback ${emailFeedback.type === 'error' ? 'error' : 'success'}`}
                style={{ marginTop: '0.75rem' }}
              >
                {emailFeedback.text}
              </p>
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

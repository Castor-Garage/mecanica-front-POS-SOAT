import { useState, type FormEvent } from 'react'

const BILLING_URL = import.meta.env.VITE_BILLING_URL ?? 'http://localhost:3000'

type CheckoutResult = {
  serviceOrderId: string
  quoteId: string
  paymentId: string
  checkoutUrl: string
}

type Step = 'form' | 'loading' | 'ready' | 'error'

export function Payment() {
  const [description, setDescription] = useState('Manutenção preventiva')
  const [amount, setAmount] = useState('350')
  const [result, setResult] = useState<CheckoutResult | null>(null)
  const [step, setStep] = useState<Step>('form')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setStep('loading')
    setErrorMsg('')

    try {
      const res = await fetch(`${BILLING_URL}/debug/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, amount: parseFloat(amount) }),
      })

      if (!res.ok) {
        const body = (await res.json()) as { detail?: string; message?: string }
        throw new Error(body.detail ?? body.message ?? `Erro ${res.status}`)
      }

      const data = (await res.json()) as CheckoutResult
      setResult(data)
      setStep('ready')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao criar checkout')
      setStep('error')
    }
  }

  function reset() {
    setResult(null)
    setStep('form')
    setErrorMsg('')
  }

  return (
    <main style={styles.shell}>
      <div style={styles.card}>
        <p style={styles.eyebrow}>mecanica-billing-SOAT</p>
        <h1 style={styles.title}>Demo Pagamento Stripe</h1>
        <p style={styles.sub}>Simula o fluxo completo: orçamento → aprovação → checkout</p>

        {step === 'form' || step === 'error' ? (
          <form onSubmit={(e) => void handleSubmit(e)} style={styles.form}>
            <label style={styles.label}>
              Descrição do serviço
              <input
                style={styles.input}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </label>
            <label style={styles.label}>
              Valor (R$)
              <input
                style={styles.input}
                type="number"
                min="1"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </label>
            {step === 'error' && (
              <p style={styles.error}>{errorMsg}</p>
            )}
            <button style={styles.btn} type="submit">
              Gerar Checkout Stripe
            </button>
          </form>
        ) : step === 'loading' ? (
          <div style={styles.center}>
            <p style={styles.muted}>Criando orçamento e sessão Stripe…</p>
          </div>
        ) : result ? (
          <div style={styles.result}>
            <div style={styles.idBox}>
              <span style={styles.idLabel}>Payment ID</span>
              <code style={styles.idValue}>{result.paymentId}</code>
            </div>
            <div style={styles.idBox}>
              <span style={styles.idLabel}>Quote ID</span>
              <code style={styles.idValue}>{result.quoteId}</code>
            </div>
            <a
              href={result.checkoutUrl}
              target="_blank"
              rel="noreferrer"
              style={styles.checkoutBtn}
            >
              Ir para Checkout Stripe →
            </a>
            <p style={styles.hint}>
              Cartão de teste: <code>4242 4242 4242 4242</code> · qualquer data futura · qualquer CVC
            </p>
            <button style={styles.btnSecondary} onClick={reset}>
              Novo pagamento
            </button>
          </div>
        ) : null}
      </div>
    </main>
  )
}

const styles: Record<string, React.CSSProperties> = {
  shell: {
    minHeight: '100vh',
    background: '#0f1117',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1.5rem',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  card: {
    background: '#181c27',
    border: '1px solid #252b3b',
    borderRadius: '12px',
    padding: '2rem',
    width: '100%',
    maxWidth: '460px',
  },
  eyebrow: {
    fontFamily: 'monospace',
    fontSize: '11px',
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    color: '#3b82f6',
    margin: '0 0 0.5rem',
  },
  title: {
    color: '#e2e8f0',
    fontSize: '1.5rem',
    fontWeight: 700,
    margin: '0 0 0.4rem',
  },
  sub: {
    color: '#7c8a9e',
    fontSize: '0.88rem',
    margin: '0 0 1.5rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1rem',
  },
  label: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.4rem',
    color: '#94a3b8',
    fontSize: '0.85rem',
    fontWeight: 500,
  },
  input: {
    background: '#0f1117',
    border: '1px solid #252b3b',
    borderRadius: '6px',
    color: '#e2e8f0',
    padding: '0.6rem 0.75rem',
    fontSize: '0.95rem',
    outline: 'none',
  },
  btn: {
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '0.75rem 1rem',
    fontSize: '0.95rem',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '0.25rem',
  },
  btnSecondary: {
    background: 'transparent',
    color: '#7c8a9e',
    border: '1px solid #252b3b',
    borderRadius: '6px',
    padding: '0.6rem 1rem',
    fontSize: '0.88rem',
    cursor: 'pointer',
    marginTop: '0.5rem',
  },
  error: {
    color: '#ef4444',
    fontSize: '0.85rem',
    margin: 0,
  },
  center: {
    textAlign: 'center' as const,
    padding: '1rem 0',
  },
  muted: {
    color: '#7c8a9e',
    fontSize: '0.9rem',
  },
  result: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.75rem',
  },
  idBox: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.2rem',
  },
  idLabel: {
    color: '#7c8a9e',
    fontSize: '0.75rem',
    fontFamily: 'monospace',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
  },
  idValue: {
    color: '#94a3b8',
    fontSize: '0.78rem',
    wordBreak: 'break-all' as const,
  },
  checkoutBtn: {
    display: 'block',
    background: '#16a34a',
    color: '#fff',
    textDecoration: 'none',
    textAlign: 'center' as const,
    borderRadius: '6px',
    padding: '0.85rem 1rem',
    fontSize: '1rem',
    fontWeight: 700,
    marginTop: '0.25rem',
  },
  hint: {
    color: '#7c8a9e',
    fontSize: '0.82rem',
    margin: 0,
    textAlign: 'center' as const,
  },
}

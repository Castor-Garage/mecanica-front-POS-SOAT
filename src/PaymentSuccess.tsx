import { useState, useEffect } from 'react'
import './App.css'

const REDIRECT_SECONDS = 60

export function PaymentSuccess() {
  const [countdown, setCountdown] = useState(REDIRECT_SECONDS)

  useEffect(() => {
    if (countdown <= 0) {
      window.location.href = '/acompanhar'
      return
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  return (
    <main className="app-shell login-screen">
      <section className="ink-card login-card" style={{ display: 'grid', gap: '1rem' }}>
        <p className="eyebrow" style={{ margin: 0 }}>Pagamento confirmado</p>
        <h1 style={{ lineHeight: 1.1 }}>Parabéns!</h1>
        <p className="sub" style={{ fontSize: '1.05rem' }}>
          Seu pagamento foi realizado com sucesso. Em breve a oficina iniciará o serviço.
        </p>

        <div style={{ borderTop: '2px solid var(--line)', paddingTop: '0.75rem', display: 'grid', gap: '0.3rem' }}>
          <p style={{ margin: 0, fontWeight: 700, textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '0.06rem', color: 'var(--muted)' }}>
            Redirecionando em
          </p>
          <p style={{ margin: 0, fontFamily: 'Anton, sans-serif', fontSize: '2.5rem', lineHeight: 1 }}>
            {countdown}s
          </p>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--muted)' }}>
            Você será levado ao acompanhamento da sua OS automaticamente.
          </p>
        </div>

        <a
          href="/acompanhar"
          className="btn btn-solid"
          style={{ textAlign: 'center', textDecoration: 'none', display: 'block' }}
        >
          Acompanhar OS agora
        </a>
      </section>
    </main>
  )
}

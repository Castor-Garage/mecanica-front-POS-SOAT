import { useEffect, useMemo, useState, type FormEvent } from 'react'
import './App.css'

type Admin = { id: string; name: string; email: string }

type Client = {
  id: string
  name: string
  document: string
  documentType: 'CPF' | 'CNPJ'
  phone: string
  email: string | null
}

type Vehicle = {
  id: string
  licensePlate: string
  brand: string
  model: string
  year: number
  clientId: string
}

type Service = {
  id: string
  name: string
  basePrice: number
  estimatedMinutes: number
  isActive: boolean
}

type Part = {
  id: string
  name: string
  unitPrice: number
  stockQuantity: number
  isActive: boolean
}

type ServiceOrder = {
  id: string
  orderNumber: string
  status: string
  clientId: string
  vehicleId: string
  quoteTotalAmount: number | null
}

type ServiceStat = {
  serviceId: string
  serviceName: string
  completedOrders: number
  avgExecutionMinutes: number
}

type Paginated<T> = { data: T[] }

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const headers = new Headers(options.headers)
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json')
  }
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(`${API_URL}${path}`, { ...options, headers })

  if (!response.ok) {
    let message = `Erro ${response.status}`
    try {
      const body = (await response.json()) as { detail?: string; message?: string }
      message = body.detail ?? body.message ?? message
    } catch {
      // ignore invalid json error payloads
    }
    throw new Error(message)
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

function money(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'))
  const [admin, setAdmin] = useState<Admin | null>(() => {
    const raw = localStorage.getItem('admin')
    return raw ? (JSON.parse(raw) as Admin) : null
  })
  const [email, setEmail] = useState('admin@oficina.com')
  const [password, setPassword] = useState('Admin@123')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [activeView, setActiveView] = useState<'overview' | 'clients' | 'vehicles' | 'services' | 'parts' | 'orders'>('overview')

  const [clients, setClients] = useState<Client[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [parts, setParts] = useState<Part[]>([])
  const [orders, setOrders] = useState<ServiceOrder[]>([])
  const [stats, setStats] = useState<ServiceStat[]>([])

  const [clientForm, setClientForm] = useState({
    name: '',
    document: '',
    documentType: 'CPF' as 'CPF' | 'CNPJ',
    phone: '',
  })
  const [vehicleForm, setVehicleForm] = useState({
    clientId: '',
    licensePlate: '',
    brand: '',
    model: '',
    year: new Date().getFullYear(),
  })
  const [serviceForm, setServiceForm] = useState({ name: '', basePrice: 0, estimatedMinutes: 60 })
  const [partForm, setPartForm] = useState({ name: '', unitPrice: 0, stockQuantity: 0 })
  const [orderForm, setOrderForm] = useState({
    clientId: '',
    vehicleId: '',
    serviceId: '',
    serviceQuantity: 1,
    partId: '',
    partQuantity: 1,
    problemDescription: '',
  })

  const vehicleOptions = useMemo(
    () => vehicles.filter((v) => !orderForm.clientId || v.clientId === orderForm.clientId),
    [vehicles, orderForm.clientId],
  )

  async function loadDashboard(authToken: string) {
    setLoading(true)
    setError(null)
    try {
      const [clientRes, vehicleRes, serviceRes, partRes, orderRes, statsRes] = await Promise.all([
        apiRequest<Paginated<Client>>('/clients?page=1&perPage=20', {}, authToken),
        apiRequest<Paginated<Vehicle>>('/vehicles?page=1&perPage=20', {}, authToken),
        apiRequest<Paginated<Service>>('/services?page=1&perPage=20', {}, authToken),
        apiRequest<Paginated<Part>>('/parts?page=1&perPage=20', {}, authToken),
        apiRequest<Paginated<ServiceOrder>>('/service-orders?page=1&perPage=20', {}, authToken),
        apiRequest<ServiceStat[]>('/service-orders/stats', {}, authToken),
      ])

      setClients(clientRes.data)
      setVehicles(vehicleRes.data)
      setServices(serviceRes.data)
      setParts(partRes.data)
      setOrders(orderRes.data)
      setStats(statsRes)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) {
      void loadDashboard(token)
    }
  }, [token])

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)
    try {
      const response = await apiRequest<{ token: string; admin: Admin }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      localStorage.setItem('token', response.token)
      localStorage.setItem('admin', JSON.stringify(response.admin))
      setToken(response.token)
      setAdmin(response.admin)
      setSuccess('Login realizado.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel logar')
    } finally {
      setLoading(false)
    }
  }

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('admin')
    setToken(null)
    setAdmin(null)
    setSuccess(null)
    setError(null)
  }

  async function createClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      await apiRequest<Client>(
        '/clients',
        { method: 'POST', body: JSON.stringify(clientForm) },
        token,
      )
      setClientForm({ name: '', document: '', documentType: 'CPF', phone: '' })
      setSuccess('Cliente criado.')
      await loadDashboard(token)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar cliente')
    } finally {
      setLoading(false)
    }
  }

  async function createVehicle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      await apiRequest<Vehicle>(
        '/vehicles',
        { method: 'POST', body: JSON.stringify(vehicleForm) },
        token,
      )
      setVehicleForm({
        clientId: '',
        licensePlate: '',
        brand: '',
        model: '',
        year: new Date().getFullYear(),
      })
      setSuccess('Veiculo criado.')
      await loadDashboard(token)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar veiculo')
    } finally {
      setLoading(false)
    }
  }

  async function createService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      await apiRequest<Service>(
        '/services',
        { method: 'POST', body: JSON.stringify(serviceForm) },
        token,
      )
      setServiceForm({ name: '', basePrice: 0, estimatedMinutes: 60 })
      setSuccess('Servico criado.')
      await loadDashboard(token)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar servico')
    } finally {
      setLoading(false)
    }
  }

  async function createPart(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      await apiRequest<Part>('/parts', { method: 'POST', body: JSON.stringify(partForm) }, token)
      setPartForm({ name: '', unitPrice: 0, stockQuantity: 0 })
      setSuccess('Peca criada.')
      await loadDashboard(token)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar peca')
    } finally {
      setLoading(false)
    }
  }

  async function createOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const payload = {
        clientId: orderForm.clientId,
        vehicleId: orderForm.vehicleId,
        problemDescription: orderForm.problemDescription || undefined,
        services: [{ serviceId: orderForm.serviceId, quantity: orderForm.serviceQuantity }],
        parts: orderForm.partId
          ? [{ partId: orderForm.partId, quantity: orderForm.partQuantity }]
          : undefined,
      }
      await apiRequest<ServiceOrder>(
        '/service-orders',
        { method: 'POST', body: JSON.stringify(payload) },
        token,
      )
      setOrderForm({
        clientId: '',
        vehicleId: '',
        serviceId: '',
        serviceQuantity: 1,
        partId: '',
        partQuantity: 1,
        problemDescription: '',
      })
      setSuccess('OS criada.')
      await loadDashboard(token)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar OS')
    } finally {
      setLoading(false)
    }
  }

  async function deleteResource(type: 'clients' | 'vehicles' | 'services' | 'parts', id: string) {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      await apiRequest<void>(`/${type}/${id}`, { method: 'DELETE' }, token)
      setSuccess('Registro removido.')
      await loadDashboard(token)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover registro')
    } finally {
      setLoading(false)
    }
  }

  async function orderAction(id: string, action: 'advance' | 'approve' | 'reject') {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      await apiRequest(`/service-orders/${id}/${action}`, { method: 'POST', body: '{}' }, token)
      setSuccess('OS atualizada.')
      await loadDashboard(token)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar OS')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <main className="app-shell login-screen">
        <section className="ink-card login-card">
          <img className="brand-logo" src="/Castor-garage.png" alt="Oficina do Pastor Garage" />
          <p className="eyebrow">OFICINA PRETO NO BRANCO</p>
          <h1>PAINEL GARAGE</h1>
          <p className="sub">Entre com o admin para consumir a API.</p>
          <p className="sub">API alvo: {API_URL}</p>
          <form onSubmit={handleLogin} className="grid-form">
            <label>
              Email
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
            </label>
            <label>
              Senha
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                required
              />
            </label>
            <button className="btn btn-solid" type="submit" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
          {error && <p className="feedback error">{error}</p>}
        </section>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-head">
          <img className="brand-logo brand-logo-top" src="/Castor-garage.png" alt="Oficina do Pastor Garage" />
          <div>
          <p className="eyebrow">OFICINA PAINEL</p>
          <h1>GARAGE COMMAND</h1>
          <p className="sub">{admin ? `${admin.name} (${admin.email})` : 'Admin conectado'}</p>
          </div>
        </div>
        <div className="toolbar">
          <button className="btn" onClick={() => void loadDashboard(token)} disabled={loading}>
            Atualizar
          </button>
          <button className="btn btn-solid" onClick={logout}>
            Sair
          </button>
        </div>
      </header>

      <nav className="tabs" aria-label="Navegacao">
        {[
          ['overview', 'Resumo'],
          ['clients', 'Clientes'],
          ['vehicles', 'Veiculos'],
          ['services', 'Servicos'],
          ['parts', 'Pecas'],
          ['orders', 'OS'],
        ].map(([value, label]) => (
          <button
            key={value}
            className={`tab ${activeView === value ? 'active' : ''}`}
            onClick={() => setActiveView(value as typeof activeView)}
          >
            {label}
          </button>
        ))}
      </nav>

      {(error || success) && (
        <section className="feedback-wrap">
          {error && <p className="feedback error">{error}</p>}
          {success && <p className="feedback success">{success}</p>}
        </section>
      )}

      {activeView === 'overview' && (
        <section className="panel-grid metrics">
          <article className="ink-card stat">
            <p>Clientes</p>
            <strong>{clients.length}</strong>
          </article>
          <article className="ink-card stat">
            <p>Veiculos</p>
            <strong>{vehicles.length}</strong>
          </article>
          <article className="ink-card stat">
            <p>Servicos</p>
            <strong>{services.length}</strong>
          </article>
          <article className="ink-card stat">
            <p>Pecas</p>
            <strong>{parts.length}</strong>
          </article>
          <article className="ink-card stat">
            <p>Ordens</p>
            <strong>{orders.length}</strong>
          </article>
        </section>
      )}

      {activeView === 'clients' && (
        <section className="panel-grid two-col">
          <article className="ink-card">
            <h2>Novo cliente</h2>
            <form className="grid-form" onSubmit={createClient}>
              <label>
                Nome
                <input
                  value={clientForm.name}
                  onChange={(e) => setClientForm((old) => ({ ...old, name: e.target.value }))}
                  required
                />
              </label>
              <label>
                Documento
                <input
                  value={clientForm.document}
                  onChange={(e) => setClientForm((old) => ({ ...old, document: e.target.value }))}
                  required
                />
              </label>
              <label>
                Tipo
                <select
                  value={clientForm.documentType}
                  onChange={(e) =>
                    setClientForm((old) => ({
                      ...old,
                      documentType: e.target.value as 'CPF' | 'CNPJ',
                    }))
                  }
                >
                  <option value="CPF">CPF</option>
                  <option value="CNPJ">CNPJ</option>
                </select>
              </label>
              <label>
                Telefone
                <input
                  value={clientForm.phone}
                  onChange={(e) => setClientForm((old) => ({ ...old, phone: e.target.value }))}
                  required
                />
              </label>
              <button className="btn btn-solid" type="submit" disabled={loading}>
                Criar
              </button>
            </form>
          </article>
          <article className="ink-card">
            <h2>Clientes</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Tipo</th>
                    <th>Doc</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client) => (
                    <tr key={client.id}>
                      <td>{client.name}</td>
                      <td>{client.documentType}</td>
                      <td>{client.document}</td>
                      <td>
                        <button className="btn mini" onClick={() => void deleteResource('clients', client.id)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </section>
      )}

      {activeView === 'vehicles' && (
        <section className="panel-grid two-col">
          <article className="ink-card">
            <h2>Novo veiculo</h2>
            <form className="grid-form" onSubmit={createVehicle}>
              <label>
                Cliente
                <select
                  value={vehicleForm.clientId}
                  onChange={(e) => setVehicleForm((old) => ({ ...old, clientId: e.target.value }))}
                  required
                >
                  <option value="">Selecione</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Placa
                <input
                  value={vehicleForm.licensePlate}
                  onChange={(e) => setVehicleForm((old) => ({ ...old, licensePlate: e.target.value }))}
                  required
                />
              </label>
              <label>
                Marca
                <input
                  value={vehicleForm.brand}
                  onChange={(e) => setVehicleForm((old) => ({ ...old, brand: e.target.value }))}
                  required
                />
              </label>
              <label>
                Modelo
                <input
                  value={vehicleForm.model}
                  onChange={(e) => setVehicleForm((old) => ({ ...old, model: e.target.value }))}
                  required
                />
              </label>
              <label>
                Ano
                <input
                  value={vehicleForm.year}
                  onChange={(e) =>
                    setVehicleForm((old) => ({ ...old, year: Number(e.target.value || 0) }))
                  }
                  type="number"
                  required
                />
              </label>
              <button className="btn btn-solid" type="submit" disabled={loading}>
                Criar
              </button>
            </form>
          </article>
          <article className="ink-card">
            <h2>Veiculos</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Placa</th>
                    <th>Marca/Modelo</th>
                    <th>Ano</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {vehicles.map((vehicle) => (
                    <tr key={vehicle.id}>
                      <td>{vehicle.licensePlate}</td>
                      <td>{vehicle.brand} {vehicle.model}</td>
                      <td>{vehicle.year}</td>
                      <td>
                        <button
                          className="btn mini"
                          onClick={() => void deleteResource('vehicles', vehicle.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </section>
      )}

      {activeView === 'services' && (
        <section className="panel-grid two-col">
          <article className="ink-card">
            <h2>Novo servico</h2>
            <form className="grid-form" onSubmit={createService}>
              <label>
                Nome
                <input
                  value={serviceForm.name}
                  onChange={(e) => setServiceForm((old) => ({ ...old, name: e.target.value }))}
                  required
                />
              </label>
              <label>
                Preco base
                <input
                  value={serviceForm.basePrice}
                  onChange={(e) =>
                    setServiceForm((old) => ({ ...old, basePrice: Number(e.target.value || 0) }))
                  }
                  type="number"
                  step="0.01"
                  required
                />
              </label>
              <label>
                Minutos estimados
                <input
                  value={serviceForm.estimatedMinutes}
                  onChange={(e) =>
                    setServiceForm((old) => ({ ...old, estimatedMinutes: Number(e.target.value || 0) }))
                  }
                  type="number"
                  required
                />
              </label>
              <button className="btn btn-solid" type="submit" disabled={loading}>
                Criar
              </button>
            </form>
          </article>
          <article className="ink-card">
            <h2>Servicos</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Preco</th>
                    <th>Ativo</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((service) => (
                    <tr key={service.id}>
                      <td>{service.name}</td>
                      <td>{money(service.basePrice)}</td>
                      <td>{service.isActive ? 'Sim' : 'Nao'}</td>
                      <td>
                        <button
                          className="btn mini"
                          onClick={() => void deleteResource('services', service.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </section>
      )}

      {activeView === 'parts' && (
        <section className="panel-grid two-col">
          <article className="ink-card">
            <h2>Nova peca</h2>
            <form className="grid-form" onSubmit={createPart}>
              <label>
                Nome
                <input
                  value={partForm.name}
                  onChange={(e) => setPartForm((old) => ({ ...old, name: e.target.value }))}
                  required
                />
              </label>
              <label>
                Preco unitario
                <input
                  value={partForm.unitPrice}
                  onChange={(e) =>
                    setPartForm((old) => ({ ...old, unitPrice: Number(e.target.value || 0) }))
                  }
                  type="number"
                  step="0.01"
                  required
                />
              </label>
              <label>
                Estoque
                <input
                  value={partForm.stockQuantity}
                  onChange={(e) =>
                    setPartForm((old) => ({ ...old, stockQuantity: Number(e.target.value || 0) }))
                  }
                  type="number"
                  required
                />
              </label>
              <button className="btn btn-solid" type="submit" disabled={loading}>
                Criar
              </button>
            </form>
          </article>
          <article className="ink-card">
            <h2>Pecas</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Preco</th>
                    <th>Estoque</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {parts.map((part) => (
                    <tr key={part.id}>
                      <td>{part.name}</td>
                      <td>{money(part.unitPrice)}</td>
                      <td>{part.stockQuantity}</td>
                      <td>
                        <button className="btn mini" onClick={() => void deleteResource('parts', part.id)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </section>
      )}

      {activeView === 'orders' && (
        <section className="panel-grid two-col">
          <article className="ink-card">
            <h2>Nova OS</h2>
            <form className="grid-form" onSubmit={createOrder}>
              <label>
                Cliente
                <select
                  value={orderForm.clientId}
                  onChange={(e) =>
                    setOrderForm((old) => ({ ...old, clientId: e.target.value, vehicleId: '' }))
                  }
                  required
                >
                  <option value="">Selecione</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Veiculo
                <select
                  value={orderForm.vehicleId}
                  onChange={(e) => setOrderForm((old) => ({ ...old, vehicleId: e.target.value }))}
                  required
                >
                  <option value="">Selecione</option>
                  {vehicleOptions.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.licensePlate} - {vehicle.model}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Servico
                <select
                  value={orderForm.serviceId}
                  onChange={(e) => setOrderForm((old) => ({ ...old, serviceId: e.target.value }))}
                  required
                >
                  <option value="">Selecione</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Qtd servico
                <input
                  type="number"
                  min={1}
                  value={orderForm.serviceQuantity}
                  onChange={(e) =>
                    setOrderForm((old) => ({ ...old, serviceQuantity: Number(e.target.value || 1) }))
                  }
                />
              </label>
              <label>
                Peca (opcional)
                <select
                  value={orderForm.partId}
                  onChange={(e) => setOrderForm((old) => ({ ...old, partId: e.target.value }))}
                >
                  <option value="">Sem peca</option>
                  {parts.map((part) => (
                    <option key={part.id} value={part.id}>
                      {part.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Qtd peca
                <input
                  type="number"
                  min={1}
                  value={orderForm.partQuantity}
                  onChange={(e) =>
                    setOrderForm((old) => ({ ...old, partQuantity: Number(e.target.value || 1) }))
                  }
                />
              </label>
              <label>
                Problema
                <textarea
                  value={orderForm.problemDescription}
                  onChange={(e) =>
                    setOrderForm((old) => ({ ...old, problemDescription: e.target.value }))
                  }
                />
              </label>
              <button className="btn btn-solid" type="submit" disabled={loading}>
                Criar OS
              </button>
            </form>
          </article>
          <article className="ink-card">
            <h2>Ordens de servico</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Numero</th>
                    <th>Status</th>
                    <th>Total</th>
                    <th>Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td>{order.orderNumber}</td>
                      <td>{order.status}</td>
                      <td>{order.quoteTotalAmount ? money(order.quoteTotalAmount) : '-'}</td>
                      <td className="action-row">
                        <button className="btn mini" onClick={() => void orderAction(order.id, 'advance')}>
                          Avancar
                        </button>
                        <button className="btn mini" onClick={() => void orderAction(order.id, 'approve')}>
                          Aprovar
                        </button>
                        <button className="btn mini" onClick={() => void orderAction(order.id, 'reject')}>
                          Rejeitar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <h2 className="spaced">Tempo medio por servico</h2>
            <ul className="stat-list">
              {stats.map((stat) => (
                <li key={stat.serviceId}>
                  <strong>{stat.serviceName}</strong>
                  <span>{stat.completedOrders} OS</span>
                  <span>{Math.round(stat.avgExecutionMinutes)} min</span>
                </li>
              ))}
            </ul>
          </article>
        </section>
      )}
    </main>
  )
}

export default App

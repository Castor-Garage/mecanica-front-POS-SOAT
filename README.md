# Castor Garage - Front-end

Front-end (painel administrativo + acompanhamento público de OS) para o sistema de gestão de oficina mecânica, consumindo a [API Castor Garage](../mecanica-pos-SOAT).

Projeto desenvolvido para a turma 2026 de **SOAT - FIAP**.

## Funcionalidades

### Painel administrativo (`/`, atrás de login)
- Login de administrador (JWT)
- CRUD de clientes, veículos, serviços e peças
- Abertura de ordens de serviço (OS)
- Listagem de OS com ações **Avançar**, **Aprovar** e **Rejeitar** orçamento
- Dashboard com estatísticas de tempo médio de execução por serviço

### Acompanhamento público (`/acompanhar`)
- Consulta de uma OS pelo número (`OS-YYYY-NNNNN`), sem necessidade de login
- **Aprovar/Rejeitar orçamento**: exibido apenas quando a OS está com status "Aguardando aprovação" — some automaticamente após a decisão
- **Enviar por e-mail**: pede um endereço de e-mail e envia um resumo da OS (status, veículo, orçamento, serviços e peças) para esse endereço — o e-mail digitado não é salvo em nenhum lugar, é usado só naquele envio

## Stack Tecnológico

- **React 19** + **TypeScript**
- **Vite** (dev server / build)
- **react-router-dom** — roteamento (`/` e `/acompanhar`)
- Sem biblioteca de estado ou UI kit — `useState`/`useMemo` e CSS próprio (`App.css`)
- Comunicação com a API via `fetch` direto (sem axios/cliente HTTP dedicado)

## Como Rodar Local

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

Copie `.env.example` para `.env` e ajuste a URL da API:

```bash
cp .env.example .env
```

```env
VITE_API_URL=http://localhost:3000
```

### 3. Subir o backend

Este front depende da [API Castor Garage](../mecanica-pos-SOAT) rodando (local ou remota) na URL configurada em `VITE_API_URL`.

### 4. Rodar em desenvolvimento

```bash
npm run dev
```

- App: `http://localhost:5173`
- Login padrão (seed do backend): `admin@oficina.com` / `Admin@123`
- Acompanhamento público: `http://localhost:5173/acompanhar`

## Scripts Disponíveis

```bash
npm run dev       # Servidor de desenvolvimento (Vite)
npm run build     # Typecheck (tsc -b) + build de produção
npm run lint      # ESLint
npm run preview   # Preview do build de produção
```

## Variáveis de Ambiente

```env
VITE_API_URL=http://localhost:3000   # URL base da API
```

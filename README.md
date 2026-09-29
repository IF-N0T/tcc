# SherlockDb2026!



# Sherlock — Plataforma de Perícia Digital (MVP)

Plataforma web para organização, rastreabilidade e correlação de informações de perícia forense digital.

## Stack

- **Frontend + Backend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Banco de dados**: PostgreSQL
- **ORM**: Prisma
- **Autenticação**: JWT em cookie httpOnly (sem biblioteca de terceiros de sessão), com RBAC (ADMIN / PERITO / VISUALIZADOR)
- **Mapa de relacionamentos**: React Flow

## O que está implementado nesta primeira entrega (MVP)

- Login com sessão JWT e 3 perfis de acesso
- Dashboard com indicadores reais (casos ativos/concluídos, evidências, tarefas, achados recentes, atividades recentes)
- CRUD de Casos com identificador padronizado (`CAS-2026-0001`)
- Pessoas e Dispositivos vinculados a um caso
- Evidências físicas e digitais com identificador padronizado (`EVD-2026-0001`)
- Registro de hash (MD5/SHA-1/SHA-256) por evidência, **sempre por inserção** (nunca sobrescreve), com alerta de divergência
- Cadeia de custódia por evidência, também somente-inserção (histórico cronológico imutável)
- Módulo de Achados vinculável a evidências
- Relacionamentos genéricos entre Pessoa / Dispositivo / Evidência / Achado / Evento, com visualização em grafo (React Flow)
- Timeline por caso (eventos manuais + eventos de custódia agregados automaticamente)
- Tarefas periciais básicas
- Pesquisa global / Central de Investigação (por nome, e-mail, código, IMEI, número de série, etc.)
- Log de auditoria (login/logout, criação e alteração de casos, evidências, hashes, custódia, relacionamentos, achados, tarefas), visível para o Administrador
- Regra de auditoria reforçada ao alterar um caso já concluído/arquivado

## O que fica para as próximas fases (conforme priorizado na análise)

- Módulo de Análises e Ferramentas forenses (schema já modelado no Prisma, UI ainda não construída)
- Documentos/Laudos com versionamento e exportação (PDF/CSV/JSON/XLSX) e "Pacote do Caso"
- Assistente Sherlock (IA)
- Integrações reais com ferramentas forenses de terceiros
- Estratégia avançada de backup/recuperação
- Cadastro de usuários pela interface do Administrador (hoje via seed/script)

## Como rodar localmente

### 1. Pré-requisitos

- Node.js 20+
- PostgreSQL 14+ rodando localmente ou acessível pela rede

### 2. Instalar dependências

```bash
npm install
```

### 3. Configurar variáveis de ambiente

Copie `.env.example` para `.env` e ajuste:

```bash
cp .env.example .env
```

- `DATABASE_URL`: string de conexão do PostgreSQL
- `JWT_SECRET`: um segredo forte e único para assinar as sessões (nunca reutilize o valor de exemplo em produção)

### 4. Criar o banco e aplicar o schema

```bash
npx prisma migrate dev --name init
```

### 5. Popular dados de exemplo (opcional, recomendado na primeira execução)

```bash
npm run prisma:seed
```

Isso cria 3 usuários de teste (senha `Sherlock@123` para todos):

- `admin@sherlock.local` (Administrador)
- `perito@sherlock.local` (Perito)
- `visualizador@sherlock.local` (Visualizador)

E um caso de exemplo (`CAS-2026-0001`) com pessoa, dispositivo, evidência, hash, custódia e relacionamentos já preenchidos, para você navegar pela interface imediatamente.

### 6. Rodar a aplicação

```bash
npm run dev
```

Acesse `http://localhost:3000`.

## Estrutura de pastas

```
sherlock/
├── prisma/
│   ├── schema.prisma      # modelo de dados completo
│   └── seed.ts            # dados de exemplo
├── src/
│   ├── app/
│   │   ├── (app)/         # área autenticada (dashboard, casos, busca, admin)
│   │   ├── api/           # rotas REST (Next.js Route Handlers)
│   │   ├── login/
│   │   └── layout.tsx
│   ├── components/
│   │   ├── case/          # componentes do workspace de um caso (abas, grafo)
│   │   └── ...
│   └── lib/                # prisma client, auth/JWT, sessão, RBAC, geração de IDs, auditoria
└── README.md
```

## Notas de segurança e conformidade

- Nenhuma norma jurídica específica foi presumida nesta implementação (ex.: LGPD, procedimentos periciais formais). A arquitetura foi desenhada para **suportar** controles de privacidade, retenção e auditoria, mas a adequação legal final deve ser revisada por profissional da área jurídica/compliance antes de uso em produção.
- Hashes e eventos de cadeia de custódia são estritamente somente-inserção (append-only) na camada de aplicação. Para garantia adicional em produção, recomenda-se reforçar isso também no nível do banco (ex.: triggers/permissões revogando UPDATE/DELETE nessas tabelas para o usuário de aplicação).
- A geração de identificadores (`CAS-`, `EVD-` etc.) hoje é feita por contagem simples no momento da criação. Em cenário de alta concorrência de escrita, migrar para uma sequência dedicada do PostgreSQL elimina qualquer risco de colisão.

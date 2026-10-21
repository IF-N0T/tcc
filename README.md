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
- Relacionamentos genéricos entre Pessoa / Dispositivo / Evidência / Achado / Evento, com visualização em grafo (React Flow), filtros, minimapa e tutorial de uso integrado
- Timeline por caso (eventos manuais + eventos de custódia agregados automaticamente)
- Tarefas periciais básicas
- Pesquisa global / Central de Investigação (por nomes, peritos, palavras-chave e dados dos casos; filtros por período de abertura, prioridade e situação)
- Antes de excluir um caso, a aplicação gera e baixa um arquivo JSON com os dados e registros relacionados daquele caso
- Log de auditoria (login/logout, criação e alteração de casos, evidências, hashes, custódia, relacionamentos, achados, tarefas), visível para o Administrador
- Regra de auditoria reforçada ao alterar um caso já concluído/arquivado

## Módulos operacionais e limites atuais

- Análises podem ser cadastradas e importadas como JSON; integrações automáticas com ferramentas externas dependem de conectores próprios.
- Relatórios de caso são exportados como JSON, CSV ou HTML imprimível (o HTML pode ser salvo como PDF pelo navegador); snapshots JSON ficam no histórico versionado do caso.
- O Assistente Sherlock pesquisa dados locais, sem IA generativa ou envio a provedores externos.
- Administradores podem cadastrar usuários com senha inicial; a aplicação armazena apenas o hash.
- Administradores podem exportar e restaurar backups JSON. A restauração é aditiva, transacional e ignora registros com o mesmo ID; o backup inclui hashes de senha e deve ser mantido em local seguro.

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
│   │   ├── (app)/         # área autenticada (dashboard, casos, busca e módulos do backlog)
│   │   ├── api/           # rotas REST (Next.js Route Handlers)
│   │   ├── login/
│   │   └── layout.tsx
│   ├── components/
│   │   ├── case/          # componentes do workspace de um caso (abas, grafo)
│   │   ├── backlog/       # telas planejadas e componentes compartilhados
│   │   └── ...
│   └── lib/                # prisma client, auth/JWT, sessão, RBAC, geração de IDs, auditoria
└── README.md
```

## Notas de segurança e conformidade

- Nenhuma norma jurídica específica foi presumida nesta implementação (ex.: LGPD, procedimentos periciais formais). A arquitetura foi desenhada para **suportar** controles de privacidade, retenção e auditoria, mas a adequação legal final deve ser revisada por profissional da área jurídica/compliance antes de uso em produção.
- Hashes e eventos de cadeia de custódia são estritamente somente-inserção (append-only) na camada de aplicação. Para garantia adicional em produção, recomenda-se reforçar isso também no nível do banco (ex.: triggers/permissões revogando UPDATE/DELETE nessas tabelas para o usuário de aplicação).
- A geração de identificadores (`CAS-`, `EVD-` etc.) hoje é feita por contagem simples no momento da criação. Em cenário de alta concorrência de escrita, migrar para uma sequência dedicada do PostgreSQL elimina qualquer risco de colisão.

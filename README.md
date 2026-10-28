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


---

## Novidades desta versão

### Assistente Watson (antes "Assistente Sherlock")
- **Sem IA generativa.** Regras determinísticas sobre os registros do caso + a Biblioteca. Toda afirmação sobre o caso cita o código de origem (EVD-…, ANA-…); o que falta aparece como **lacuna**, nunca é preenchido por suposição.
- **Lacunas** (24 regras): hash ausente/divergente/sem SHA-256, custódia ausente ou com elo quebrado, coleta incompleta, análise sem ferramenta/resultado/conclusão, análise ou custódia anterior à coleta, achado sem origem, IMEI inválido (Luhn), tarefa vencida, mesmo hash em evidências diferentes, e conferência do **Diário do perito** (hash, IMEI, e-mail, telefone, CPF, código, tipo de mídia ou ferramenta citados na nota e ausentes dos registros). Cada lacuna pode virar tarefa com um clique.
- **Procedência**: "de onde veio ACH-…?" e "o que foi feito depois de EVD-…?" montam a cadeia pessoa → dispositivo → evidência → análise → achado, em ordem cronológica, e listam o que **não consta** nos registros.
- **Comparação com outros casos**: hashes de evidências e de arquivos importados, e-mails/telefones/documentos de pessoas, IMEI/série/MAC de dispositivos.
- **Rascunho de laudo**: organiza o registrado e marca `[PREENCHER: …]` onde falta informação.
- **Biblioteca Watson** (`/library`): 41 itens padrão (CPP arts. 158-A a 158-F, ISO/IEC 27037, NIST SP 800-86, guias de Autopsy/ImageJ/FTK Imager/Sleuth Kit, checklists, modelos de texto, glossário), cada um com fonte. Você pode criar os seus. O Watson sugere itens conforme o caso e diz **por quê**. Fonte dos itens padrão: `prisma/library/entries.json`.
- `watson-lib/watson_lib.py` (opcional, Python): valida/edita a biblioteca e verifica casos exportados offline. Ver `watson-lib/README.md`.

### Exportação (Laudos e relatórios; menu "Exportar" em cada caso)
HTML colorido · HTML preto e branco · versão de impressão A4 · minuta de laudo · **Excel (.xlsx)** (uma aba por assunto) · **Bloco de Notas (.txt)** · CSV por tabela · JSON · **pacote .zip** (tudo + pasta `interop/` + `MANIFESTO-SHA256.txt`). Todos trazem a impressão digital SHA-256 dos dados exportados.

### Importação / interoperabilidade (Integrações)
Importa CSV/XLSX/TXT do **Autopsy** (tabelas de resultados), **ImageJ/Fiji** (tabela Results), **listas de hash** (sha256sum, md5sum, PowerShell `Get-FileHash`), **body file do The Sleuth Kit** e tabelas genéricas, com prévia e mapeamento de colunas. Exporta `palavras-chave.txt`, `*sum-evidencias.txt`, `evidencias-hashes.csv` e `timeline-timesketch.csv`. Os formatos seguem convenções públicas das ferramentas, **mas não foram testados contra cada versão**: valide com um caso de teste.

### Contas e presença (Administração → Contas e acesso)
Quem está **online/offline** (sinal a cada 45 s com a aba visível; online = sinal nos últimos ~2,5 min), último acesso, troca de perfil, ativar/desativar conta, redefinir senha, matriz de permissões. Login limita tentativas (8 em 10 min por e-mail+IP, em memória).

### Aparência
Menu de aparência (modo claro/escuro/sistema, 5 cores de destaque, tamanho do texto, alto contraste, reduzir animações), menu lateral recolhível, busca rápida `Ctrl+K`, abas do caso na URL (`#evidence`).

### Atualizando um banco existente
1. `npx prisma migrate deploy` (aplica `20261025120000_watson_presence_library`; no Render o Build Command já faz isso).
2. `npm run prisma:seed` **uma vez** apontando para o banco (carrega a Biblioteca; é idempotente e não recria dados do caso).
3. Os backups agora incluem diário, biblioteca e importações (sem as linhas importadas; reimporte o arquivo original se precisar).

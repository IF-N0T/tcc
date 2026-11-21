import { PrismaClient, Role, CaseStatus, CasePriority, EvidenceCategory, EvidenceType, HashAlgorithm } from "@prisma/client";
import { loadEnvConfig } from "@next/env";
import bcrypt from "bcryptjs";
import { readFileSync } from "fs";
import { join } from "path";

loadEnvConfig(process.cwd());

const prisma = new PrismaClient();

const seedAccounts = [
  { name: "Administrador", email: "admin@sherlock.local", role: Role.ADMIN, passwordEnv: "SEED_ADMIN_PASSWORD" },
  { name: "Victor", email: "victor@sherlock.local", role: Role.ADMIN, passwordEnv: "SEED_VICTOR_PASSWORD" },
  { name: "Ana Perita", email: "perito@sherlock.local", role: Role.PERITO, passwordEnv: "SEED_PERITO_PASSWORD" },
  { name: "Carlos Visualizador", email: "visualizador@sherlock.local", role: Role.VISUALIZADOR, passwordEnv: "SEED_VISUALIZADOR_PASSWORD" }
] as const;

async function ensureSeedAccount(account: typeof seedAccounts[number]) {
  const existing = await prisma.user.findUnique({ where: { email: account.email } });
  if (existing) return existing;

  const password = process.env[account.passwordEnv];
  if (!password || password.length < 16) {
    throw new Error(`${account.passwordEnv} deve ser definida com pelo menos 16 caracteres para criar ${account.email}.`);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  return prisma.user.create({
    data: { name: account.name, email: account.email, passwordHash, role: account.role }
  });
}

async function seedAdditionalDemoCases(perito: { id: string; name: string }) {
  const case02 = await prisma.case.findUnique({ where: { code: "CAS-2026-0002" } });
  if (!case02) {
    const kase = await prisma.case.create({
      data: {
        code: "CAS-2026-0002",
        name: "Exame de mensagens em dispositivo móvel — Demonstração",
        description: "Cenário fictício para demonstrar registro de dispositivo, evidência, hash, custódia, análise e achado.",
        status: CaseStatus.EM_ELABORACAO_LAUDO,
        priority: CasePriority.MEDIA,
        responsibleId: perito.id,
        openedAt: new Date("2026-11-10T09:00:00-03:00")
      }
    });

    const person = await prisma.person.create({
      data: {
        code: "PES-2026-0002",
        caseId: kase.id,
        name: "Pessoa fictícia 02",
        role: "Pessoa de demonstração",
        email: "pessoa02@example.test",
        notes: "Identidade e dados de contato são fictícios."
      }
    });

    const device = await prisma.device.create({
      data: {
        code: "DEV-2026-0002",
        caseId: kase.id,
        personId: person.id,
        type: EvidenceType.SMARTPHONE,
        brand: "Fabricante fictício",
        model: "Modelo demonstrativo",
        serialNumber: "DEMO-SERIAL-0002",
        notes: "Dispositivo e identificadores fictícios para demonstração."
      }
    });

    const evidence = await prisma.evidence.create({
      data: {
        code: "EVD-2026-0002",
        caseId: kase.id,
        category: EvidenceCategory.DIGITAL,
        type: EvidenceType.IMAGEM_FORENSE,
        description: "Imagem didática de conjunto de mensagens simuladas",
        origin: "Arquivo fictício de demonstração",
        collectedAt: new Date("2026-11-10T10:15:00-03:00"),
        collectedById: perito.id,
        collectionPlace: "Laboratório demonstrativo",
        format: "RAW (exemplo)",
        deviceId: device.id,
        notes: "Hash corresponde ao vetor público SHA-256 de 'abc'; não representa uma mídia real."
      }
    });

    const analysis = await prisma.analysis.create({
      data: {
        code: "ANA-2026-0001",
        caseId: kase.id,
        evidenceId: evidence.id,
        type: "Exame de mensagens simuladas",
        performedById: perito.id,
        procedure: "Exemplo didático: revisar um conjunto fictício de mensagens e registrar os parâmetros do exame.",
        result: "Foram identificados registros de conversa simulados no conjunto de demonstração.",
        conclusion: "O resultado descreve somente os dados fictícios deste caso de demonstração.",
        performedAt: new Date("2026-11-11T14:30:00-03:00")
      }
    });

    await prisma.evidenceHash.create({
      data: {
        evidenceId: evidence.id,
        algorithm: HashAlgorithm.SHA256,
        value: "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
        calculatedById: perito.id,
        calculatedAt: new Date("2026-11-10T10:20:00-03:00"),
        notes: "Vetor didático SHA-256 da string 'abc'; não corresponde a arquivo de evidência real."
      }
    });

    await prisma.custodyEvent.createMany({
      data: [
        {
          evidenceId: evidence.id,
          action: "COLETA",
          toCustodian: perito.name,
          location: "Laboratório demonstrativo",
          reason: "Recebimento fictício para demonstrar o início da cadeia.",
          occurredAt: new Date("2026-11-10T10:15:00-03:00"),
          registeredById: perito.id
        },
        {
          evidenceId: evidence.id,
          action: "TRANSFERENCIA",
          fromCustodian: perito.name,
          toCustodian: "Cofre demonstrativo",
          location: "Laboratório demonstrativo",
          reason: "Armazenamento fictício após aquisição.",
          occurredAt: new Date("2026-11-10T11:00:00-03:00"),
          registeredById: perito.id
        }
      ]
    });

    const finding = await prisma.finding.create({
      data: {
        code: "ACH-2026-0001",
        caseId: kase.id,
        title: "Registro de conversa fictícia identificado",
        description: "Achado exclusivamente didático, vinculado à evidência e à análise do cenário.",
        type: "Dado simulado",
        evidenceId: evidence.id,
        analysisId: analysis.id,
        identifiedAt: new Date("2026-11-11T14:40:00-03:00")
      }
    });

    await prisma.relationship.createMany({
      data: [
        { caseId: kase.id, sourceType: "Person", sourceId: person.id, targetType: "Device", targetId: device.id, label: "vínculo fictício" },
        { caseId: kase.id, sourceType: "Device", sourceId: device.id, targetType: "Evidence", targetId: evidence.id, label: "origem demonstrativa" },
        { caseId: kase.id, sourceType: "Evidence", sourceId: evidence.id, targetType: "Finding", targetId: finding.id, label: "sustenta" }
      ]
    });

    await prisma.task.createMany({
      data: [
        { caseId: kase.id, title: "Revisar a cadeia de custódia demonstrativa", status: "CONCLUIDA", evidenceId: evidence.id },
        { caseId: kase.id, title: "Conferir referências do rascunho demonstrativo", status: "PENDENTE", evidenceId: evidence.id }
      ]
    });

    await prisma.caseEvent.create({
      data: {
        caseId: kase.id,
        title: "Aquisição fictícia registrada",
        description: "Evento de exemplo para visualizar a linha do tempo.",
        category: "Coleta",
        occurredAt: new Date("2026-11-10T10:15:00-03:00")
      }
    });

    await prisma.caseNote.create({
      data: {
        caseId: kase.id,
        authorId: perito.id,
        text: "Demonstração: dispositivo, pessoa e mensagens são fictícios; o hash é um vetor de teste, não de uma evidência real."
      }
    });
  }

  const case03 = await prisma.case.findUnique({ where: { code: "CAS-2026-0003" } });
  if (!case03) {
    const kase = await prisma.case.create({
      data: {
        code: "CAS-2026-0003",
        name: "Análise de registros de acesso — Demonstração",
        description: "Cenário fictício com lacunas intencionais para demonstrar os avisos e sugestões do Watson.",
        status: CaseStatus.AGUARDANDO_EVIDENCIAS,
        priority: CasePriority.ALTA,
        responsibleId: perito.id,
        openedAt: new Date("2026-11-12T08:30:00-03:00")
      }
    });

    const device = await prisma.device.create({
      data: {
        code: "DEV-2026-0003",
        caseId: kase.id,
        type: EvidenceType.COMPUTADOR,
        brand: "Ambiente fictício",
        model: "Servidor de laboratório",
        serialNumber: "DEMO-SERVER-0003",
        notes: "Ativo e identificadores fictícios."
      }
    });

    const evidence = await prisma.evidence.create({
      data: {
        code: "EVD-2026-0003",
        caseId: kase.id,
        category: EvidenceCategory.DIGITAL,
        type: EvidenceType.LOG,
        description: "Recorte fictício de registros de acesso",
        origin: "Conjunto sintético de logs",
        collectedAt: new Date("2026-11-12T09:00:00-03:00"),
        collectedById: perito.id,
        collectionPlace: "Ambiente de laboratório demonstrativo",
        format: "TXT (exemplo)",
        deviceId: device.id,
        notes: "Demonstração intencional de lacunas: hash e custódia não foram registrados."
      }
    });

    const analysis = await prisma.analysis.create({
      data: {
        code: "ANA-2026-0002",
        caseId: kase.id,
        evidenceId: evidence.id,
        type: "Revisão preliminar de logs simulados",
        performedById: perito.id,
        procedure: "Leitura manual de registros sintéticos, sem ferramenta automatizada.",
        result: "O conjunto contém eventos fictícios em mais de um horário.",
        conclusion: "A ordem temporal requer conferência; o cenário não permite atribuição a uma pessoa.",
        performedAt: new Date("2026-11-12T10:30:00-03:00")
      }
    });

    const finding = await prisma.finding.create({
      data: {
        code: "ACH-2026-0002",
        caseId: kase.id,
        title: "Sequência temporal pendente de validação",
        description: "Exemplo de achado fictício; conferir fuso e origem dos horários antes de concluir.",
        type: "Pendência de análise",
        evidenceId: evidence.id,
        analysisId: analysis.id,
        identifiedAt: new Date("2026-11-12T10:45:00-03:00")
      }
    });

    await prisma.relationship.createMany({
      data: [
        { caseId: kase.id, sourceType: "Device", sourceId: device.id, targetType: "Evidence", targetId: evidence.id, label: "origem demonstrativa" },
        { caseId: kase.id, sourceType: "Evidence", sourceId: evidence.id, targetType: "Finding", targetId: finding.id, label: "relacionado a" }
      ]
    });

    await prisma.task.createMany({
      data: [
        { caseId: kase.id, title: "Registrar hash dos logs simulados", status: "PENDENTE", evidenceId: evidence.id },
        { caseId: kase.id, title: "Documentar a cadeia de custódia demonstrativa", status: "PENDENTE", evidenceId: evidence.id },
        { caseId: kase.id, title: "Confirmar fuso horário dos eventos simulados", status: "EM_ANDAMENTO", evidenceId: evidence.id }
      ]
    });

    await prisma.caseEvent.create({
      data: {
        caseId: kase.id,
        title: "Recebimento de conjunto sintético de logs",
        description: "Evento fictício para demonstrar uma linha do tempo com itens pendentes.",
        category: "Recebimento",
        occurredAt: new Date("2026-11-12T09:00:00-03:00")
      }
    });

    await prisma.caseNote.create({
      data: {
        caseId: kase.id,
        authorId: perito.id,
        text: "Demonstração: registros e servidor são fictícios. Este caso deixa hash e custódia em aberto intencionalmente para mostrar as lacunas do Watson."
      }
    });
  }

  console.log("Casos de demonstração verificados: CAS-2026-0002 e CAS-2026-0003.");
}

async function main() {
  const peritoAccount = seedAccounts.find((account) => account.role === Role.PERITO);
  if (!peritoAccount) throw new Error("É necessário configurar uma conta de demonstração com o papel PERITO.");
  const perito = await ensureSeedAccount(peritoAccount);
  for (const account of seedAccounts) {
    if (account.email !== perito.email) await ensureSeedAccount(account);
  }

  const existingCase = await prisma.case.findUnique({ where: { code: "CAS-2026-0001" } });
  if (!existingCase) {
    const kase = await prisma.case.create({
      data: {
        code: "CAS-2026-0001",
        name: "Investigação de fraude financeira - Caso Alpha",
        description: "Suspeita de movimentação financeira irregular envolvendo dispositivos móveis e contas de e-mail.",
        status: CaseStatus.EM_ANALISE,
        priority: CasePriority.ALTA,
        responsibleId: perito.id
      }
    });

    const person = await prisma.person.create({
      data: { code: "PES-2026-0001", caseId: kase.id, name: "João da Silva", role: "Investigado", email: "joao@gmail.com" }
    });

    const device = await prisma.device.create({
      data: {
        code: "DEV-2026-0001",
        caseId: kase.id,
        personId: person.id,
        type: EvidenceType.SMARTPHONE,
        brand: "Samsung",
        model: "Galaxy S21",
        imei: "351234567891234"
      }
    });

    const evidence = await prisma.evidence.create({
      data: {
        code: "EVD-2026-0001",
        caseId: kase.id,
        category: EvidenceCategory.DIGITAL,
        type: EvidenceType.IMAGEM_FORENSE,
        description: "Imagem forense do smartphone apreendido",
        deviceId: device.id,
        collectedAt: new Date(),
        collectionPlace: "Sede da empresa"
      }
    });

    await prisma.evidenceHash.create({
      data: {
        evidenceId: evidence.id,
        algorithm: HashAlgorithm.SHA256,
        value: "a3f5c9...exemplo...9d21",
        calculatedById: perito.id
      }
    });

    await prisma.custodyEvent.create({
      data: {
        evidenceId: evidence.id,
        action: "COLETA",
        toCustodian: "Ana Perita",
        location: "Sede da empresa",
        registeredById: perito.id
      }
    });

    await prisma.caseEvent.create({
      data: { caseId: kase.id, title: "Dispositivo coletado", occurredAt: new Date(), category: "Coleta" }
    });

    await prisma.relationship.create({
      data: {
        caseId: kase.id,
        sourceType: "Person",
        sourceId: person.id,
        targetType: "Device",
        targetId: device.id,
        label: "possui"
      }
    });

    await prisma.relationship.create({
      data: {
        caseId: kase.id,
        sourceType: "Device",
        sourceId: device.id,
        targetType: "Evidence",
        targetId: evidence.id,
        label: "originou"
      }
    });

    await prisma.task.create({
      data: { caseId: kase.id, title: "Calcular hash da imagem forense", status: "CONCLUIDA" }
    });
    await prisma.task.create({
      data: { caseId: kase.id, title: "Analisar sistema de arquivos", status: "PENDENTE" }
    });

    // Nota de demonstração do Diário do perito (o Watson confere o que ela cita com os registros).
    await prisma.caseNote.create({
      data: {
        caseId: kase.id,
        authorId: perito.id,
        text: "Iniciei a revisão da imagem no Autopsy. Também recebi um pendrive do investigado que ainda será cadastrado como evidência."
      }
    });
  }

  await seedAdditionalDemoCases(perito);

  // Biblioteca do Watson: itens padrão (idempotente, por slug). Edite prisma/library/entries.json para ajustar.
  type LibraryEntry = { slug: string; title: string; category: string; summary: string; content: string; tags: string; appliesTo: string; source: string | null };
  const entries: LibraryEntry[] = JSON.parse(readFileSync(join(__dirname, "library", "entries.json"), "utf-8"));
  for (const e of entries) {
    await prisma.knowledgeEntry.upsert({
      where: { slug: e.slug },
      update: { title: e.title, category: e.category, summary: e.summary, content: e.content, tags: e.tags, appliesTo: e.appliesTo, source: e.source, builtIn: true },
      create: { ...e, builtIn: true }
    });
  }
  console.log(`Biblioteca Watson: ${entries.length} itens padrão carregados.`);

  console.log("Seed concluído. Contas de exemplo existentes foram mantidas sem alterar as senhas.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

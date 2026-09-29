import { PrismaClient, Role, CaseStatus, CasePriority, EvidenceCategory, EvidenceType, HashAlgorithm } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Sherlock@123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@sherlock.local" },
    update: {},
    create: { name: "Administrador", email: "admin@sherlock.local", passwordHash, role: Role.ADMIN }
  });

  const perito = await prisma.user.upsert({
    where: { email: "perito@sherlock.local" },
    update: {},
    create: { name: "Ana Perita", email: "perito@sherlock.local", passwordHash, role: Role.PERITO }
  });

  await prisma.user.upsert({
    where: { email: "visualizador@sherlock.local" },
    update: {},
    create: { name: "Carlos Visualizador", email: "visualizador@sherlock.local", passwordHash, role: Role.VISUALIZADOR }
  });

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
  }

  console.log("Seed concluído. Usuários:");
  console.log("  admin@sherlock.local / Sherlock@123 (ADMIN)");
  console.log("  perito@sherlock.local / Sherlock@123 (PERITO)");
  console.log("  visualizador@sherlock.local / Sherlock@123 (VISUALIZADOR)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

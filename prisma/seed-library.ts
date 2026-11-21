import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";

type LibraryEntry = {
  slug: string;
  title: string;
  category: string;
  summary: string;
  content: string;
  tags: string;
  appliesTo: string;
  source: string | null;
};

const prisma = new PrismaClient();

async function main() {
  const entries = JSON.parse(
    readFileSync(join(process.cwd(), "prisma", "library", "entries.json"), "utf8")
  ) as LibraryEntry[];

  for (const entry of entries) {
    await prisma.knowledgeEntry.upsert({
      where: { slug: entry.slug },
      update: {
        title: entry.title,
        category: entry.category,
        summary: entry.summary,
        content: entry.content,
        tags: entry.tags,
        appliesTo: entry.appliesTo,
        source: entry.source,
        builtIn: true
      },
      create: { ...entry, builtIn: true }
    });
  }

  console.log(`Biblioteca Watson atualizada: ${entries.length} itens padrão.`);
}

main()
  .catch((error) => {
    console.error("Falha ao atualizar a biblioteca padrão do Watson.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

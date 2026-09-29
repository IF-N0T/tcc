import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ query: q ?? "", results: [] });
  }

  const [cases, people, devices, evidences, findings] = await Promise.all([
    prisma.case.findMany({
      where: { OR: [{ code: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }] },
      take: 10
    }),
    prisma.person.findMany({
      where: {
        OR: [
          { code: { contains: q, mode: "insensitive" } },
          { name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { document: { contains: q, mode: "insensitive" } }
        ]
      },
      include: { case: true },
      take: 10
    }),
    prisma.device.findMany({
      where: {
        OR: [
          { code: { contains: q, mode: "insensitive" } },
          { serialNumber: { contains: q, mode: "insensitive" } },
          { imei: { contains: q, mode: "insensitive" } },
          { macAddress: { contains: q, mode: "insensitive" } },
          { brand: { contains: q, mode: "insensitive" } },
          { model: { contains: q, mode: "insensitive" } }
        ]
      },
      include: { case: true },
      take: 10
    }),
    prisma.evidence.findMany({
      where: {
        OR: [
          { code: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
          { serialNumber: { contains: q, mode: "insensitive" } }
        ]
      },
      include: { case: true },
      take: 10
    }),
    prisma.finding.findMany({
      where: {
        OR: [
          { code: { contains: q, mode: "insensitive" } },
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } }
        ]
      },
      include: { case: true },
      take: 10
    })
  ]);

  const results = [
    ...cases.map((c) => ({ kind: "Caso", code: c.code, label: c.name, caseId: c.id, caseCode: c.code })),
    ...people.map((p) => ({ kind: "Pessoa", code: p.code, label: p.name, caseId: p.caseId, caseCode: p.case.code })),
    ...devices.map((d) => ({ kind: "Dispositivo", code: d.code, label: `${d.brand ?? ""} ${d.model ?? ""}`.trim() || d.type, caseId: d.caseId, caseCode: d.case.code })),
    ...evidences.map((e) => ({ kind: "Evidência", code: e.code, label: e.description, caseId: e.caseId, caseCode: e.case.code })),
    ...findings.map((f) => ({ kind: "Achado", code: f.code, label: f.title, caseId: f.caseId, caseCode: f.case.code }))
  ];

  return NextResponse.json({ query: q, results });
}

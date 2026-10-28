// Funções puras para hashes e identificadores de dispositivo.

export type HashKind = "MD5" | "SHA1" | "SHA256";

const HEX = /^[a-fA-F0-9]+$/;

/** Detecta o algoritmo pelo comprimento do valor hexadecimal. */
export function hashKindOf(value: string | null | undefined): HashKind | null {
  const v = (value ?? "").trim();
  if (!HEX.test(v)) return null;
  if (v.length === 32) return "MD5";
  if (v.length === 40) return "SHA1";
  if (v.length === 64) return "SHA256";
  return null;
}

export function normalizeHash(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

/** Valida o dígito verificador (Luhn) de um IMEI de 15 dígitos. */
export function isValidImei(imei: string | null | undefined): boolean {
  const digits = (imei ?? "").replace(/\D/g, "");
  if (digits.length !== 15) return false;
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    let d = Number(digits[14 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

export function normalizeDigits(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "");
}

export function normalizeMac(value: string | null | undefined): string {
  return (value ?? "").toLowerCase().replace(/[^0-9a-f]/g, "");
}

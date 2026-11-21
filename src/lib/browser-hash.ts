export type EvidenceHashAlgorithm = "MD5" | "SHA1" | "SHA256";

const CHUNK_SIZE = 4 * 1024 * 1024;

export async function hashFileInBrowser(
  file: File,
  algorithm: EvidenceHashAlgorithm,
  onProgress?: (percent: number) => void
): Promise<string> {
  const hasher = algorithm === "SHA256"
    ? (await import("@noble/hashes/sha2")).sha256.create()
    : algorithm === "SHA1"
      ? (await import("@noble/hashes/legacy")).sha1.create()
      : (await import("@noble/hashes/legacy")).md5.create();

  for (let offset = 0; offset < file.size; offset += CHUNK_SIZE) {
    const chunk = new Uint8Array(await file.slice(offset, offset + CHUNK_SIZE).arrayBuffer());
    hasher.update(chunk);
    onProgress?.(Math.round((Math.min(offset + chunk.length, file.size) / file.size) * 100));
  }

  if (file.size === 0) onProgress?.(100);
  return Array.from(hasher.digest(), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * AES-256-GCM encryption — matches volta_frontend/src/lib/crypto.ts exactly.
 * Uses Node 18+ built-in Web Crypto API (no extra dependencies).
 */

import { webcrypto } from "node:crypto";

const subtle = webcrypto.subtle;
const ALGORITHM = { name: "AES-GCM", length: 256 } as const;
const IV_LENGTH = 12; // bytes — AES-GCM standard

export async function generateKey(): Promise<CryptoKey> {
  return subtle.generateKey(ALGORITHM, true, [
    "encrypt",
    "decrypt",
  ]) as Promise<CryptoKey>;
}

export async function exportKey(key: CryptoKey): Promise<string> {
  const raw = await subtle.exportKey("raw", key);
  const bytes = new Uint8Array(raw);
  // base64url encoding (URL-safe, no padding) — matches frontend
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

export async function importKey(base64url: string): Promise<CryptoKey> {
  // base64url → base64 → bytes
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return subtle.importKey(
    "raw",
    bytes,
    ALGORITHM,
    false,
    ["decrypt"]
  ) as Promise<CryptoKey>;
}

export async function encrypt(
  plaintext: string,
  key: CryptoKey
): Promise<Uint8Array> {
  const iv = webcrypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertextBuf = await subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded
  );
  // Prepend IV to ciphertext — wire format: [12-byte IV][ciphertext+auth-tag]
  const result = new Uint8Array(IV_LENGTH + ciphertextBuf.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(ciphertextBuf), IV_LENGTH);
  return result;
}

export async function decrypt(
  data: Uint8Array,
  key: CryptoKey
): Promise<string> {
  const iv = data.slice(0, IV_LENGTH);
  const ciphertext = data.slice(IV_LENGTH);
  const plaintextBuf = await subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  );
  return new TextDecoder().decode(plaintextBuf);
}

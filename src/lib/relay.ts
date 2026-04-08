/**
 * Relay helpers for the Request-a-Secret flow.
 *
 * - Generates a cryptographic ref and relay encryption key
 * - Polls the Cloudflare Worker relay for the encrypted Volta link
 * - Decrypts the relay blob to recover the Volta URL
 */

import { webcrypto } from "node:crypto";

const subtle = webcrypto.subtle;
const RELAY_BASE = "https://app.voltanotes.com/relay";
const POLL_INTERVAL_MS = 3_000;
const POLL_TIMEOUT_MS = 60_000;

export interface RelayRequest {
  ref: string;       // 16-byte random, base64url
  relayKey: string;  // 256-bit AES key, base64url
}

/**
 * Generate a unique relay ref and encryption key.
 */
export function generateRelayRequest(): RelayRequest {
  const refBytes = webcrypto.getRandomValues(new Uint8Array(16));
  const keyBytes = webcrypto.getRandomValues(new Uint8Array(32));
  return {
    ref: toBase64Url(refBytes),
    relayKey: toBase64Url(keyBytes),
  };
}

/**
 * Poll the relay for a response. Returns the decrypted Volta URL or null on timeout.
 */
export async function pollRelay(
  ref: string,
  relayKey: string
): Promise<string | null> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${RELAY_BASE}/${ref}`);
      if (res.status === 200) {
        const encryptedBlob = await res.text();
        return await decryptRelayBlob(encryptedBlob, relayKey);
      }
      // 404 = not yet submitted, keep polling
    } catch {
      // Network error — keep polling
    }
    await sleep(POLL_INTERVAL_MS);
  }

  return null; // Timed out
}

/**
 * Decrypt the relay blob (base64url-encoded ciphertext) using the relay key.
 */
async function decryptRelayBlob(
  blob: string,
  relayKeyStr: string
): Promise<string> {
  const data = fromBase64Url(blob);
  const keyBytes = fromBase64Url(relayKeyStr);
  const key = await subtle.importKey("raw", keyBytes, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
  const iv = data.slice(0, 12);
  const ciphertext = data.slice(12);
  const plainBuf = await subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new TextDecoder().decode(plainBuf);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function fromBase64Url(str: string): Uint8Array {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

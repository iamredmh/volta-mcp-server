/**
 * ICP canister client — production-only, stripped of IS_LOCAL logic.
 * Matches volta_frontend/src/lib/canister.ts with three differences:
 *   1. No IS_LOCAL / DFX_NETWORK branching
 *   2. No fetchRootKey() (only needed against local replica)
 *   3. IDL imported from bundled idl/ directory
 */

import { Actor, HttpAgent } from "@dfinity/agent";
// @ts-expect-error — JS IDL file, no type declarations
import { idlFactory } from "../../idl/volta_backend.did.js";

const CANISTER_ID = "xswq7-nqaaa-aaaai-q75vq-cai";
const IC_HOST = "https://icp0.io";

let cachedAgent: HttpAgent | null = null;

async function getAgent(): Promise<HttpAgent> {
  if (!cachedAgent) {
    cachedAgent = await HttpAgent.create({ host: IC_HOST });
  }
  return cachedAgent;
}

function getActor() {
  return getAgent().then((agent) =>
    Actor.createActor(idlFactory, { agent, canisterId: CANISTER_ID })
  );
}

/**
 * Store an encrypted note on the canister.
 * @param ciphertext AES-256-GCM encrypted bytes (IV prepended)
 * @returns noteId — 8-character URL-safe ID
 */
export async function createNote(ciphertext: Uint8Array): Promise<string> {
  const actor = await getActor();
  return actor.createNote(ciphertext) as Promise<string>;
}

/**
 * Retrieve and permanently destroy a note.
 * Motoko `?Blob` maps to `[Uint8Array] | []` in JS.
 * @returns ciphertext bytes, or null if note not found / already burned
 */
export async function getAndBurnNote(
  noteId: string
): Promise<Uint8Array | null> {
  const actor = await getActor();
  const result = (await actor.getAndBurnNote(noteId)) as Array<Uint8Array>;
  return result.length > 0
    ? new Uint8Array(result[0])
    : null;
}

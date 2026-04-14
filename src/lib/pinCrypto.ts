/**
 * PIN cryptography utilities using Web Crypto API
 * Uses PBKDF2-SHA256 with 310k iterations for secure PIN hashing
 */

const ITERATIONS = 310000;
const HASH_ALGORITHM = "SHA-256";
const KEY_LENGTH = 32; // 256 bits

/**
 * Generate a random salt for PIN hashing
 */
export async function generateSalt(): Promise<string> {
  const saltBuffer = crypto.getRandomValues(new Uint8Array(16));
  return bufferToHex(saltBuffer);
}

/**
 * Hash a PIN with the given salt using PBKDF2-SHA256
 */
export async function hashPin(pin: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const pinBuffer = encoder.encode(pin);
  const saltBuffer = hexToBuffer(salt);

  // Import the PIN as a key
  const key = await crypto.subtle.importKey(
    "raw",
    pinBuffer,
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );

  // Derive bits
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: HASH_ALGORITHM,
      salt: saltBuffer,
      iterations: ITERATIONS,
    },
    key,
    KEY_LENGTH * 8
  );

  const hashBuffer = new Uint8Array(derivedBits);
  return bufferToHex(hashBuffer);
}

/**
 * Verify a PIN against its hash and salt
 */
export async function verifyPin(
  pin: string,
  hash: string,
  salt: string
): Promise<boolean> {
  const computedHash = await hashPin(pin, salt);
  return computedHash === hash;
}

/**
 * Convert Uint8Array to hex string
 */
function bufferToHex(buffer: Uint8Array): string {
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Convert hex string to Uint8Array
 */
function hexToBuffer(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

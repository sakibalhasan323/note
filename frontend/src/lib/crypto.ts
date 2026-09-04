// Cryptographic utility for secure password hashing and verification
// Uses standard Web Crypto API (SubtleCrypto) with PBKDF2 / SHA-256 and salt

export async function hashPassword(password: string, existingSaltHex?: string): Promise<string> {
  const enc = new TextEncoder();
  const passwordBuffer = enc.encode(password);

  let saltBuffer: Uint8Array;
  if (existingSaltHex) {
    const saltBytes = existingSaltHex.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || [];
    saltBuffer = new Uint8Array(saltBytes);
  } else {
    saltBuffer = new Uint8Array(16);
    crypto.getRandomValues(saltBuffer);
  }

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBuffer.buffer as ArrayBuffer,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );

  const hashArray = Array.from(new Uint8Array(derivedBits));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  const saltHex = Array.from(saltBuffer).map(b => b.toString(16).padStart(2, '0')).join('');

  return `${saltHex}:${hashHex}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    if (!storedHash) {
      return false;
    }
    const separatorIndex = storedHash.indexOf(':');
    if (separatorIndex <= 0 || separatorIndex === storedHash.length - 1) return false;
    const saltHex = storedHash.slice(0, separatorIndex);
    const expectedHashHex = storedHash.slice(separatorIndex + 1);
    if (!/^[0-9a-f]+$/i.test(saltHex) || !/^[0-9a-f]{64}$/i.test(expectedHashHex)) return false;
    const computedHash = await hashPassword(password, saltHex);
    const actualHashHex = computedHash.slice(computedHash.indexOf(':') + 1);
    return actualHashHex === expectedHashHex;
  } catch (err) {
    console.error('Password verification error', err);
    return false;
  }
}

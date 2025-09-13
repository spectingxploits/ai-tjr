import vault from "node-vault";
import * as crypto from "crypto";
// Connect to the Vault server (running from Brew)
const client = vault({
  apiVersion: "v1",
  endpoint: "http://127.0.0.1:8200", // Vault dev or prod endpoint
  token: process.env.VAULT_TOKEN || "myroot",
});

// // Encrypt user credentials
// async function encryptUserData(userData: string) {
//   const res = await client.write("transit/encrypt/server", {
//     plaintext: Buffer.from(userData).toString("base64"),
//   });
//   return res.data.ciphertext;
// }

// // Decrypt credentials
// async function decryptUserData(ciphertext: string) {
//   const res = await client.write("transit/decrypt/server", {
//     ciphertext,
//   });
//   return Buffer.from(res.data.plaintext, "base64").toString();
// }

export async function getAdminPublicKey() {
  const res = await client.read("transit/keys/tjrai");
  return res.data.public_key;
}

async function decryptAESKey(encryptedKeyBase64: string) {
  const res = await client.write("transit/decrypt/tjrai", {
    ciphertext: encryptedKeyBase64,
  });

  // Vault returns base64 plaintext
  const aesKey = Buffer.from(res.data.plaintext, "base64");
  return aesKey;
}

function decryptCredentials(
  encryptedCredsBase64: string,
  aesKey: Buffer,
  tradingPassword: string
) {
  const dataBuffer = Buffer.from(encryptedCredsBase64, "base64");

  // GCM auth tag + ciphertext
  const authTag = dataBuffer.slice(0, 16);
  const ciphertext = dataBuffer.slice(16);

  // IV derived from trading password
  const iv = crypto
    .createHash("sha256")
    .update(tradingPassword)
    .digest()
    .slice(0, 12);

  const decipher = crypto.createDecipheriv("aes-256-gcm", aesKey, iv);
  decipher.setAuthTag(authTag);

  let decrypted: Buffer;
  try {
    decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch (e) {
    throw new Error("Invalid trading password or tampered data");
  }

  // parse JSON
  const creds = JSON.parse(decrypted.toString("utf8"));

  // --- Safety: zero sensitive buffers ---
  aesKey.fill(0);
  decrypted.fill(0);
  dataBuffer.fill(0);

  return creds;
}

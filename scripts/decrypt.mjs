#!/usr/bin/env node
/**
 * Decrypt a payload produced by extract-secrets.
 *
 * Usage:
 *   node scripts/decrypt.mjs --key private.pem --payload <base64>
 */
import { constants, createDecipheriv, createPrivateKey, privateDecrypt } from 'node:crypto'
import { readFile } from 'node:fs/promises'

const args = process.argv.slice(2)

function getArg(flag) {
  const idx = args.indexOf(flag)
  return idx !== -1 ? args[idx + 1] : null
}

const keyPath = getArg('--key')
const payloadB64 = getArg('--payload')

if (!keyPath || !payloadB64) {
  console.error('Usage: node scripts/decrypt.mjs --key private.pem --payload <base64>')
  process.exit(1)
}

const privateKeyPem = await readFile(keyPath, 'utf8')
const privateKey = createPrivateKey(privateKeyPem)

const envelope = JSON.parse(Buffer.from(payloadB64, 'base64').toString('utf8'))

// Decrypt the AES key with RSA-OAEP
const aesKey = privateDecrypt(
  { key: privateKey, oaepHash: 'sha256', padding: constants.RSA_PKCS1_OAEP_PADDING },
  Buffer.from(envelope.key, 'base64'),
)

// Decrypt the secrets with AES-256-GCM
const decipher = createDecipheriv('aes-256-gcm', aesKey, Buffer.from(envelope.iv, 'base64'))
decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'))

const plaintext = Buffer.concat([
  decipher.update(Buffer.from(envelope.data, 'base64')),
  decipher.final(),
])

const secrets = JSON.parse(plaintext.toString('utf8'))
console.log(JSON.stringify(secrets, null, 2))

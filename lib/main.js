import * as core from '@actions/core'
import { constants, createCipheriv, createPublicKey, publicEncrypt, randomBytes } from 'node:crypto'

async function main() {
  const publicKeyInput = core.getInput('public-key', { required: true })
  const secretsInput = core.getInput('secrets', { required: true })

  // Parse secrets JSON
  let secrets
  try {
    secrets = JSON.parse(secretsInput)
  } catch {
    throw new Error('Invalid JSON in secrets input')
  }

  // Parse public key — support both plain PEM and base64-encoded PEM
  let publicKeyPem = publicKeyInput.trim()
  if (!publicKeyPem.includes('-----BEGIN')) {
    publicKeyPem = Buffer.from(publicKeyPem, 'base64').toString('utf8')
  }

  const publicKey = createPublicKey(publicKeyPem)

  // Generate AES-256-GCM key and IV
  const aesKey = randomBytes(32)
  const iv = randomBytes(12)

  // Encrypt secrets with AES-256-GCM
  const cipher = createCipheriv('aes-256-gcm', aesKey, iv)
  const plaintext = JSON.stringify(secrets)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  // Encrypt AES key with RSA-OAEP (SHA-256)
  const encryptedKey = publicEncrypt(
    { key: publicKey, oaepHash: 'sha256', padding: constants.RSA_PKCS1_OAEP_PADDING },
    aesKey,
  )

  // Build JSON envelope and base64-encode the whole thing
  const payload = {
    key: encryptedKey.toString('base64'),
    iv: iv.toString('base64'),
    tag: authTag.toString('base64'),
    data: ciphertext.toString('base64'),
  }

  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64')

  core.setOutput('encrypted-payload', encoded)
  core.info('Encrypted payload (copy this and decrypt locally):')
  core.info(encoded)
}

main()

#!/usr/bin/env node
// Generates an ADMIN_PASSWORD_HASH value for .dev.vars / wrangler secrets.
// Uses the same PBKDF2-SHA256 scheme verified in functions/lib/password.ts —
// if you change the algorithm here, update that file too.
import { webcrypto as crypto } from 'node:crypto'

const ITERATIONS = 100000

async function deriveBits(password, salt) {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    256,
  )
  return new Uint8Array(bits)
}

function toBase64(bytes) {
  return Buffer.from(bytes).toString('base64')
}

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const hash = await deriveBits(password, salt)
  return `pbkdf2:${ITERATIONS}:${toBase64(salt)}:${toBase64(hash)}`
}

const password = process.argv[2]
if (!password) {
  console.error('Usage: node scripts/hash-password.mjs "your-password"')
  process.exit(1)
}

const hash = await hashPassword(password)
console.log(`\nADMIN_PASSWORD_HASH=${hash}\n`)
console.log('Paste this into .dev.vars for local dev, and set it in production with:')
console.log('  wrangler pages secret put ADMIN_PASSWORD_HASH\n')

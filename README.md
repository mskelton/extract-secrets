# mskelton/extract-secrets

A GitHub Action that encrypts repository secrets so you can safely extract them to your local machine. Uses hybrid RSA + AES-256-GCM encryption — only the holder of the private key can decrypt the output.

## How it works

1. You generate an RSA key pair on your laptop
2. You pass the **public key** to the action (safe to expose)
3. The action encrypts the secrets and prints the encrypted payload to the job log
4. You copy the payload and decrypt it locally with your **private key**

## Setup

### 1. Generate a key pair

```bash
# Generate a 4096-bit RSA private key
openssl genrsa -out private.pem 4096

# Derive the public key
openssl rsa -in private.pem -pubout -out public.pem
```

Keep `private.pem` secret — never commit it or share it. `public.pem` is safe to share.

### 2. Add the public key as a repository secret

Base64-encode the public key and add it as a repository secret named `EXTRACT_PUBLIC_KEY`.

_macOS_

```bash
cat public.pem | base64 | pbcopy
```

_Linux_

```bash
cat public.pem | base64 | xclip
```

### 3. Create a workflow

```yaml
name: Extract Secrets

on:
  workflow_dispatch:

jobs:
  extract:
    runs-on: ubuntu-latest
    steps:
      - uses: mskelton/extract-secrets@v1
        with:
          public-key: ${{ secrets.EXTRACT_PUBLIC_KEY }}
          secrets: |
            {
              "API_KEY": "${{ secrets.API_KEY }}",
              "DATABASE_URL": "${{ secrets.DATABASE_URL }}",
              "SOME_TOKEN": "${{ secrets.SOME_TOKEN }}"
            }
```

Run the workflow manually via the Actions tab. The encrypted payload will appear in the job log.

## Decrypting locally

Download the decrypt script and run it with the encrypted payload from the job log:

```bash
curl -fsSL https://raw.githubusercontent.com/mskelton/extract-secrets/main/scripts/decrypt.mjs -o decrypt.mjs
node decrypt.mjs --key private.pem --payload "<paste payload here>"
```

Output is a JSON object with your secret values:

```json
{
  "API_KEY": "sk-...",
  "DATABASE_URL": "postgres://...",
  "SOME_TOKEN": "ghp_..."
}
```

You can redirect to a `.env` file or pipe through `jq`:

```bash
# Pretty-print a single value
node decrypt.mjs --key private.pem --payload "..." | jq -r '.API_KEY'

# Write all secrets to a .env file
node decrypt.mjs --key private.pem --payload "..." \
  | jq -r 'to_entries[] | "\(.key)=\(.value)"' > .env
```

## Inputs

| Input        | Required | Description                                        |
| ------------ | -------- | -------------------------------------------------- |
| `public-key` | Yes      | RSA public key in PEM format or base64-encoded PEM |
| `secrets`    | Yes      | JSON object of secret name/value pairs to encrypt  |

## Outputs

| Output              | Description                      |
| ------------------- | -------------------------------- |
| `encrypted-payload` | Base64-encoded encrypted payload |

## Security notes

- The public key is passed via a repository secret, not hardcoded, to avoid accidental key reuse
- Encryption uses RSA-OAEP (SHA-256) to wrap a per-run AES-256-GCM key — every run produces a unique ciphertext
- The private key never leaves your machine
- GitHub masks secret values in logs; the encrypted payload is safe to copy from a public log

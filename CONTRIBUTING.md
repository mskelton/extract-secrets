# Contributing

## Manual testing

### 1. Build the action

```bash
npm install
npm run build
```

### 2. Generate a test key pair

```bash
openssl genrsa -out private.pem 4096
openssl rsa -in private.pem -pubout -out public.pem
```

### 3. Add the public key as a repository secret

Base64-encode the public key and add it as `EXTRACT_PUBLIC_KEY` in your fork's repository secrets (**Settings → Secrets and variables → Actions**).

```bash
cat public.pem | base64 | pbcopy  # macOS
cat public.pem | base64 | xclip   # Linux
```

### 4. Run the test workflow

Trigger the **Test** workflow manually from the **Actions** tab of your fork. It runs the action against a set of hardcoded dummy secrets:

| Secret | Value |
| --- | --- |
| `API_KEY` | `sk-1234567890abcdef` |
| `DATABASE_URL` | `postgres://user:password@localhost:5432/mydb` |
| `SOME_TOKEN` | `ghp_abcdefghijklmnopqrstuvwxyz123456` |

### 5. Decrypt the output

Copy the encrypted payload printed in the job log, then download the decrypt script and run it:

```bash
curl -fsSL https://raw.githubusercontent.com/mskelton/extract-secrets/main/scripts/decrypt.mjs -o decrypt.mjs
node decrypt.mjs --key private.pem --payload "<paste payload here>"
```

If everything is working you should see the dummy secrets printed as JSON:

```json
{
  "API_KEY": "sk-1234567890abcdef",
  "DATABASE_URL": "postgres://user:password@localhost:5432/mydb",
  "SOME_TOKEN": "ghp_abcdefghijklmnopqrstuvwxyz123456"
}
```

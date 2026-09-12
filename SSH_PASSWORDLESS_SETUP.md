# Passwordless SSH Setup (Production)

This guide explains how passwordless SSH was set up for the production server.

## Goal

Connect to the server without entering a password every time.

- Local machine: macOS
- Server: `root@159.65.140.22`
- SSH alias used: `prod-inventory`

## 1) Generate SSH key (if missing)

```bash
ssh-keygen -t ed25519 -f "$HOME/.ssh/id_ed25519" -N "" -C "domingo@inventory-api"
```

This creates:

- Private key: `~/.ssh/id_ed25519`
- Public key: `~/.ssh/id_ed25519.pub`

## 2) Install public key on the server (one-time)

If password login is still required, install the key once:

```bash
PUBKEY_B64=$(base64 < "$HOME/.ssh/id_ed25519.pub" | tr -d '\n')
SSHPASS='<SERVER_PASSWORD>' sshpass -e ssh -o StrictHostKeyChecking=no root@159.65.140.22 "umask 077; mkdir -p ~/.ssh; touch ~/.ssh/authorized_keys; key=\$(echo '$PUBKEY_B64' | base64 -d); grep -qxF \"\$key\" ~/.ssh/authorized_keys || echo \"\$key\" >> ~/.ssh/authorized_keys; chmod 700 ~/.ssh; chmod 600 ~/.ssh/authorized_keys"
```

Notes:

- `sshpass` is only for one-time bootstrap.
- After this step, key-based login should work.

## 3) Verify passwordless login

```bash
ssh -o BatchMode=yes -o StrictHostKeyChecking=no root@159.65.140.22 'echo OK_KEY_LOGIN && hostname'
```

Expected: command succeeds with no password prompt.

## 4) Add SSH alias (recommended)

Append to `~/.ssh/config`:

```sshconfig
Host prod-inventory
  HostName 159.65.140.22
  User root
  IdentityFile ~/.ssh/id_ed25519
  IdentitiesOnly yes
```

Then verify:

```bash
ssh -o BatchMode=yes prod-inventory 'echo OK_ALIAS_LOGIN && hostname'
```

## 5) Use in deployments

```bash
./scripts/deploy-prod.sh
```

Or direct SSH:

```bash
ssh prod-inventory
```

## Security follow-up (recommended)

After key login is stable:

1. Disable password auth in SSH server config (`PasswordAuthentication no`).
2. Keep private key safe and never commit it.
3. Optionally use a passphrase-protected key for stronger security.


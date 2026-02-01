# Deploy GroupBuy on RHEL 10 (Docker Compose / SQLite)

This project is a Node.js + Express + Prisma app. **In this repo, Prisma migrations are currently locked to SQLite**, so the recommended production deployment uses **SQLite with a persistent volume**.

## Prerequisites

- RHEL 10 server (root or sudo access)
- A domain is optional (you can use IP + port)
- Outbound network access for pulling container images (only needed during install/build)

## Option A (Recommended): Docker Engine + Docker Compose

### 1) Install Docker Engine on RHEL 10

Follow Docker’s official instructions for RHEL (stable channel).  
If you already have Docker installed, skip this section.

```bash
sudo dnf install -y dnf-plugins-core ca-certificates curl
sudo dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

After installation, enable and start Docker:

```bash
sudo systemctl enable --now docker
sudo docker version
sudo docker compose version
```

Optional (allow running Docker without sudo):

```bash
sudo usermod -aG docker $USER
newgrp docker
```

### 2) Open firewall port (optional but typical)

If you want to access the app from outside the server:

```bash
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

If you deploy behind Nginx/HTTPS, you’ll typically open 80/443 instead.

### 3) Get the code onto the server

```bash
cd /opt
sudo mkdir -p groupbuy
sudo chown -R $USER:$USER groupbuy
cd groupbuy


# Clone your repo (or upload via scp/rsync)
sudo dnf install -y git
git clone https://github.com/flllexubleOuO/GroupBuy.git .
```

### 4) Create the environment file

This repo provides `env.example`. Copy it and edit values:

```bash
cp env.example .env
vi .env
```

```
NODE_ENV=production
PORT=3000
SESSION_SECRET=change-me-to-a-long-random-string
ADMIN_PASSWORD=change-me
SEED_ON_START=true
SEED_ALWAYS=true
```

### 5) Prepare persistent directories

Docker Compose (SQLite) persists the database at `./data/sqlite/prod.db` and mounts uploads/logs:

```bash
mkdir -p data/sqlite public/uploads logs
```

On SELinux-enforcing hosts, bind mounts may require a label. If you hit permission errors, see **SELinux notes** below.

### 6) Start the app

```bash
sudo docker compose up -d --build
sudo docker compose ps
```

If the build fails at `npm ci` with a message about a missing `package-lock.json`, either:

- make sure your repo checkout includes `package-lock.json` (recommended), or
- pull the latest changes: this repo’s Dockerfile will fall back to `npm install` when the lockfile is missing.

The container entrypoint automatically runs:

- `npx prisma migrate deploy`
- then starts the app

Open:

- `http://<server-ip>:3000/` (redirects to `/home`)


Then rebuild/restart:

```bash
docker compose up -d --build
```

## SELinux notes (RHEL 10)

If your containers cannot write to bind-mounted directories (`public/uploads`, `logs`, `data/sqlite`), you likely need SELinux labeling.

Two common approaches:

1) Add `:Z` label to bind mounts in `docker-compose.yml` (preferred)  
2) Or adjust file contexts manually

If you want, tell me whether SELinux is enforcing (`getenforce`) and I can provide the exact `:Z` changes for your compose file.

## Basic Operations

### View logs

```bash
docker compose logs -f --tail=200 app
```

### Restart / update

```bash
git pull
docker compose up -d --build
```

### Stop

```bash
docker compose down
```

## Backup (SQLite)

The database file is `./data/sqlite/prod.db`. Back it up regularly:

```bash
mkdir -p backups
cp -a data/sqlite/prod.db backups/prod.db.$(date +%F-%H%M%S)
```

## Troubleshooting

- **Can’t access from outside**: check `firewalld` rules and security groups (cloud).
- **Uploads/logs/db permission denied**: SELinux labeling is the #1 cause on RHEL.
- **App boots but shows empty data**: seed is optional; enable `SEED_ON_START=true` in mock envs.
- **App keeps restarting**: check `docker compose logs -f app` for runtime errors.

## Option B: Podman (RHEL default)

RHEL ships with Podman. You can run this project with Podman, but `docker compose` UX varies by setup.

If you prefer Podman:

- Install `podman` and a compose wrapper (`podman-compose`) or use `podman generate kube`
- Ensure volumes map to the same paths as in `docker-compose.yml`

If you tell me your preferred Podman workflow, I can add a dedicated `podman` deployment file.


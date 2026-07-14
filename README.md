# SerenityExpert — Expert / Staff Web Portal

React + Redux Toolkit + Tailwind CSS dashboard for verified experts.

## Features

- Expert OTP login (`/api/auth/expert/*`)
- Dashboard — earnings, calls, rating snapshot
- Online / Offline / Busy status toggle
- Incoming call accept / reject (realtime)
- Chat inbox with users
- Call history
- Earnings & withdrawal requests
- Weekly availability schedule
- Profile, bio, languages, bank details
- Notifications

## Setup

```bash
cd staff
cp .env.example .env
npm install
npm run dev
```

Runs on **http://localhost:3001**

## Env

```
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

## Seed experts (backend)

```bash
cd ../be
pnpm seed
```

Approved test mobiles: `9200000001`, `9200000002`, `9200000003`

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server (port 3001) |
| `npm run build` | Production build |
| `npm run preview` | Preview build |

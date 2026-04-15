@AGENTS.md

## Deploy Configuration (configured by /setup-deploy)
- Platform: Vercel
- Vercel project: sistemaescolar-pqrs (team: brunorochagarcia-1001s-projects)
- Production URL: https://sistemaescolar-pqrs.vercel.app
- Deploy workflow: auto-deploy on push to main
- Project type: Next.js web app
- Post-deploy health check: https://sistemaescolar-pqrs.vercel.app

### Custom deploy hooks
- Pre-merge: none
- Deploy trigger: automatic on push to main
- Deploy status: poll production URL
- Health check: https://sistemaescolar-pqrs.vercel.app

### Why it failed before
- `src/generated/prisma` is gitignored — Vercel never had the Prisma client
- Fix: added `"postinstall": "prisma generate"` to package.json scripts

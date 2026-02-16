# Brand Starter

Next.js App Router app that generates a branding kit from a short wizard flow.

## Features

- Multi-step setup wizard (`/`)
- Results page with palette, fonts, and post mock cards (`/results`)
- API route for OpenAI-powered brand JSON generation (`/api/brand`)
- Export post mock cards as PNG via `html-to-image`

## Tech Stack

- Next.js (App Router)
- React
- Tailwind CSS
- OpenAI Node SDK

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Create local env file:

```bash
cp .env.example .env.local
```

3. Set your key in `.env.local`:

```bash
OPENAI_API_KEY=your_real_key_here
```

4. Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deployment (Vercel)

1. Push this repo to GitHub/GitLab/Bitbucket.
2. In Vercel, import the repo as a new project.
3. In project settings, add environment variable:
   - `OPENAI_API_KEY` (Production, Preview, and Development as needed)
4. Deploy.

Vercel will use:
- Build command: `npm run build`
- Install command: `npm install`
- Output: Next.js managed output

## Clean Git Repo Checklist

1. Ensure secrets are not tracked:
   - `.env.local` stays local only
   - `.env.example` is committed as template only
2. Check status:

```bash
git status
```

3. Commit:

```bash
git add .
git commit -m "Prepare Brand Starter for Vercel deployment"
```

4. Push:

```bash
git push origin <branch-name>
```

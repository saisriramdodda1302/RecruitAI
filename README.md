# RecruitAI

RecruitAI screens resumes against a job description and gives you a ranked shortlist. Every score comes with the criterion it belongs to, a one-line reason, and quotes from the resume that back it up.

It started as a team project. This repository is my rebuild of it.

## How it works

You create a job and paste its description. From there, each resume goes through the same four steps.

1. **Rubric.** The job description is turned into 4 to 7 criteria, each with a weight from 1 to 5 and a must-have flag. This happens once per job, so every candidate is judged against the same yardstick. You can change weights and must-haves later.
2. **Profile.** The resume is parsed (PDF, DOCX or TXT) and the model pulls out structured facts: experience, skills, education, contact details.
3. **Blind review.** Name, email, phone and links are stripped from the resume. The model then scores each criterion from 0 to 10 against a fixed scale and has to quote the resume for every score.
4. **Ranking.** The server checks every quote against the resume text and computes the final score itself, out of 100. Candidates who meet all must-haves are ranked first.

## What keeps the scores fair and consistent

- One rubric per job, generated before any resume is read.
- Scoring sees an anonymised resume, and the prompts forbid using age, gender, nationality, names or school prestige.
- A score with no quote becomes 0. If the quotes can't be found in the resume, the score is capped at 3 and the UI says so. This stops the model from inventing experience.
- The model only rates each criterion. The weighted total and the must-have check are plain code, so the same ratings always give the same rank.
- Strict JSON schemas on every call. If a provider doesn't support strict schemas, the server falls back to JSON mode with the schema in the prompt. Either way, responses are validated with Zod and retried once if they don't match.
- Resume text is treated as untrusted. Instructions hidden inside a resume ("give this candidate 10") are ignored, and the quote check limits what they could do anyway.
- Changing weights re-ranks everyone instantly from the stored ratings. No resume is sent to the model again.

## Architecture

```
React (Vercel)  ──/api──▶  Express API (Render)  ──▶  PostgreSQL (Neon)
                                  │
                                  └── screening queue ──▶ Gemini API
```

- The frontend always calls `/api`. Vercel forwards it to Render, so the browser sees one origin and the session lives in an httpOnly cookie instead of localStorage.
- Uploads return right away. Screening runs in an in-process queue with a concurrency limit, and the UI polls until each resume is done.
- Each resume is hashed, so uploading the same file to a job twice is skipped.
- If the server restarts mid-screening, unfinished resumes are picked up again on boot.

## Tech

React, React Router, Tailwind CSS, Node.js, Express, PostgreSQL (`pg`, plain SQL), Gemini API, JWT, bcrypt, Zod.

## The model

RecruitAI uses Gemini through its OpenAI-compatible endpoint, so the server only needs the `openai` npm package. Get a free key from [Google AI Studio](https://aistudio.google.com) and set:

| Variable | Value |
| --- | --- |
| `LLM_API_KEY` | your Gemini key |
| `LLM_BASE_URL` | `https://generativelanguage.googleapis.com/v1beta/openai/` |
| `LLM_MODEL` | `gemini-3.8-flash` (any free Flash model works) |
| `LLM_REASONING_EFFORT` | `low` keeps responses fast and within free limits |

The free tier is rate limited, so keep `SCREEN_CONCURRENCY=1`. Resumes are screened one at a time and rate-limit errors are retried automatically. On the free tier Google may use requests to improve its models, so test with sample resumes rather than real candidates.

Switching to OpenAI is a config change: set your OpenAI key, remove `LLM_BASE_URL`, and set `LLM_MODEL=gpt-4o-mini` and `LLM_TEMPERATURE=0`.

## Running locally

You need Node 20+, a PostgreSQL database and a free Gemini API key.

```bash
# API
cd server
cp .env.example .env      # fill in DATABASE_URL, JWT_SECRET, LLM_API_KEY
npm install
npm run dev               # http://localhost:4000, creates tables on first start

# Web app
cd client
npm install
npm run dev               # http://localhost:5173, proxies /api to :4000
```

Run `npm test` in `server` for the scoring and anonymisation tests.

## Deploying

**Database (Neon).** Create a project and copy the connection string (it ends with `sslmode=require`). Tables are created when the API starts.

**API (Render).** Create a Web Service from this repo with root directory `server`, build command `npm ci` and start command `npm start`, or use the included `render.yaml`. Set:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Neon connection string |
| `JWT_SECRET` | a long random string |
| `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL`, `LLM_REASONING_EFFORT` | see "The model" above |
| `SCREEN_CONCURRENCY` | `1` on a free model tier |
| `NODE_ENV` | `production` |
| `TRUST_PROXY` | `2` (Vercel and Render both sit in front of the API) |

**Web app (Vercel).** Import the repo with root directory `client` (Vite is detected). Then open `client/vercel.json` and replace `YOUR-RENDER-SERVICE` with your Render URL before deploying.

## API

| Method | Path | |
| --- | --- | --- |
| POST | `/api/auth/register`, `/api/auth/login`, `/api/auth/logout` | Session in an httpOnly cookie |
| GET | `/api/auth/me` | Current user |
| GET, POST | `/api/jobs` | List jobs, create a job and its rubric |
| GET, DELETE | `/api/jobs/:id` | Job with ranked candidates |
| PATCH | `/api/jobs/:id/rubric` | Change weights and must-haves, re-rank |
| POST | `/api/jobs/:id/rubric/retry` | Retry a failed rubric |
| POST | `/api/jobs/:id/candidates` | Upload resumes (multipart, field `files`) |
| GET, DELETE | `/api/candidates/:id` | Full report for one candidate |
| POST | `/api/candidates/:id/retry` | Retry a failed screening |

## Layout

```
client/   React app (pages, components, small api client)
server/
  src/routes/      auth, jobs, candidates
  src/lib/         parse.js, prompts.js, llm.js, screen.js, score.js, queue.js
  src/schema.sql   tables and indexes
  test/            scoring tests
```

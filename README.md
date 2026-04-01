# 🧭 SourcingCompass (railway)

> AI-powered talent mapping for recruiters and sourcers. Know *where* to look before you start searching.

**Live:** [sourcingcompass2-production.up.railway.app](https://sourcingcompass2-production.up.railway.app)  
**Repo:** [github.com/Manubarki/SourcingCompass2](https://github.com/Manubarki/SourcingCompass2)

---

## What is SourcingCompass?

SourcingCompass is a talent intelligence tool that helps recruiters and hiring managers answer one of the hardest questions in recruiting:

**"Where do people like this actually work?"**

Instead of starting every search from scratch on LinkedIn, SourcingCompass gives you an instant, AI-generated map of the talent landscape for any role — showing you exactly which companies to target, which job titles to search, and how likely people are to move.

---

## Why does this exist?

Sourcing is time-consuming. A recruiter typically spends hours figuring out:
- Which companies hire people with these skills?
- What job titles should I search on LinkedIn?
- Who is actually likely to be open to a move right now?
- Are there any non-obvious talent pools I'm missing?

SourcingCompass answers all of these questions in under 30 seconds.

---

## What does it show you?

When you generate a map, you get four sections:

### 🔵 Target Companies
The most relevant companies to source from for your role. Each company card shows:
- **Match Confidence** — how relevant this company is for your specific role (0–100%)
- **Talent Density** — how many relevant engineers or professionals work there
- **Poachability Score** — how likely people at this company are to consider a move right now
- **Poachability Signals** — specific reasons why they might be open to moving (e.g. recent layoffs, equity concerns, slow growth)
- **Likely Talent Profile** — a one-line description of the type of person who typically works there
- **Company Stage** — whether it's a startup (Seed, Series A/B/C) or established company (Public, Enterprise)

### 🟣 Adjacent Talent Pools
Companies that aren't an obvious match but whose employees have highly transferable skills. These are the hidden gems most recruiters miss — people who could do the job well even though they don't come from a direct competitor.

### 🟠 Wildcard Bets
Unconventional companies with a surprising but specific reason their talent would be a great fit. Think outside the usual suspects — sometimes the best hire comes from an unexpected place.

### 🟢 Target Titles
The exact job titles you should search on LinkedIn or job boards. These are real titles as they appear in actual job postings — not generic labels. Each title includes which companies commonly use it and a match confidence score.

---

## How do I use it?

1. **Open the tool** at [sourcingcompass2-production.up.railway.app](https://sourcingcompass2-production.up.railway.app)
2. **Fill in the left panel:**
   - **Role Title** — the role you're hiring for (e.g. "Staff Backend Engineer")
   - **Hiring Company** — your company (so it doesn't show up in results)
   - **Location** — where the role is based or where you want to source from
   - **Seniority** — Junior, Mid, Senior, Staff, Principal, Director, or VP
   - **Must-Have Skills** — type a skill and press `,` or `Enter` to add it as a tag
   - **Preferred Industries** — industries to focus on (optional)
   - **Exclusions** — companies or industries you want to skip
   - **Paste Job Description** — drop a full JD to auto-fill all fields instantly
3. **Click Generate Map**
4. **Explore the results** — hover over any card to see why it was recommended

---

## How does it work?

1. You fill in your search parameters (or paste a JD)
2. SourcingCompass sends those details to Claude via the Atlan LiteLLM proxy
3. The AI generates a structured talent map grounded in a 2,000+ company MAD landscape dataset
4. Results are displayed as an interactive, tab-based map you can explore and export

The AI is instructed to only suggest real, verifiable companies — and to back up every poachability signal with a specific reason, not just a guess.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite 5 + Tailwind CSS v4 |
| Backend | Express.js (Node 20) |
| AI | Claude Sonnet via Atlan LiteLLM proxy |
| Company Memory | MAD landscape dataset (~2,000 ML/AI/Data companies) via Google Sheets |
| Hosting | Railway |

---

## Local Development

```bash
# Clone the repo
git clone https://github.com/Manubarki/SourcingCompass2.git
cd SourcingCompass2

# Install dependencies
npm install

# Set environment variable
export LITELLM_API_KEY=your_key_here

# Run dev server (frontend only, hot reload)
npm run dev

# In a separate terminal, run the Express server
node server.js
```

The Vite dev server runs on `http://localhost:5173`. For API calls to work locally, the Express server must also be running on port `3000`.

---

## Deployment (Railway)

The app is deployed on Railway using Nixpacks. Build and start commands are defined in `railway.toml`:

```toml
[build]
builder = "NIXPACKS"
buildCommand = "npm install && npm run build"

[deploy]
startCommand = "node server.js"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3
```

**Required environment variable in Railway:**

| Variable | Description |
|---|---|
| `LITELLM_API_KEY` | API key for the Atlan LiteLLM proxy |

---

## What makes a good search?

The more specific your inputs, the better your results:

- **Add specific skills** rather than leaving it blank — e.g. "Apache Iceberg, dbt, Spark" gives much better results than just "data engineering"
- **Use the Exclusions field** to skip companies you've already sourced from or that are off-limits
- **Try different seniority levels** — a Staff search and a Senior search will return different company mixes
- **Add preferred industries** if your hiring manager has a preference — e.g. "Fintech, Data Infrastructure"
- **Paste the full JD** for the most accurate results — the parser extracts skills, seniority, and context automatically

---

## Limitations

- The AI's knowledge has a cutoff date, so very recent company news may not always be reflected
- AI-generated results should be verified before sourcing — always do a quick sanity check
- The tool works best for technical roles but can be used for any function
- Poachability signals are inferred patterns, not confirmed facts — use them to tailor your angle, not as gospel

---

## Who built this?

Built by **Manu Barki** on the People team at Atlan. Part of a broader suite of AI-powered recruiting tools built to make the Atlan talent team faster and smarter.

Other tools in the suite: X-Ray Sourcing Agent · LinkedIn Profile Builder · ReviewRadar · LinkedIn Screening Assistant

---

## Feedback

Try it, break it, share your thoughts. Drop a message to Manu on Slack.

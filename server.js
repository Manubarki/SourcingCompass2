import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const app = express();
const PORT = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.use(express.json({ limit: "2mb" }));

app.use(express.static(join(__dirname, "dist"), {
  setHeaders: (res, path) => {
    if (path.endsWith(".js")) res.setHeader("Content-Type", "application/javascript");
    if (path.endsWith(".css")) res.setHeader("Content-Type", "text/css");
  }
}));

// ─── Company memory ───────────────────────────────────────────────────────────
const SHEET_URL = "https://docs.google.com/spreadsheets/d/1IlRq1Qab3ywgA1-r215HIZlh3e3m8Q6RT6kKvMePP4U/export?format=csv&gid=0";
let MEMORY = null;

function parseCSV(text) {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.replace(/"/g,"").trim().toLowerCase());
  return lines.slice(1).map(line => {
    const cols = []; let cur = "", q = false;
    for (const ch of line) {
      if (ch === '"') { q = !q; continue; }
      if (ch === "," && !q) { cols.push(cur.trim()); cur = ""; continue; }
      cur += ch;
    }
    cols.push(cur.trim());
    const obj = {};
    headers.forEach((h, i) => { obj[h] = cols[i] || ""; });
    return obj;
  }).filter(r => (r.company || r.name || "").trim());
}

async function getMemory() {
  if (MEMORY) return MEMORY;
  try {
    const res = await fetch(SHEET_URL);
    const csv = await res.text();
    MEMORY = parseCSV(csv).map(c => ({
      name: (c.company || c.name || "").trim(),
      cat:  (c.category || "").trim(),
      sub:  (c["sub category"] || c.subcategory || "").trim(),
      fund: (c.funding || "").trim(),
    })).filter(c => c.name);
    return MEMORY;
  } catch { return []; }
}

function getRelevant(companies, role, skills, industries) {
  const kw = [...role.toLowerCase().split(/\s+/), ...skills.map(s=>s.toLowerCase()), ...industries.map(i=>i.toLowerCase())].filter(k=>k.length>2);
  const scored = companies.map(c => {
    const txt = [c.name, c.cat, c.sub].join(" ").toLowerCase();
    return { ...c, score: kw.reduce((n,k) => n+(txt.includes(k)?1:0), 0) };
  });
  const rel = scored.filter(c=>c.score>0).sort((a,b)=>b.score-a.score).slice(0,25);
  const other = scored.filter(c=>c.score===0).sort(()=>Math.random()-0.5).slice(0,5);
  return [...rel,...other].map(c=>[c.name,c.sub||c.cat,c.fund].filter(Boolean).join(" | ")).join("\n");
}

// ─── LLM helpers ─────────────────────────────────────────────────────────────
async function callEndpoint(url, apiKey, model, prompt, maxTokens) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
    }),
  });
  const rawText = await response.text();
  let data;
  try { data = JSON.parse(rawText); }
  catch { throw new Error("Non-JSON: " + rawText.slice(0, 200)); }
  if (!response.ok) throw new Error(data?.error?.message || JSON.stringify(data));
  return data.content?.map(b => b.text || "").join("").trim() || "";
}

// Primary: Atlan LiteLLM proxy (uses dot notation) — Fallback: Anthropic direct (uses hyphen notation)
const LITELLM_MODEL   = "claude-haiku-4.5";           // LiteLLM alias (dot notation)
const ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";  // Anthropic direct API model ID

async function callLLM(prompt, maxTokens = 6000) {
  if (process.env.LITELLM_API_KEY) {
    try {
      console.log("[LLM] Trying primary (LiteLLM proxy) with", LITELLM_MODEL);
      const result = await callEndpoint("https://llmproxy.atlan.dev/v1/messages", process.env.LITELLM_API_KEY, LITELLM_MODEL, prompt, maxTokens);
      console.log("[LLM] Primary succeeded.");
      return result;
    } catch (err) {
      console.warn("[LLM] Primary failed:", err.message, "— trying fallback...");
    }
  }
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      console.log("[LLM] Trying fallback (Anthropic direct) with", ANTHROPIC_MODEL);
      const result = await callEndpoint("https://api.anthropic.com/v1/messages", process.env.ANTHROPIC_API_KEY, ANTHROPIC_MODEL, prompt, maxTokens);
      console.log("[LLM] Fallback succeeded.");
      return result;
    } catch (err) {
      throw new Error("Both LLM endpoints failed. Last error: " + err.message);
    }
  }
  throw new Error("No LLM API key configured. Set LITELLM_API_KEY or ANTHROPIC_API_KEY.");
}

// ─── /api/generate ────────────────────────────────────────────────────────────
app.post("/api/generate", async (req, res) => {
  try {
    const prompt = req.body.messages?.[0]?.content || "";
    const role = prompt.match(/Role:\s*(.+)/)?.[1] || "";
    const skills = (prompt.match(/Skills:\s*(.+)/)?.[1] || "").split(",").map(s=>s.trim());
    const industries = (prompt.match(/Preferred Industries:\s*(.+)/)?.[1] || "").split(",").map(s=>s.trim());
    const companies = await getMemory();
    const companyList = companies.length > 0
      ? "\n\nVERIFIED COMPANY LIST — only suggest companies from this list:\n" + getRelevant(companies, role, skills, industries)
      : "";
    const text = await callLLM(prompt + companyList);
    res.json({ content: [{ type: "text", text }] });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── /api/source — X-ray candidate sourcing via Serper ───────────────────────
app.post("/api/source", async (req, res) => {
  const { companies, role, skills, seniority, location } = req.body;
  if (!companies?.length || !role) return res.status(400).json({ error: "companies and role are required" });

  const SERPER_KEY = process.env.SERPER_API_KEY;
  if (!SERPER_KEY) return res.status(500).json({ error: "SERPER_API_KEY not configured" });

  const targets = companies.slice(0, 8);
  const normTargets = targets.map(t => t.toLowerCase().replace(/[^a-z0-9]/g, ""));

  const topSkill    = skills?.[0] || "";
  const secondSkill = skills?.[1] || "";

  // LinkedIn subdomain by location
  const LINKEDIN_SITE = {
    "United States": { site:"linkedin.com/in",  loc:"United States" },
    "Canada":        { site:"ca.linkedin.com/in", loc:"" },
    "India":         { site:"in.linkedin.com/in", loc:"" },
    "United Kingdom":{ site:"uk.linkedin.com/in", loc:"" },
    "Europe":        { site:"linkedin.com/in",  loc:"Europe" },
    "Australia":     { site:"au.linkedin.com/in", loc:"" },
    "Singapore":     { site:"sg.linkedin.com/in", loc:"" },
  };
  const locConfig = LINKEDIN_SITE[location] || { site:"linkedin.com/in", loc:"" };
  const site = locConfig.site;
  const locHint = locConfig.loc ? ` "${locConfig.loc}"` : "";

  // Build skill constraints — must-haves go in as quoted terms
  const mustSkills = (skills || []).filter(s => s && s.trim()).slice(0, 3);
  const skillQuery = mustSkills.map(s => `"${s}"`).join(" ");

  const queries = targets.flatMap(company => {
    // q1: company + role + ALL must-have skills (quoted = mandatory match)
    const q1 = skillQuery
      ? `site:${site} "${company}" "${role}" ${skillQuery}${locHint}`
      : `site:${site} "${company}" "${role}"${locHint}`;
    // q2: company + top skill only + seniority (broader fallback)
    const q2 = topSkill
      ? `site:${site} "${company}" "${topSkill}" ${seniority}${locHint}`
      : `site:${site} "${company}" "${role}" ${seniority}${locHint}`;
    return [q1, q2];
  });

  let rawResults = [];
  try {
    const responses = await Promise.all(
      queries.map(q =>
        fetch("https://google.serper.dev/search", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-API-KEY": SERPER_KEY },
          body: JSON.stringify({ q, num: 5 }),
        }).then(r => r.json()).catch(() => ({ organic: [] }))
      )
    );
    // Tag each result with the company that was queried — ground truth, no parsing needed
    rawResults = responses.flatMap((r, i) => {
      const queryCompany = targets[Math.floor(i / 2)]; // 2 queries per company
      return (r.organic || []).map(item => ({ ...item, _queryCompany: queryCompany }));
    });
    console.log(`[SOURCE] Raw Serper results: ${rawResults.length}`);
  } catch (err) {
    return res.status(500).json({ error: "Serper search failed: " + err.message });
  }

  function parseCandidate(result) {
    const url = result.link || "";
    if (!url.includes("linkedin.com/in/")) return null;

    const snippet  = result.snippet || "";
    const rawTitle = result.title   || "";

    // Name: everything before first " - " or " | "
    const nameMatch = rawTitle.match(/^([^|\-]+?)(?:\s*[-|]|$)/);
    const name = nameMatch ? nameMatch[1].trim() : "Unknown";

    // Title: strip name, company suffix, LinkedIn suffix
    const afterName = rawTitle.replace(/^[^-]+-\s*/, "");
    const cleanedTitle = afterName
      .replace(/\s*\|.*$/, "")
      .replace(/\s*[@＠]\s*\S+.*$/, "")
      .replace(/\s+at\s+.+$/i, "")
      .trim();

    // Use the queried company as ground truth — eliminates hallucination
    const queriedCompany = result._queryCompany || "";

    const emailMatch = snippet.match(/[\w.+-]+@[\w-]+\.[a-z]{2,}/i);
    const email = emailMatch ? emailMatch[0] : null;

    const kw = [role, ...(skills || []), seniority || ""].map(k => k.toLowerCase());
    const fullText = [name, cleanedTitle, queriedCompany, snippet].join(" ").toLowerCase();
    const score = kw.reduce((n, k) => n + (k && fullText.includes(k) ? 1 : 0), 0);

    return { name, currentTitle: cleanedTitle, currentCompany: queriedCompany, linkedinUrl: url, email, snippet, score };
  }

  // currentCompany is now always the queried company — filter always passes
  // Extra safety: also accept if URL contains target company name
  function isFromTargetCompany(c) {
    if (!c.currentCompany) return false;
    const compNorm = c.currentCompany.toLowerCase().replace(/[^a-z0-9]/g, "");
    const urlNorm  = c.linkedinUrl.toLowerCase();
    return normTargets.some(t =>
      compNorm.includes(t) || t.includes(compNorm) || urlNorm.includes(t)
    );
  }

  // Title relevance — at least one word from the searched role must appear in profile title
  // This is role-agnostic: works for engineering, CS, PM, legal, finance etc.
  const roleKeywords = role.toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 3) // skip short words like "of", "and", "the"
    .map(w => w.replace(/s$/, "")); // basic stemming: "engineers" -> "engineer"

  function isTitleRelevant(c) {
    const title = (c.currentTitle || "").toLowerCase();
    if (!title) return true; // no title parsed — give benefit of doubt
    // At least one meaningful word from the role must appear in their title
    return roleKeywords.some(word => title.includes(word));
  }

  // Post-filter: snippet or title must contain at least one must-have skill
  function hasRequiredSkill(c) {
    if (!mustSkills.length) return true;
    const text = [c.currentTitle, c.snippet].join(" ").toLowerCase();
    return mustSkills.some(skill => text.includes(skill.toLowerCase()));
  }

  const seen = new Set();
  const candidates = rawResults
    .map(parseCandidate)
    .filter(Boolean)
    .filter(c => {
      if (seen.has(c.linkedinUrl)) return false;
      seen.add(c.linkedinUrl);
      if (!c.name || c.name === "Unknown") return false;
      if (!isFromTargetCompany(c)) return false;
      if (!isTitleRelevant(c)) { console.log(`[FILTER] Excluded by title mismatch: "${c.currentTitle}" vs role "${role}" — ${c.name}`); return false; }
      if (!hasRequiredSkill(c)) { console.log(`[FILTER] Excluded missing skills: ${c.name}`); return false; }
      return true;
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 30);

  console.log(`[SOURCE] After filters: ${candidates.length} candidates (role: ${role}, skills: ${mustSkills.join(", ")||"none"})`);
  res.json({ candidates });
});

// ─── SPA fallback ─────────────────────────────────────────────────────────────
app.get("*", (req, res) => {
  res.sendFile(join(__dirname, "dist", "index.html"));
});

app.listen(PORT, () => console.log("SourcingCompass running on port " + PORT));

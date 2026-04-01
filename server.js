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

// ─── LiteLLM helper ──────────────────────────────────────────────────────────
async function callLLM(prompt, maxTokens = 6000) {
  const response = await fetch("https://llmproxy.atlan.dev/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
      "x-api-key": process.env.LITELLM_API_KEY,
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
    }),
  });
  const rawText = await response.text();
  let data;
  try { data = JSON.parse(rawText); }
  catch { throw new Error("Non-JSON from proxy: " + rawText.slice(0, 200)); }
  if (!response.ok) throw new Error(data?.error?.message || JSON.stringify(data));
  return data.content?.map(b => b.text || "").join("").trim() || "";
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

// ─── /api/source ──────────────────────────────────────────────────────────────
app.post("/api/source", async (req, res) => {
  const { companies, role, skills, seniority, location } = req.body;
  if (!companies?.length || !role) return res.status(400).json({ error: "companies and role are required" });

  const SERPER_KEY = process.env.SERPER_API_KEY;
  if (!SERPER_KEY) return res.status(500).json({ error: "SERPER_API_KEY not configured" });

  const targets = companies.slice(0, 8);
  const normTargets = targets.map(t => t.toLowerCase().replace(/[^a-z0-9]/g, ""));

  // Seniority terms — what words MUST appear in a matching title
  const SENIORITY_MAP = {
    "junior":    ["junior", "associate", "entry level"],
    "mid":       ["mid", "intermediate", "ii", "level 2"],
    "senior":    ["senior", "sr "],
    "staff":     ["staff"],
    "principal": ["principal", "distinguished"],
    "director":  ["director", "head of"],
    "vp":        ["vp ", "vice president", "head of engineering"],
  };
  const senKey = (seniority || "").toLowerCase();
  const senTerms = SENIORITY_MAP[senKey] || [senKey];

  // Core role noun — strip seniority prefix
  const roleCore = role.toLowerCase()
    .replace(/^(junior|mid|senior|staff|principal|director|vp)\s+/i, "")
    .trim();

  // Role keywords — at least one must appear in the title
  // e.g. "staff engineer" → ["engineer"]
  // e.g. "data engineer" → ["data", "engineer"]
  const roleCoreWords = roleCore.split(/\s+/).filter(w => w.length > 3);

  const topSkill    = skills?.[0] || "";
  const secondSkill = skills?.[1] || "";

  // 2 queries per company — both lock in seniority + role core
  const queries = targets.flatMap(company => {
    const q1 = `site:linkedin.com/in "${company}" "${seniority} ${roleCore}"${topSkill ? ` "${topSkill}"` : ""}`;
    const q2 = secondSkill
      ? `site:linkedin.com/in "${company}" "${seniority} ${roleCore}" "${secondSkill}"`
      : `site:linkedin.com/in "${company}" "${seniority}" "${roleCore}"`;
    return [q1, q2];
  });

  let rawResults = [];
  try {
    const responses = await Promise.all(
      queries.map(q =>
        fetch("https://google.serper.dev/search", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-API-KEY": SERPER_KEY },
          body: JSON.stringify({ q, num: 5, gl: "us" }),
        }).then(r => r.json()).catch(() => ({ organic: [] }))
      )
    );
    rawResults = responses.flatMap(r => r.organic || []);
  } catch (err) {
    return res.status(500).json({ error: "Serper search failed: " + err.message });
  }

  function parseCandidate(result) {
    const url = result.link || "";
    if (!url.includes("linkedin.com/in/")) return null;

    const snippet = result.snippet || "";
    const rawTitle = result.title || "";

    // Name: everything before the first " - " or " | "
    const nameMatch = rawTitle.match(/^([^|\-]+?)(?:\s*[-|]|$)/);
    const name = nameMatch ? nameMatch[1].trim() : "Unknown";

    // Title: strip name, strip "| LinkedIn", strip "@Company" suffixes
    // Google titles look like: "Name - Title at Company | LinkedIn"
    //                      or: "Name - Title @Company | LinkedIn"
    const afterName = rawTitle.replace(/^[^-]+-\s*/, "");
    const cleanedTitle = afterName
      .replace(/\s*\|.*$/, "")           // remove "| LinkedIn" suffix
      .replace(/\s*[@＠]\s*\S+.*$/, "")  // remove "@Company" suffix
      .replace(/\s+at\s+.+$/i, "")       // remove "at Company" suffix
      .trim();

    // Company: try "at Company" pattern, then "@Company"
    const atMatch = rawTitle.match(/\s+(?:at|@)\s+([^|]+?)(?:\s*\||$)/i);
    const currentCompany = atMatch ? atMatch[1].trim() : "";

    const emailMatch = snippet.match(/[\w.+-]+@[\w-]+\.[a-z]{2,}/i);
    const email = emailMatch ? emailMatch[0] : null;

    const sourceCompany = targets.find(c =>
      url.toLowerCase().includes(c.toLowerCase().replace(/\s+/g, "")) ||
      snippet.toLowerCase().includes(c.toLowerCase()) ||
      rawTitle.toLowerCase().includes(c.toLowerCase())
    ) || currentCompany || "";

    const kw = [role, roleCore, ...(skills || []), seniority || ""].map(k => k.toLowerCase());
    const fullText = [name, cleanedTitle, currentCompany, snippet].join(" ").toLowerCase();
    const score = kw.reduce((n, k) => n + (k && fullText.includes(k) ? 1 : 0), 0);

    return {
      name,
      currentTitle: cleanedTitle,
      currentCompany: currentCompany || sourceCompany,
      linkedinUrl: url,
      email,
      snippet,
      score,
    };
  }

  // STRICT title filter:
  // The candidate's title OR snippet must contain:
  //   (a) at least one seniority term, AND
  //   (b) at least one role core word
  // If title is empty, fall back to snippet check only
  function hasTitleMatch(c) {
    const t = (c.currentTitle || "").toLowerCase();
    const s = (c.snippet || "").toLowerCase();
    const checkIn = t || s; // prefer title, fall back to snippet

    const hasSen  = senTerms.some(term => checkIn.includes(term));
    const hasRole = roleCoreWords.length === 0 || roleCoreWords.some(w => checkIn.includes(w));
    return hasSen && hasRole;
  }

  function isFromTargetCompany(c) {
    const compNorm = (c.currentCompany || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const snipNorm = (c.snippet || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const urlNorm  = c.linkedinUrl.toLowerCase();
    return normTargets.some(t =>
      (compNorm && (compNorm.includes(t) || t.includes(compNorm))) ||
      snipNorm.includes(t) ||
      urlNorm.includes(t)
    );
  }

  const seen = new Set();
  const candidates = rawResults
    .map(parseCandidate)
    .filter(Boolean)
    .filter(c => {
      if (seen.has(c.linkedinUrl)) return false;
      seen.add(c.linkedinUrl);
      return (
        c.name &&
        c.name !== "Unknown" &&
        isFromTargetCompany(c) &&
        hasTitleMatch(c)
      );
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 30);

  res.json({ candidates });
});

// ─── SPA fallback ─────────────────────────────────────────────────────────────
app.get("*", (req, res) => {
  res.sendFile(join(__dirname, "dist", "index.html"));
});

app.listen(PORT, () => console.log("SourcingCompass running on port " + PORT));

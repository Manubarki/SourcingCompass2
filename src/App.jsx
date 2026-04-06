import { useState, useRef, useEffect } from "react";

// ─── Atlan 2026 design tokens ────────────────────────────────────────────────
// blue-800:#0D0F54  blue-700:#13177E  blue-500:#2026D2  blue-400:#4D51DB
// blue-200:#D2D4F6  blue-100:#E9E9FA  blue-50:#F4F4FD   blue-25:#F9F9FC
// neutrals-800:#141517  neutrals-600:#2B2B39  neutrals-500:#555572
// neutrals-400:#77778E  neutrals-300:#9999AA  neutrals-100:#DDDDE3  neutrals-50:#EEEEF1
// cyan-500:#62E1FC  pink-500:#F34D77  green-500:#00B28A

const GRID_SIZE = 36;

const DOC_CONTEXT = "SourcingCompass is a talent intelligence tool built by Manu Barki at Atlan. It helps recruiters find where talent lives by generating a map of Target Companies, Adjacent Talent Pools, Wildcard Bets, and Target Titles for any role. Four result tabs plus a Candidates tab for live Google X-ray sourcing. AI model: Claude Sonnet. Company memory grounded in MAD landscape dataset. Skills input via tags (comma or Enter). JD parser auto-fills fields. CSV export available.";

// ─── Tile grid background ─────────────────────────────────────────────────────
function TileGrid() {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="tiles" width={GRID_SIZE} height={GRID_SIZE} patternUnits="userSpaceOnUse">
          <rect width={GRID_SIZE-2} height={GRID_SIZE-2} x="1" y="1" fill="none" stroke="#E9E9FA" strokeWidth="1" rx="3"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#tiles)"/>
    </svg>
  );
}

// ─── Category config ──────────────────────────────────────────────────────────
const CAT = {
  companies: { dot:"#62E1FC", label:"Target Companies",     desc:"Direct sourcing targets — companies where your ideal candidate likely works today",  tagBg:"#F4F4FD", tagBorder:"#D2D4F6", tagText:"#4D51DB" },
  adjacent:  { dot:"#a78bfa", label:"Adjacent Talent Pools", desc:"Companies with transferable skills — not obvious, but highly relevant",              tagBg:"#faf5ff", tagBorder:"#ddd6fe", tagText:"#6d28d9" },
  wildcards: { dot:"#fb923c", label:"Wildcard Bets",          desc:"Unconventional bets — surprising sources most recruiters never think to check",        tagBg:"#fff7ed", tagBorder:"#fed7aa", tagText:"#c2410c" },
  titles:    { dot:"#00B28A", label:"Target Titles",          desc:"Exact LinkedIn search terms — copy these directly into your search",                   tagBg:"#f0fffc", tagBorder:"#a7f3d0", tagText:"#065f46" },
};

// ─── Tag input ────────────────────────────────────────────────────────────────
function TagInput({ placeholder, tags, onChange }) {
  const [input, setInput] = useState("");
  const ref = useRef(null);
  function handleKey(e) {
    if ((e.key === "," || e.key === "Enter") && input.trim()) {
      e.preventDefault();
      onChange([...tags, input.trim().replace(/,$/, "")]);
      setInput("");
    } else if (e.key === "Backspace" && !input && tags.length) {
      onChange(tags.slice(0, -1));
    }
  }
  function handlePaste(e) {
    e.preventDefault();
    const parts = e.clipboardData.getData("text").split(/[,\n]+/).map(t => t.trim()).filter(Boolean);
    if (parts.length > 1) onChange([...tags, ...parts]);
    else setInput(parts[0] || "");
  }
  return (
    <div style={{width:"100%",minHeight:"38px",background:"#1C2444",border:"1px solid #2D3A6B",borderRadius:"6px",padding:"5px 8px",display:"flex",flexWrap:"wrap",gap:"6px",cursor:"text"}}
      onClick={() => ref.current?.focus()}>
      {tags.map((t, i) => (
        <span key={i} style={{display:"flex",alignItems:"center",gap:"4px",fontSize:"12px",padding:"2px 8px",borderRadius:"4px",fontWeight:500,background:"rgba(0,178,138,0.15)",border:"1px solid rgba(0,178,138,0.35)",color:"#34D399",fontFamily:"Inter,sans-serif"}}>
          {t}
          <button type="button" onClick={e => { e.stopPropagation(); onChange(tags.filter((_, j) => j !== i)); }}
            style={{color:"rgba(52,211,153,0.5)",background:"none",border:"none",cursor:"pointer",padding:0,lineHeight:1,fontSize:"14px"}}>×</button>
        </span>
      ))}
      <input ref={ref} style={{background:"transparent",fontSize:"13px",color:"#94A3B8",outline:"none",flex:1,minWidth:"80px",fontFamily:"Inter,sans-serif"}}
        placeholder={tags.length ? "" : placeholder} value={input}
        onChange={e => setInput(e.target.value)} onKeyDown={handleKey} onPaste={handlePaste}/>
    </div>
  );
}

// ─── Score bar ────────────────────────────────────────────────────────────────
function Bar({ label, value, color, trackColor }) {
  return (
    <div className="mt-2">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-[11px] text-[#9999AA] font-medium">{label}</span>
        <span className="text-[12px] font-semibold" style={{color}}>{value}</span>
      </div>
      <div className="w-full h-[5px] rounded-full" style={{background: trackColor || "#EEEEF1"}}>
        <div className="h-full rounded-full transition-all duration-700" style={{width:`${value}%`, background:color}}/>
      </div>
    </div>
  );
}

// ─── Company card ─────────────────────────────────────────────────────────────
function CompanyCard({ node }) {
  const [hov, setHov] = useState(false);
  const s = CAT.companies;
  return (
    <div className="relative bg-white border border-[#DDDDE3] rounded-xl p-4 transition-all duration-150 select-none overflow-visible cursor-default hover:border-[#D2D4F6] hover:shadow-[0_4px_16px_rgba(32,38,210,0.08)]"
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="text-[14px] font-semibold text-[#141517]">{node.label}</div>
        {node.stage && (
          <span className="text-[10px] px-2 py-0.5 rounded-full border border-[#DDDDE3] text-[#77778E] font-medium whitespace-nowrap flex-shrink-0 bg-[#F6F6F8]">{node.stage}</span>
        )}
      </div>
      {node.sub && <div className="text-[12px] text-[#77778E] mb-2.5">{node.sub}</div>}
      {node.tags && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {node.tags.map(t => (
            <span key={t} className="text-[11px] px-2 py-0.5 rounded-md font-medium" style={{background:s.tagBg, border:`1px solid ${s.tagBorder}`, color:s.tagText}}>{t}</span>
          ))}
        </div>
      )}
      {node.confidence != null && <Bar label="Relevance" value={node.confidence} color="#00B28A" trackColor="#f0fffc"/>}
      {node.talentDensity != null && <Bar label="Talent Density" value={node.talentDensity} color="#62E1FC" trackColor="#EFF9FF"/>}
      {node.poachability != null && <Bar label="Poachability" value={node.poachability} color="#4D51DB" trackColor="#F4F4FD"/>}
      {node.likelyProfile && (
        <div className="mt-3 pt-3 border-t border-[#EEEEF1]">
          <div className="text-[10px] text-[#9999AA] font-semibold uppercase tracking-wider mb-1">Likely Profile</div>
          <div className="text-[12px] text-[#555572] leading-relaxed">{node.likelyProfile}</div>
        </div>
      )}
      {node.poachabilitySignals?.length > 0 && (
        <div className="mt-3 pt-3 border-t border-[#EEEEF1]">
          <div className="text-[10px] text-[#9999AA] font-semibold uppercase tracking-wider mb-1.5">Signals</div>
          {node.poachabilitySignals.map((sig, i) => (
            <div key={i} className="flex gap-2 mt-1">
              <span className="text-[#CCCCD5] text-xs mt-0.5 flex-shrink-0">›</span>
              <span className="text-[12px] text-[#555572] leading-relaxed">{sig}</span>
            </div>
          ))}
        </div>
      )}
      {node.whyRelevant && hov && (
        <div className="absolute top-2 left-full z-50 pl-3 pointer-events-none" style={{width:"220px"}}>
          <div className="bg-white border border-[#D2D4F6] rounded-xl p-3 shadow-[0_8px_32px_rgba(32,38,210,0.12)]" style={{borderLeft:"3px solid #2026D2"}}>
            <div className="text-[10px] text-[#4D51DB] font-semibold uppercase tracking-wider mb-1.5">Why relevant</div>
            <div className="text-[12px] text-[#2B2B39] leading-relaxed">{node.whyRelevant}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Simple card ──────────────────────────────────────────────────────────────
function SimpleCard({ node, cat }) {
  const s = CAT[cat];
  return (
    <div className="bg-white border border-[#DDDDE3] rounded-xl p-4 transition-all duration-150 hover:border-[#D2D4F6] hover:shadow-[0_4px_16px_rgba(32,38,210,0.06)]">
      <div className="text-[14px] font-semibold text-[#141517] mb-1">{node.label}</div>
      {node.sub && <div className="text-[12px] text-[#77778E] mb-2.5">{node.sub}</div>}
      {node.tags && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {node.tags.map(t => (
            <span key={t} className="text-[11px] px-2 py-0.5 rounded-md font-medium" style={{background:s.tagBg, border:`1px solid ${s.tagBorder}`, color:s.tagText}}>{t}</span>
          ))}
        </div>
      )}
      {cat === "titles" && node.confidence != null && (
        <Bar label="Confidence" value={node.confidence} color="#00B28A" trackColor="#f0fffc"/>
      )}
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────
function Section({ cat, nodes }) {
  const s = CAT[cat];
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{background:s.dot, boxShadow:`0 0 0 3px ${s.dot}22`}}/>
        <span className="text-[11px] font-semibold text-[#2B2B39] tracking-[0.1em] uppercase">{s.label}</span>
        <div className="flex-1 h-px bg-[#EEEEF1]"/>
        <span className="text-[11px] text-[#9999AA]">{nodes.length} results</span>
      </div>
      <div className="text-[12px] text-[#9999AA] mb-4 -mt-2">{s.desc}</div>
      <div className="grid grid-cols-3 gap-3">
        {nodes.map(n => cat === "companies"
          ? <CompanyCard key={n.id} node={n}/>
          : <SimpleCard key={n.id} node={n} cat={cat}/>
        )}
      </div>
    </div>
  );
}

// ─── Candidate card ───────────────────────────────────────────────────────────
function CandidateCard({ candidate, index }) {
  const initials = candidate.name.split(" ").slice(0,2).map(w=>w[0]||"").join("").toUpperCase() || "?";
  const colors = ["#2026D2","#00B28A","#62E1FC","#fb923c","#F34D77","#a78bfa"];
  const lightBgs = ["#F4F4FD","#f0fffc","#EFF9FF","#fff7ed","#fdf2f8","#faf5ff"];
  const color = colors[index % colors.length];
  const bg = lightBgs[index % lightBgs.length];
  return (
    <div className="bg-white border border-[#DDDDE3] rounded-xl p-4 hover:border-[#D2D4F6] hover:shadow-[0_4px_16px_rgba(32,38,210,0.06)] transition-all duration-150 group">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-[12px] font-semibold"
          style={{background:bg, color, border:`1.5px solid ${color}33`, fontFamily:"Inter,sans-serif"}}>
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[14px] font-semibold text-[#141517] leading-tight" style={{fontFamily:"Inter,sans-serif"}}>{candidate.name}</div>
              {candidate.currentTitle && <div className="text-[12px] text-[#555572] mt-0.5" style={{fontFamily:"Inter,sans-serif"}}>{candidate.currentTitle}</div>}
              {candidate.currentCompany && (
                <div className="flex items-center gap-1.5 mt-1">
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{background:color}}/>
                  <span className="text-[12px] font-medium" style={{color, fontFamily:"Inter,sans-serif"}}>{candidate.currentCompany}</span>
                </div>
              )}
            </div>
            <a href={candidate.linkedinUrl} target="_blank" rel="noopener noreferrer"
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-150 hover:opacity-90"
              style={{background:"linear-gradient(135deg,#0077b5,#0a66c2)",color:"#fff",textDecoration:"none",fontFamily:"Inter,sans-serif"}}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
              View
            </a>
          </div>
          {candidate.email && (
            <div className="mt-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#f0fffc] border border-[#a7f3d0]">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#00B28A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
              </svg>
              <span className="text-[11px] text-[#00B28A] font-medium" style={{fontFamily:"Inter,sans-serif"}}>{candidate.email}</span>
            </div>
          )}
          {candidate.snippet && (
            <p className="mt-2 text-[11px] text-[#9999AA] leading-relaxed line-clamp-2 group-hover:text-[#77778E] transition-colors" style={{fontFamily:"Inter,sans-serif"}}>
              {candidate.snippet}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Candidates tab ───────────────────────────────────────────────────────────
function CandidatesTab({ mapData, form }) {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sourced, setSourced] = useState(false);
  const abortRef = useRef(null);

  const allCompanies = [
    ...(mapData.companies||[]).map(c=>({name:c.label,score:(c.confidence||0)+(c.poachability||0)})),
    ...(mapData.adjacent ||[]).map(c=>({name:c.label,score:50})),
    ...(mapData.wildcards||[]).map(c=>({name:c.label,score:40})),
  ].sort((a,b)=>b.score-a.score);
  const targetNames = allCompanies.map(c=>c.name);

  function stop() { if(abortRef.current) abortRef.current.abort(); setLoading(false); }

  async function source() {
    if(abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setLoading(true); setError(""); setCandidates([]);
    try {
      const res = await fetch("/api/source", {
        method:"POST", headers:{"Content-Type":"application/json"},
        signal: abortRef.current.signal,
        body: JSON.stringify({ companies:targetNames, role:form.role, skills:form.skills, seniority:form.seniority, location:form.location }),
      });
      const data = await res.json();
      if(!res.ok) { setError(data.error||"Source failed"); setLoading(false); return; }
      setCandidates(data.candidates||[]);
      setSourced(true);
    } catch(e) { if(e.name!=="AbortError") setError("Network error: "+e.message); }
    setLoading(false);
  }

  function exportCSV() {
    const rows = [["Name","Title","Company","LinkedIn","Email","Snippet"]];
    candidates.forEach(c=>rows.push([c.name,c.currentTitle,c.currentCompany,c.linkedinUrl,c.email||"",c.snippet||""]));
    const csv = rows.map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
    a.download = "Candidates_"+form.role.replace(/\s+/g,"_")+".csv";
    a.click();
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{background:"#F34D77", boxShadow:"0 0 0 3px #F34D7722"}}/>
        <span className="text-[11px] font-semibold text-[#2B2B39] tracking-[0.1em] uppercase">Live Candidates</span>
        <div className="flex-1 h-px bg-[#EEEEF1]"/>
        {sourced && <span className="text-[11px] text-[#9999AA]">{candidates.length} found</span>}
      </div>

      <div className="mb-4 p-3 rounded-xl border border-[#DDDDE3] bg-[#F9F9FC]">
        <div className="text-[10px] text-[#9999AA] font-semibold uppercase tracking-wider mb-2">Searching across</div>
        <div className="flex flex-wrap gap-1.5">
          {targetNames.slice(0,8).map((name,i)=>(
            <span key={i} className="text-[11px] px-2.5 py-0.5 rounded-md font-medium bg-white border border-[#DDDDE3] text-[#555572]">{name}</span>
          ))}
          {targetNames.length>8 && <span className="text-[11px] px-2 py-0.5 text-[#9999AA]">+{targetNames.length-8} more</span>}
        </div>
      </div>

      <div className="mb-4 text-[11px] text-[#9999AA] bg-[#F9F9FC] border border-[#EEEEF1] rounded-lg px-3 py-2">
        ~{Math.min(targetNames.length,8)*2} Serper credits per search
      </div>

      {error && <div className="mb-3 text-[12px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}

      {!sourced && !loading && (
        <button type="button" onClick={source}
          className="w-full py-2.5 rounded-xl text-[12px] font-semibold text-white transition-all"
          style={{background:"#F34D77", boxShadow:"0 4px 16px rgba(243,77,119,0.25)"}}>
          Source Candidates →
        </button>
      )}

      {loading && (
        <div className="flex flex-col items-center gap-4 py-12">
          <div className="w-7 h-7 border-2 border-[#F34D77] border-t-transparent rounded-full animate-spin"/>
          <div className="text-center">
            <div className="text-[12px] text-[#555572] font-medium">Scanning LinkedIn</div>
            <div className="text-[11px] text-[#9999AA] mt-1">{Math.min(targetNames.length,8)*2} queries in flight</div>
          </div>
          <button type="button" onClick={stop}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 text-red-500 text-[11px] font-semibold hover:bg-red-50 transition-all">
            <div className="w-1.5 h-1.5 rounded-sm bg-red-500"/>
            Stop
          </button>
        </div>
      )}

      {sourced && !loading && (
        <>
          {candidates.length===0 ? (
            <div className="text-center py-10">
              <div className="text-[#DDDDE3] text-3xl mb-3">∅</div>
              <div className="text-[#555572] text-[13px] font-medium">No profiles found</div>
              <div className="text-[#9999AA] text-[12px] mt-1">Try broader skills or a different role title</div>
              <button type="button" onClick={source} className="mt-4 px-5 py-2 rounded-lg text-[12px] font-semibold border border-[#DDDDE3] text-[#555572] hover:border-[#F34D77] hover:text-[#F34D77] transition-all">Retry</button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <div className="text-[12px] text-[#9999AA]">{candidates.length} profiles · ranked by relevance</div>
                <div className="flex gap-2">
                  <button type="button" onClick={exportCSV} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-[#f0fffc] border border-[#a7f3d0] text-[#00B28A] hover:bg-[#dcfce7] transition-all">CSV</button>
                  <button type="button" onClick={source} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold border border-[#DDDDE3] text-[#555572] hover:border-[#F34D77] hover:text-[#F34D77] transition-all">Re-run</button>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {candidates.map((c,i)=><CandidateCard key={c.linkedinUrl} candidate={c} index={i}/>)}
              </div>
              <div className="mt-4 text-[11px] text-[#9999AA] text-center">X-ray sourced · always verify before outreach</div>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────
const TABS = [
  { id:"companies", label:"Companies",  dot:"#62E1FC", count: d => d.companies?.length },
  { id:"adjacent",  label:"Adjacent",   dot:"#a78bfa", count: d => d.adjacent?.length  },
  { id:"wildcards", label:"Wildcards",  dot:"#fb923c", count: d => d.wildcards?.length  },
  { id:"titles",    label:"Titles",     dot:"#00B28A", count: d => d.titles?.length     },
  { id:"candidates",label:"Candidates", dot:"#F34D77", isNew:true },
];

function ResultTabs({ mapData, form }) {
  const [active, setActive] = useState("companies");
  const nodes = { companies:mapData.companies, adjacent:mapData.adjacent, wildcards:mapData.wildcards, titles:mapData.titles };
  return (
    <div>
      <div className="flex items-end gap-0 mb-6 border-b border-[#EEEEF1]">
        {TABS.map(t=>(
          <button key={t.id} type="button" onClick={()=>setActive(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium transition-all border-b-2 -mb-px ${
              active===t.id
                ? "text-[#2026D2] border-[#2026D2]"
                : "text-[#9999AA] border-transparent hover:text-[#555572]"
            }`}>
            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{background: active===t.id ? t.dot : "#DDDDE3"}}/>
            {t.label}
            {t.count && mapData && <span className="ml-1 text-[10px] text-[#9999AA]">{t.count(mapData)}</span>}
            {t.isNew && <span className="ml-1 text-[9px] px-1.5 py-0.5 rounded bg-[#FDDBE4] border border-[#F894AD] text-[#F34D77] font-semibold">NEW</span>}
          </button>
        ))}
      </div>
      {active==="candidates"
        ? <CandidatesTab mapData={mapData} form={form}/>
        : <Section cat={active} nodes={nodes[active]}/>
      }
    </div>
  );
}

// ─── Loading screen ───────────────────────────────────────────────────────────
function LoadingScreen() {
  const [step, setStep] = useState(0);
  const steps = TABS.filter(t=>t.id!=="candidates");
  useEffect(()=>{ const iv=setInterval(()=>setStep(s=>(s+1)%steps.length),900); return ()=>clearInterval(iv); },[]);
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-5">
      <div className="w-6 h-6 border-2 border-[#2026D2] border-t-transparent rounded-full animate-spin"/>
      <div className="space-y-2 text-center">
        <div className="text-[11px] text-[#9999AA] uppercase tracking-wider mb-2">Mapping talent</div>
        {steps.map((t,i)=>(
          <div key={t.id} className={`flex items-center justify-center gap-2 transition-all duration-300 ${i===step?"opacity-100":"opacity-20"}`}>
            <div className="w-1.5 h-1.5 rounded-full" style={{background:t.dot}}/>
            <span className="text-[12px] font-medium" style={{color:i===step?t.dot:"#9999AA"}}>{t.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Chatbot avatar ───────────────────────────────────────────────────────────
function AvatarFace({ thinking, size=32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <circle cx="18" cy="18" r="17" fill="#0D0F54" stroke="#62E1FC" strokeWidth="1.2"/>
      <line x1="18" y1="1" x2="18" y2="35" stroke="#62E1FC" strokeWidth="0.3" opacity="0.2"/>
      <line x1="1" y1="18" x2="35" y2="18" stroke="#62E1FC" strokeWidth="0.3" opacity="0.2"/>
      {thinking ? (
        <>
          <rect x="10" y="14" width="5" height="2" rx="1" fill="#62E1FC" opacity="0.9">
            <animate attributeName="width" values="5;2;5" dur="1.2s" repeatCount="indefinite"/>
          </rect>
          <rect x="21" y="14" width="5" height="2" rx="1" fill="#62E1FC" opacity="0.9">
            <animate attributeName="width" values="5;2;5" dur="1.2s" repeatCount="indefinite"/>
          </rect>
          <path d="M12 24 Q18 22 24 24" stroke="#62E1FC" strokeWidth="1.5" strokeLinecap="round" fill="none">
            <animate attributeName="d" values="M12 24 Q18 22 24 24;M12 23 Q18 25 24 23;M12 24 Q18 22 24 24" dur="1s" repeatCount="indefinite"/>
          </path>
        </>
      ) : (
        <>
          <rect x="10" y="13" width="5" height="5" rx="1.5" fill="#62E1FC" opacity="0.9"/>
          <rect x="21" y="13" width="5" height="5" rx="1.5" fill="#62E1FC" opacity="0.9"/>
          <rect x="12" y="15" width="2" height="2" rx="0.5" fill="#0D0F54"/>
          <rect x="23" y="15" width="2" height="2" rx="0.5" fill="#0D0F54"/>
          <path d="M12 23 Q18 27 24 23" stroke="#62E1FC" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
        </>
      )}
      <circle cx="18" cy="5" r="1.2" fill="#62E1FC">
        <animate attributeName="opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite"/>
      </circle>
    </svg>
  );
}

function renderMessage(text) {
  return text.split(/\*([^*]+)\*/g).map((p,i)=>i%2===1?<strong key={i} className="text-[#2026D2] font-semibold">{p}</strong>:<span key={i}>{p}</span>);
}

// ─── Chatbot ──────────────────────────────────────────────────────────────────
function Chatbot() {
  const [open,setOpen]=useState(false);
  const [messages,setMessages]=useState([{role:"assistant",text:"Hey! I'm Compass — ask me anything about how this tool works."}]);
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const bottomRef=useRef(null);
  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:"smooth"}); },[messages]);

  async function send() {
    const q=input.trim(); if(!q||loading) return;
    setInput(""); setMessages(m=>[...m,{role:"user",text:q}]); setLoading(true);
    try {
      const history=messages.map(m=>({role:m.role==="assistant"?"assistant":"user",content:m.text}));
      const res=await fetch("/api/generate",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({messages:[{role:"user",content:"You are Compass, a concise guide for SourcingCompass. Answer in 2-3 sentences. Bold key terms with *asterisks*.\n\nDOCS:\n"+DOC_CONTEXT+"\n\nHistory:\n"+history.map(h=>h.role+": "+h.content).join("\n")+"\n\nQ: "+q}]})});
      const data=await res.json();
      const text=data.content?.map(b=>b.text||"").join("").trim()||"Couldn't get a response.";
      setMessages(m=>[...m,{role:"assistant",text}]);
    } catch { setMessages(m=>[...m,{role:"assistant",text:"Something went wrong."}]); }
    setLoading(false);
  }

  return (
    <>
      <button type="button" onClick={()=>setOpen(v=>!v)}
        className="fixed bottom-5 right-5 z-50 transition-all hover:scale-105"
        style={{filter:"drop-shadow(0 4px 12px rgba(13,15,84,0.2))"}}>
        {open
          ? <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold" style={{background:"#0D0F54",border:"1px solid rgba(98,225,252,0.4)",color:"#62E1FC"}}>×</div>
          : <AvatarFace thinking={false}/>}
      </button>
      {open && (
        <div className="fixed bottom-16 right-5 z-50 w-72 bg-white border border-[#DDDDE3] rounded-2xl shadow-[0_12px_48px_rgba(32,38,210,0.15)] flex flex-col overflow-hidden"
          style={{height:"400px"}}>
          <div className="px-4 py-3 border-b border-[#EEEEF1] flex items-center gap-2.5 bg-[#F9F9FC]">
            <AvatarFace thinking={loading} size={30}/>
            <div>
              <div className="text-[12px] font-semibold text-[#141517]">Compass</div>
              <div className="text-[10px] text-[#9999AA]">{loading?"Thinking...":"SourcingCompass guide"}</div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
            {messages.map((m,i)=>(
              <div key={i} className={m.role==="user"?"flex justify-end":"flex justify-start gap-2 items-end"}>
                {m.role==="assistant"&&<div className="flex-shrink-0 mb-0.5"><AvatarFace thinking={false} size={24}/></div>}
                <div className={`max-w-[82%] rounded-xl px-3 py-2 text-[12px] leading-relaxed ${m.role==="user"?"bg-[#2026D2] text-white rounded-br-none":"bg-[#F4F4FD] text-[#2B2B39] border border-[#E9E9FA] rounded-bl-none"}`}>
                  {renderMessage(m.text)}
                </div>
              </div>
            ))}
            {loading&&(
              <div className="flex justify-start gap-2 items-end">
                <AvatarFace thinking={true} size={24}/>
                <div className="bg-[#F4F4FD] border border-[#E9E9FA] rounded-xl rounded-bl-none px-3 py-2.5 flex gap-1">
                  {[0,1,2].map(i=><div key={i} className="w-1.5 h-1.5 rounded-full bg-[#4D51DB] animate-bounce" style={{animationDelay:i*0.15+"s"}}/>)}
                </div>
              </div>
            )}
            <div ref={bottomRef}/>
          </div>
          {messages.length===1&&(
            <div className="px-3 pb-2 flex flex-wrap gap-1">
              {["What is poachability?","How do wildcards work?","How does sourcing work?"].map(q=>(
                <button key={q} type="button" onClick={()=>setInput(q)}
                  className="text-[10px] px-2.5 py-1 rounded-lg border border-[#DDDDE3] text-[#777 78E] hover:text-[#2026D2] hover:border-[#D2D4F6] transition-all">{q}</button>
              ))}
            </div>
          )}
          <div className="px-3 py-3 border-t border-[#EEEEF1] flex gap-2">
            <input className="flex-1 bg-[#F9F9FC] border border-[#DDDDE3] rounded-lg px-3 py-1.5 text-[12px] text-[#141517] placeholder-[#9999AA] focus:outline-none focus:border-[#4D51DB] transition-colors"
              placeholder="Ask anything..." value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()}/>
            <button type="button" onClick={send} disabled={loading||!input.trim()}
              className="px-3 py-1.5 rounded-lg bg-[#2026D2] hover:bg-[#4D51DB] text-white text-[12px] font-semibold disabled:opacity-30 transition-all">→</button>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Prompt builder ───────────────────────────────────────────────────────────
function buildPrompt(form) {
  return [
    "You are a talent intelligence system. Return a structured talent map as JSON only. No markdown, no explanation, no backticks.",
    "CRITICAL: Every company MUST be real and currently active. Location is "+(form.location||"not specified")+". ONLY suggest companies with actual engineering presence in "+(form.location||"the specified location")+".",
    "Role: "+form.role, "Hiring Company: "+form.company, "Location: "+form.location,
    "Seniority: "+form.seniority, "Skills: "+form.skills.join(", "),
    "Preferred Industries: "+(form.industries.join(", ")||"Any"),
    "Exclusions: "+(form.exclusions.join(", ")||"None"),
    "",
    'Return this JSON: {"companies":[{"id":"c1","label":"Name","sub":"Industry","tags":["t"],"confidence":85,"stage":"Series B","talentDensity":78,"poachability":65,"likelyProfile":"sentence.","poachabilitySignals":["[Signal] x"],"whyRelevant":"sentence."}],"adjacent":[{"id":"a1","label":"Name","sub":"Why","tags":["t"]}],"wildcards":[{"id":"w1","label":"Name","sub":"Reason","tags":["t"]}],"titles":[{"id":"t1","label":"Title","sub":"Companies","tags":["t"],"confidence":90}]}',
    "Rules: 6-8 companies, NEVER include "+form.company+", adjacent=4-5 companies, wildcards=3-4 TECH companies only, titles=5-7 exact job titles, stage=Public/Late Stage/Series C+/Series B/Series A/Seed/Enterprise, Return ONLY raw valid JSON.",
  ].join("\n");
}

const EMPTY = { companies:[], adjacent:[], wildcards:[], titles:[] };
const LOCATIONS = ["United States","Canada","India","United Kingdom","Europe","Australia","Singapore"];

// ─── Resizable sidebar ────────────────────────────────────────────────────────
function ResizableSidebar({ children }) {
  const [width, setWidth] = useState(280);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startW = useRef(0);
  function onMouseDown(e) {
    dragging.current=true; startX.current=e.clientX; startW.current=width;
    document.body.style.cursor="col-resize"; document.body.style.userSelect="none";
  }
  useEffect(() => {
    function onMouseMove(e) {
      if(!dragging.current) return;
      setWidth(Math.min(480,Math.max(220,startW.current+(e.clientX-startX.current))));
    }
    function onMouseUp() {
      if(!dragging.current) return;
      dragging.current=false; document.body.style.cursor=""; document.body.style.userSelect="";
    }
    window.addEventListener("mousemove",onMouseMove);
    window.addEventListener("mouseup",onMouseUp);
    return ()=>{ window.removeEventListener("mousemove",onMouseMove); window.removeEventListener("mouseup",onMouseUp); };
  },[]);
  return (
    <div style={{width,flexShrink:0,position:"relative",background:"#0D0F54",borderRight:"1px solid #13177E"}} className="flex flex-col z-10">
      {children}
      <div onMouseDown={onMouseDown} className="absolute top-0 right-0 w-1 h-full cursor-col-resize group z-20" style={{marginRight:"-0.5px"}}>
        <div className="absolute top-0 right-0 w-1 h-full transition-all group-hover:bg-[#62E1FC]/30 group-active:bg-[#62E1FC]/50"/>
      </div>
    </div>
  );
}

// ─── Main app ─────────────────────────────────────────────────────────────────
export default function TalentMap() {
  const [form, setForm] = useState({ role:"", company:"", location:"United States", seniority:"Senior", skills:[], industries:[], exclusions:[] });
  const [mapData, setMapData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState("");
  const [generated, setGenerated] = useState(false);
  const [showJD, setShowJD] = useState(false);
  const jdRef = useRef(null);
  const generateAbortRef = useRef(null);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const allNodes = mapData ? [...mapData.companies,...mapData.adjacent,...mapData.wildcards,...mapData.titles] : [];

  async function parseJD() {
    const txt=jdRef.current?.value||""; if(!txt.trim()) return;
    setParsing(true); setError("");
    try {
      const res=await fetch("/api/generate",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({messages:[{role:"user",content:'Extract from this JD, return ONLY raw JSON: {"role":"title","seniority":"Senior/Staff/etc","skills":["s1"]} JD: '+txt.slice(0,2000)}]})});
      const data=await res.json();
      const raw=data.content?.map(b=>b.text||"").join("").trim();
      let clean=raw.replace(/```json|```/g,"").trim();
      const lb=clean.lastIndexOf("}"); if(lb!==-1) clean=clean.slice(0,lb+1);
      const parsed=JSON.parse(clean);
      setForm(f=>({...f,role:parsed.role||f.role,seniority:parsed.seniority||f.seniority,skills:parsed.skills?.length?parsed.skills:f.skills}));
      setShowJD(false);
    } catch(e) { setError("JD parse failed: "+e.message); }
    setParsing(false);
  }

  function stopGenerate() { if(generateAbortRef.current) generateAbortRef.current.abort(); setLoading(false); }

  async function generate() {
    if(!form.role.trim()) { setError("Role title is required."); return; }
    if(generateAbortRef.current) generateAbortRef.current.abort();
    generateAbortRef.current=new AbortController();
    setError(""); setLoading(true); setMapData(null);
    try {
      const res=await fetch("/api/generate",{method:"POST",headers:{"Content-Type":"application/json"},
        signal:generateAbortRef.current.signal,
        body:JSON.stringify({messages:[{role:"user",content:buildPrompt(form)}]})});
      const data=await res.json();
      if(!res.ok) { setError("API error "+res.status+": "+JSON.stringify(data)); setLoading(false); return; }
      const raw=data.content?.map(b=>b.text||"").join("").trim();
      const parsed=JSON.parse(raw.replace(/```json|```/g,"").trim());
      setMapData({...EMPTY,...parsed}); setGenerated(true);
    } catch(e) { if(e.name!=="AbortError") setError("Error: "+e.message); }
    setLoading(false);
  }

  function exportCSV() {
    const rows=[["Section","Company/Title","Stage","Relevance","Density","Poachability","Profile","Signals","Why","Tags"]];
    mapData.companies.forEach(n=>rows.push(["Target",n.label,n.stage||"",n.confidence||"",n.talentDensity||"",n.poachability||"",n.likelyProfile||"",(n.poachabilitySignals||[]).join(" | "),n.whyRelevant||"",(n.tags||[]).join(", ")]));
    mapData.adjacent.forEach(n=>rows.push(["Adjacent",n.label,"","","","","","","",(n.tags||[]).join(", ")]));
    mapData.wildcards.forEach(n=>rows.push(["Wildcard",n.label,"","","","","","","",(n.tags||[]).join(", ")]));
    mapData.titles.forEach(n=>rows.push(["Title",n.label,"",n.confidence||"","","","","","",(n.tags||[]).join(", ")]));
    const csv=rows.map(r=>r.map(c=>'"'+String(c).replace(/"/g,'""')+'"').join(",")).join("\n");
    const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
    a.download="SourcingCompass_"+form.role.replace(/\s+/g,"_")+".csv"; a.click();
  }

  // Exact input styles matching target Image 2
  // Inputs: dark navy bg, 6px radius, slate border, light text
  const INP = {
    display:"block", width:"100%", background:"#1C2444",
    border:"1px solid #2D3A6B", borderRadius:"6px",
    padding:"8px 10px", fontSize:"13px", color:"#E2E8F0",
    outline:"none", fontFamily:"Inter,sans-serif",
  };
  const LBL = {
    display:"block", fontSize:"11px", fontWeight:500,
    color:"#8892B0", marginBottom:"6px", letterSpacing:"0.02em",
    fontFamily:"Inter,sans-serif",
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{fontFamily:"Inter,sans-serif",background:"#F9F9FC"}}>

      {/* ── Sidebar ── */}
      <ResizableSidebar>

        {/* Header */}
        <div style={{padding:"18px 18px 14px", borderBottom:"1px solid #1C2A5E"}}>
          <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
            {/* Logo circle matching target — teal ring, compass needle */}
            <div style={{width:"36px",height:"36px",borderRadius:"50%",background:"rgba(98,225,252,0.1)",border:"1.5px solid rgba(98,225,252,0.4)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <svg width="20" height="20" viewBox="0 0 28 28" fill="none">
                <polygon points="14,4 12.2,15 14,13.5 15.8,15" fill="#62E1FC"/>
                <polygon points="14,24 12.2,13 14,14.5 15.8,13" fill="rgba(98,225,252,0.3)"/>
                <circle cx="14" cy="14" r="2" fill="#0D0F54" stroke="#62E1FC" strokeWidth="1.5"/>
              </svg>
            </div>
            <div>
              <div style={{fontFamily:"Inter,sans-serif",fontWeight:700,fontSize:"15px",color:"#FFFFFF",letterSpacing:"-0.01em",lineHeight:1.2}}>SourcingCompass</div>
              <div style={{fontFamily:"Inter,sans-serif",fontSize:"10px",color:"#62E1FC",letterSpacing:"0.15em",textTransform:"uppercase",fontWeight:600,marginTop:"2px",opacity:0.9}}>Talent Intelligence</div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div style={{flex:1,overflowY:"auto",padding:"16px",display:"flex",flexDirection:"column",gap:"12px"}}>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px"}}>
            <div>
              <label style={LBL}>Role Title</label>
              <input style={INP} placeholder="e.g. Staff Engineer" value={form.role} onChange={e=>set("role",e.target.value)}/>
            </div>
            <div>
              <label style={LBL}>Company</label>
              <input style={INP} placeholder="e.g. Atlan" value={form.company} onChange={e=>set("company",e.target.value)}/>
            </div>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px"}}>
            <div>
              <label style={LBL}>Location</label>
              <select style={{...INP,appearance:"auto"}} value={form.location} onChange={e=>set("location",e.target.value)}>
                {LOCATIONS.map(l=><option key={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label style={LBL}>Seniority</label>
              <select style={{...INP,appearance:"auto"}} value={form.seniority} onChange={e=>set("seniority",e.target.value)}>
                {["Junior","Mid","Senior","Staff","Principal","Director","VP"].map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={LBL}>Must-Have Skills</label>
            <TagInput placeholder="Type skill, press , or Enter" tags={form.skills} onChange={v=>set("skills",v)}/>
          </div>

          <div>
            <label style={LBL}>Industries</label>
            <TagInput placeholder="e.g. Fintech, Data" tags={form.industries} onChange={v=>set("industries",v)}/>
          </div>

          <div>
            <label style={LBL}>Exclusions</label>
            <TagInput placeholder="Companies to skip" tags={form.exclusions} onChange={v=>set("exclusions",v)}/>
          </div>

          <div>
            <button type="button" onClick={()=>setShowJD(v=>!v)}
              style={{fontSize:"11px",color:"#62E1FC",fontWeight:500,background:"none",border:"none",cursor:"pointer",padding:0,fontFamily:"Inter,sans-serif"}}>
              + {showJD?"Hide":"Paste"} Job Description
            </button>
            {showJD && (
              <div style={{marginTop:"8px",display:"flex",flexDirection:"column",gap:"8px"}}>
                <textarea ref={jdRef} rows={5} style={{...INP,resize:"none"}} placeholder="Paste JD here..."/>
                <button type="button" onClick={parseJD} disabled={parsing}
                  style={{width:"100%",padding:"8px",borderRadius:"6px",fontSize:"11px",fontWeight:600,background:"#2026D2",color:"white",border:"none",cursor:"pointer",opacity:parsing?0.5:1,fontFamily:"Inter,sans-serif"}}>
                  {parsing?"Parsing...":"Parse JD — auto-fill fields"}
                </button>
              </div>
            )}
          </div>

          <div style={{fontSize:"11px",color:"#4A5A8A",fontFamily:"Inter,sans-serif"}}>
            AI-generated · verify before sourcing
          </div>

          {error && <div style={{fontSize:"11px",color:"#FCA5A5",background:"rgba(127,29,29,0.3)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:"6px",padding:"8px 10px"}}>{error}</div>}

          {!loading ? (
            <button type="button" onClick={generate}
              style={{width:"100%",padding:"10px 16px",borderRadius:"8px",fontSize:"13px",fontWeight:600,color:"white",border:"none",cursor:"pointer",background:"#2026D2",display:"flex",alignItems:"center",justifyContent:"center",gap:"8px",fontFamily:"Inter,sans-serif",boxShadow:"0 2px 8px rgba(32,38,210,0.4)"}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
              Generate Map
            </button>
          ) : (
            <div style={{display:"flex",gap:"8px"}}>
              <div style={{flex:1,padding:"10px",borderRadius:"8px",fontSize:"12px",fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:"8px",background:"#13177E",color:"#797DE4",fontFamily:"Inter,sans-serif"}}>
                <div style={{width:"14px",height:"14px",border:"2px solid #62E1FC",borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
                Generating...
              </div>
              <button type="button" onClick={stopGenerate}
                style={{display:"flex",alignItems:"center",gap:"6px",padding:"8px 14px",borderRadius:"8px",fontSize:"11px",fontWeight:600,border:"1px solid rgba(239,68,68,0.4)",color:"#FCA5A5",background:"none",cursor:"pointer",fontFamily:"Inter,sans-serif"}}>
                <div style={{width:"6px",height:"6px",borderRadius:"2px",background:"#EF4444"}}/>Stop
              </button>
            </div>
          )}
        </div>

        {/* Legend */}
        <div style={{padding:"12px 16px",borderTop:"1px solid #1C2A5E"}}>
          <div style={{fontSize:"10px",color:"#4A5A8A",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:"10px",fontFamily:"Inter,sans-serif"}}>Legend</div>
          {Object.entries(CAT).map(([k,s])=>(
            <div key={k} style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"6px"}}>
              <div style={{width:"6px",height:"6px",borderRadius:"50%",background:s.dot,flexShrink:0}}/>
              <span style={{fontSize:"11px",color:"#6B7FA8",fontFamily:"Inter,sans-serif"}}>{s.label}</span>
            </div>
          ))}
          <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"6px"}}>
            <div style={{width:"6px",height:"6px",borderRadius:"50%",background:"#F34D77",flexShrink:0}}/>
            <span style={{fontSize:"11px",color:"#6B7FA8",fontFamily:"Inter,sans-serif"}}>Candidates</span>
          </div>
        </div>
      </ResizableSidebar>

      {/* ── Canvas ── */}
      <div className="flex-1 relative overflow-y-auto min-w-0" style={{background:"#F9F9FC"}}>
        <TileGrid/>

        {!generated && !loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8">
            <div className="w-16 h-16 rounded-2xl bg-white border border-[#DDDDE3] flex items-center justify-center mb-5 shadow-[0_4px_16px_rgba(32,38,210,0.08)]">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <polygon points="14,4 12,14 14,12.5 16,14" fill="#2026D2"/>
                <polygon points="14,24 12,14 14,15.5 16,14" fill="#DDDDE3"/>
                <circle cx="14" cy="14" r="2" fill="white" stroke="#2026D2" strokeWidth="1.5"/>
                <circle cx="14" cy="14" r="10" stroke="#2026D2" strokeWidth="1" opacity="0.2"/>
              </svg>
            </div>
            <div className="text-[16px] font-semibold text-[#141517] mb-2">Configure your search</div>
            <div className="text-[13px] text-[#9999AA] max-w-xs">Fill in the role, skills, and location — then generate a talent map</div>
          </div>
        )}

        {loading && <LoadingScreen/>}

        {mapData && !loading && (
          <div className="relative z-10 p-8">
            {/* Result header */}
            <div className="mb-6 pb-5 border-b border-[#EEEEF1] flex items-start justify-between gap-4">
              <div>
                <div className="text-[22px] font-semibold text-[#141517] leading-tight">
                  {form.role} <span className="text-[#CCCCD5] font-normal">·</span> <span className="text-[#555572] font-normal">{form.seniority}</span>
                </div>
                <div className="text-[13px] text-[#9999AA] mt-1.5">
                  {[form.company,form.location].filter(Boolean).join(" · ")} · {allNodes.length} nodes mapped
                </div>
              </div>
              <button type="button" onClick={exportCSV}
                className="flex-shrink-0 flex items-center gap-2 py-2 px-4 rounded-xl text-[12px] font-semibold border border-[#DDDDE3] text-[#555572] hover:border-[#D2D4F6] hover:text-[#2026D2] transition-all bg-white">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Export CSV
              </button>
            </div>
            <ResultTabs mapData={mapData} form={form}/>
          </div>
        )}
      </div>

      <Chatbot/>
    </div>
  );
}

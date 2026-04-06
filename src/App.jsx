import { useState, useRef, useEffect } from "react";

const DOC_CONTEXT = "SourcingCompass is a talent intelligence tool built by Manu Barki at Atlan. Generates Target Companies, Adjacent Talent Pools, Wildcard Bets, Target Titles, and live sourced Candidates via Google X-ray. AI model: Claude Sonnet. Company memory grounded in MAD landscape dataset. Skills input via tags. JD parser auto-fills fields. CSV export available.";



// ─── Category config ──────────────────────────────────────────────────────────
const CAT = {
  companies: { dot:"#4d64d8", label:"Target Companies",     desc:"Direct sourcing targets — companies where your ideal candidate likely works today" },
  adjacent:  { dot:"#9b6ef5", label:"Adjacent Talent Pools", desc:"Companies with transferable skills — not obvious, but highly relevant" },
  wildcards: { dot:"#f6720d", label:"Wildcard Bets",         desc:"Unconventional bets — surprising sources most recruiters never think to check" },
  titles:    { dot:"#1da882", label:"Target Titles",          desc:"Exact LinkedIn search terms — copy these directly into your search" },
};

// ─── Tag input ────────────────────────────────────────────────────────────────
function TagInput({ placeholder, tags, onChange }) {
  const [input, setInput] = useState("");
  const ref = useRef(null);
  function handleKey(e) {
    if ((e.key === "," || e.key === "Enter") && input.trim()) {
      e.preventDefault(); onChange([...tags, input.trim().replace(/,$/, "")]); setInput("");
    } else if (e.key === "Backspace" && !input && tags.length) {
      onChange(tags.slice(0, -1));
    }
  }
  function handlePaste(e) {
    e.preventDefault();
    const parts = e.clipboardData.getData("text").split(/[,\n]+/).map(t=>t.trim()).filter(Boolean);
    if (parts.length > 1) onChange([...tags, ...parts]); else setInput(parts[0] || "");
  }
  return (
    <div className="w-full min-h-[40px] bg-sidebar-input border border-white/10 rounded-md px-2.5 py-1.5 flex flex-wrap gap-1.5 cursor-text focus-within:border-sidebar-accent/50 transition-colors"
      onClick={() => ref.current?.focus()}>
      {tags.map((t, i) => (
        <span key={i} className="flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-md font-medium" style={{background:"rgba(29,168,130,0.15)",border:"1px solid rgba(29,168,130,0.35)",color:"#24c9a0"}}>
          {t}
          <button type="button" onClick={e=>{e.stopPropagation();onChange(tags.filter((_,j)=>j!==i))}}
            style={{color:"rgba(36,201,160,0.6)",background:"none",border:"none",cursor:"pointer",padding:0,lineHeight:1}} className="leading-none ml-0.5">×</button>
        </span>
      ))}
      <input ref={ref} className="sidebar-input bg-transparent outline-none flex-1 min-w-[80px]"
        style={{fontSize:"13px",color:"#bfc8d6"}} placeholder={tags.length?"":placeholder} value={input}
        onChange={e=>setInput(e.target.value)} onKeyDown={handleKey} onPaste={handlePaste}/>
    </div>
  );
}

// ─── Score bar ────────────────────────────────────────────────────────────────
function Bar({ label, value, color, track }) {
  return (
    <div style={{marginTop:"10px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"6px"}}>
        <span style={{fontSize:"13px",color:"#6b7280",fontWeight:500,fontFamily:"Inter,sans-serif"}}>{label}</span>
        <span style={{fontSize:"13px",fontWeight:700,fontFamily:"'JetBrains Mono',monospace",color}}>{value}</span>
      </div>
      <div style={{width:"100%",height:"6px",borderRadius:"999px",background:track}}>
        <div style={{height:"100%",borderRadius:"999px",background:color,width:`${value}%`,transition:"width 0.7s ease"}}/>
      </div>
    </div>
  );
}

// ─── Company card ─────────────────────────────────────────────────────────────
function CompanyCard({ node }) {
  const [hov, setHov] = useState(false);
  return (
    <div className="relative bg-card border border-border rounded-lg p-4 transition-all duration-200 cursor-default animate-fade-in"
      style={{boxShadow: hov ? "var(--shadow-card-hover)" : "var(--shadow-card)"}}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}>
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="text-[15px] font-semibold text-foreground">{node.label}</div>
        {node.stage && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-medium whitespace-nowrap flex-shrink-0 border border-border">{node.stage}</span>
        )}
      </div>
      {node.sub && <div className="text-sm text-muted-foreground mb-3">{node.sub}</div>}
      {node.tags && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {node.tags.map(t=>(
            <span key={t} style={{fontSize:"12px",padding:"3px 10px",borderRadius:"6px",fontWeight:500,background:"#eff2fe",color:"#4d64d8",border:"1px solid #d2d8f8",fontFamily:"Inter,sans-serif"}}>{t}</span>
          ))}
        </div>
      )}
      {node.confidence != null && <Bar label="Relevance" value={node.confidence} color="#1da882" track="rgba(29,168,130,0.12)"/>}
      {node.talentDensity != null && <Bar label="Talent Density" value={node.talentDensity} color="#4d64d8" track="rgba(77,100,216,0.12)"/>}
      {node.poachability != null && <Bar label="Poachability" value={node.poachability} color="#4d64d8" track="rgba(77,100,216,0.12)"/>}
      {node.likelyProfile && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">Likely Profile</div>
          <div className="text-xs text-muted-foreground leading-relaxed">{node.likelyProfile}</div>
        </div>
      )}
      {node.poachabilitySignals?.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1.5">Signals</div>
          {node.poachabilitySignals.map((sig,i)=>(
            <div key={i} className="flex gap-2 mt-1">
              <span className="text-muted-foreground/40 text-xs mt-0.5 flex-shrink-0">›</span>
              <span className="text-xs text-muted-foreground leading-relaxed">{sig}</span>
            </div>
          ))}
        </div>
      )}
      {node.whyRelevant && hov && (
        <div className="absolute top-2 left-full z-50 pl-3 pointer-events-none" style={{width:"210px"}}>
          <div className="bg-card border border-primary/30 rounded-lg p-3 shadow-card-hover" style={{borderLeft:"3px solid hsl(var(--primary))"}}>
            <div className="text-[10px] text-primary font-semibold uppercase tracking-wider mb-1.5">Why relevant</div>
            <div className="text-xs text-foreground leading-relaxed">{node.whyRelevant}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Simple card ──────────────────────────────────────────────────────────────
function SimpleCard({ node, cat }) {
  const s = CAT[cat];
  const tagStyles = {
    adjacent: "bg-purple-50 text-purple-700 border-purple-200",
    wildcards: "bg-orange-50 text-orange-700 border-orange-200",
    titles:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  };
  return (
    <div className="bg-card border border-border rounded-lg p-4 transition-all duration-200 hover:shadow-card-hover animate-fade-in">
      <div className="text-[15px] font-semibold text-foreground mb-1">{node.label}</div>
      {node.sub && <div className="text-sm text-muted-foreground mb-2">{node.sub}</div>}
      {node.tags && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {node.tags.map(t=>(
            <span key={t} className={`text-xs px-2.5 py-0.5 rounded-md font-medium border ${tagStyles[cat]||"bg-secondary text-muted-foreground border-border"}`}>{t}</span>
          ))}
        </div>
      )}
      {cat==="titles" && node.confidence != null && (
        <Bar label="Confidence" value={node.confidence} color="#1da882" track="rgba(29,168,130,0.12)"/>
      )}
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────
function Section({ cat, nodes }) {
  const s = CAT[cat];
  return (
    <div>
      <div className="flex items-center gap-2.5 mb-2">
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{background:s.dot}}/>
        <span className="text-xs font-semibold text-foreground tracking-widest uppercase">{s.label}</span>
        <div className="flex-1 h-px bg-border"/>
        <span className="text-xs text-muted-foreground">{nodes.length} results</span>
      </div>
      <p className="text-xs text-muted-foreground mb-4 ml-4">{s.desc}</p>
      <div className="grid grid-cols-3 gap-3">
        {nodes.map(n => cat==="companies"
          ? <CompanyCard key={n.id} node={n}/>
          : <SimpleCard key={n.id} node={n} cat={cat}/>
        )}
      </div>
    </div>
  );
}

// ─── Candidate card ───────────────────────────────────────────────────────────
function CandidateCard({ candidate, index }) {
  const initials = candidate.name.split(" ").slice(0,2).map(w=>w[0]||"").join("").toUpperCase()||"?";
  const colors = ["#4d64d8","#1da882","#9b6ef5","#f6720d","#f04e7c"];
  const color = colors[index % colors.length];
  return (
    <div className="bg-card border border-border rounded-lg p-4 hover:shadow-card-hover transition-all duration-200 group">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold border"
          style={{background:`${color}15`,borderColor:`${color}40`,color}}>
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground">{candidate.name}</div>
              {candidate.currentTitle && <div className="text-xs text-muted-foreground mt-0.5">{candidate.currentTitle}</div>}
              {candidate.currentCompany && (
                <div className="flex items-center gap-1.5 mt-1">
                  <div className="w-1.5 h-1.5 rounded-full" style={{background:color}}/>
                  <span className="text-xs font-medium" style={{color}}>{candidate.currentCompany}</span>
                </div>
              )}
            </div>
            <a href={candidate.linkedinUrl} target="_blank" rel="noopener noreferrer"
              className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold text-white transition-all hover:opacity-90"
              style={{background:"linear-gradient(135deg,#0077b5,#0a66c2)",textDecoration:"none"}}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
              View
            </a>
          </div>
          {candidate.email && (
            <div className="mt-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-accent/10 border border-accent/20">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--accent))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
              </svg>
              <span className="text-xs text-accent font-medium">{candidate.email}</span>
            </div>
          )}
          {candidate.snippet && (
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed line-clamp-2 group-hover:text-foreground/60 transition-colors">{candidate.snippet}</p>
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
        body: JSON.stringify({companies:targetNames,role:form.role,skills:form.skills,seniority:form.seniority,location:form.location}),
      });
      const data = await res.json();
      if(!res.ok){setError(data.error||"Source failed");setLoading(false);return;}
      setCandidates(data.candidates||[]); setSourced(true);
    } catch(e){if(e.name!=="AbortError")setError("Network error: "+e.message);}
    setLoading(false);
  }

  function exportCSV() {
    const rows=[["Name","Title","Company","LinkedIn","Email","Snippet"]];
    candidates.forEach(c=>rows.push([c.name,c.currentTitle,c.currentCompany,c.linkedinUrl,c.email||"",c.snippet||""]));
    const csv=rows.map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(",")).join("\n");
    const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
    a.download="Candidates_"+form.role.replace(/\s+/g,"_")+".csv"; a.click();
  }

  return (
    <div>
      <div className="flex items-center gap-2.5 mb-2">
        <div className="w-2 h-2 rounded-full" style={{background:"hsl(340 82% 60%)"}}/>
        <span className="text-xs font-semibold text-foreground tracking-widest uppercase">Live Candidates</span>
        <div className="flex-1 h-px bg-border"/>
        {sourced && <span className="text-xs text-muted-foreground">{candidates.length} found</span>}
      </div>

      <div className="mb-4 p-3 rounded-lg border border-border bg-secondary/50">
        <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-2">Searching across</div>
        <div className="flex flex-wrap gap-1.5">
          {targetNames.slice(0,8).map((name,i)=>(
            <span key={i} className="text-xs px-2.5 py-0.5 rounded-md font-medium bg-card border border-border text-muted-foreground">{name}</span>
          ))}
          {targetNames.length>8&&<span className="text-xs text-muted-foreground px-1">+{targetNames.length-8} more</span>}
        </div>
      </div>

      <div className="mb-4 text-xs text-muted-foreground">~{Math.min(targetNames.length,8)*2} Serper credits per search</div>

      {error && <div className="mb-3 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">{error}</div>}

      {!sourced && !loading && (
        <button type="button" onClick={source} className="w-full py-2.5 rounded-lg text-sm font-semibold text-white bg-primary hover:bg-primary/90 transition-all shadow-card">
          Source Candidates →
        </button>
      )}

      {loading && (
        <div className="flex flex-col items-center gap-4 py-12">
          <div className="sc-spinner" style={{width:"24px",height:"24px",border:"2px solid #4d64d8",borderTopColor:"transparent",borderRadius:"50%"}}/>
          <div className="text-center">
            <div className="text-sm font-medium text-foreground">Scanning LinkedIn</div>
            <div className="text-xs text-muted-foreground mt-1">{Math.min(targetNames.length,8)*2} queries in flight</div>
          </div>
          <button type="button" onClick={stop} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-destructive/30 text-destructive text-xs font-semibold hover:bg-destructive/10 transition-all">
            <div className="w-1.5 h-1.5 rounded-sm bg-destructive"/>Stop
          </button>
        </div>
      )}

      {sourced && !loading && (
        <>
          {candidates.length===0 ? (
            <div className="text-center py-10">
              <div className="text-muted-foreground/30 text-3xl mb-3">∅</div>
              <div className="text-sm font-medium text-foreground">No profiles found</div>
              <div className="text-xs text-muted-foreground mt-1">Try broader skills or a different role title</div>
              <button type="button" onClick={source} className="mt-4 px-5 py-2 rounded-lg text-xs font-semibold border border-border text-muted-foreground hover:border-primary hover:text-primary transition-all">Retry</button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <div className="text-xs text-muted-foreground">{candidates.length} profiles · ranked by relevance</div>
                <div className="flex gap-2">
                  <button type="button" onClick={exportCSV} className="px-3 py-1.5 rounded-md text-xs font-semibold bg-accent/10 border border-accent/20 text-accent hover:bg-accent/20 transition-all">CSV</button>
                  <button type="button" onClick={source} className="px-3 py-1.5 rounded-md text-xs font-semibold border border-border text-muted-foreground hover:border-primary hover:text-primary transition-all">Re-run</button>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                {candidates.map((c,i)=><CandidateCard key={c.linkedinUrl} candidate={c} index={i}/>)}
              </div>
              <div className="mt-4 text-xs text-muted-foreground text-center">X-ray sourced · always verify before outreach</div>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────
const TABS = [
  { id:"companies", label:"Companies",  dot:"#4d64d8", count:d=>d.companies?.length },
  { id:"adjacent",  label:"Adjacent",   dot:"#9b6ef5", count:d=>d.adjacent?.length  },
  { id:"wildcards", label:"Wildcards",  dot:"#f6720d", count:d=>d.wildcards?.length  },
  { id:"titles",    label:"Titles",     dot:"#1da882", count:d=>d.titles?.length     },
  { id:"candidates",label:"Candidates", dot:"#f04e7c", isNew:true },
];

function ResultTabs({ mapData, form }) {
  const [active, setActive] = useState("companies");
  const nodes = {companies:mapData.companies,adjacent:mapData.adjacent,wildcards:mapData.wildcards,titles:mapData.titles};
  return (
    <div>
      <div className="flex items-end gap-0 mb-6 border-b border-border">
        {TABS.map(t=>(
          <button key={t.id} type="button" onClick={()=>setActive(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px ${
              active===t.id ? "text-primary border-primary" : "text-muted-foreground border-transparent hover:text-foreground"
            }`}>
            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{background:active===t.id?t.dot:"#e2e8f0"}}/>
            {t.label}
            {t.count && mapData && <span className="ml-1 text-[10px] text-muted-foreground">{t.count(mapData)}</span>}
            {t.isNew && <span className="ml-1 text-[9px] px-1.5 py-0.5 rounded bg-pink-50 border border-pink-200 text-pink-600 font-semibold">NEW</span>}
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
  const [step,setStep]=useState(0);
  const steps=TABS.filter(t=>t.id!=="candidates");
  useEffect(()=>{const iv=setInterval(()=>setStep(s=>(s+1)%steps.length),900);return()=>clearInterval(iv);},[]);
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-5">
      <div className="sc-spinner" style={{width:"24px",height:"24px",border:"2px solid #4d64d8",borderTopColor:"transparent",borderRadius:"50%"}}/>
      <div className="space-y-2 text-center">
        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Mapping talent</div>
        {steps.map((t,i)=>(
          <div key={t.id} className={`flex items-center justify-center gap-2 transition-all duration-300 ${i===step?"opacity-100":"opacity-20"}`}>
            <div className="w-1.5 h-1.5 rounded-full" style={{background:t.dot}}/>
            <span className="text-sm font-medium" style={{color:i===step?t.dot:"#6b7280"}}>{t.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Chatbot ──────────────────────────────────────────────────────────────────
function Chatbot() {
  const [open,setOpen]=useState(false);
  const [messages,setMessages]=useState([{role:"assistant",text:"Hey! I'm Compass — ask me anything about how this tool works."}]);
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const bottomRef=useRef(null);
  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:"smooth"});},[messages]);

  async function send() {
    const q=input.trim(); if(!q||loading) return;
    setInput(""); setMessages(m=>[...m,{role:"user",text:q}]); setLoading(true);
    try {
      const history=messages.map(m=>({role:m.role==="assistant"?"assistant":"user",content:m.text}));
      const res=await fetch("/api/generate",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({messages:[{role:"user",content:"You are Compass, a concise guide for SourcingCompass. 2-3 sentences max.\n\nDOCS:\n"+DOC_CONTEXT+"\n\nHistory:\n"+history.map(h=>h.role+": "+h.content).join("\n")+"\n\nQ: "+q}]})});
      const data=await res.json();
      const text=data.content?.map(b=>b.text||"").join("").trim()||"Couldn't get a response.";
      setMessages(m=>[...m,{role:"assistant",text}]);
    } catch {setMessages(m=>[...m,{role:"assistant",text:"Something went wrong."}]);}
    setLoading(false);
  }

  return (
    <>
      <button type="button" onClick={()=>setOpen(v=>!v)}
        className="fixed bottom-5 right-5 z-50 w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-card-hover hover:bg-primary/90 transition-all text-lg font-semibold">
        {open?"×":"💬"}
      </button>
      {open && (
        <div className="fixed bottom-16 right-5 z-50 w-72 bg-card border border-border rounded-xl shadow-card-hover flex flex-col overflow-hidden" style={{height:"400px"}}>
          <div className="px-4 py-3 border-b border-border flex items-center gap-2.5 bg-secondary/30">
            <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xs font-semibold">C</div>
            <div>
              <div className="text-sm font-semibold text-foreground">Compass</div>
              <div className="text-xs text-muted-foreground">{loading?"Thinking...":"SourcingCompass guide"}</div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
            {messages.map((m,i)=>(
              <div key={i} className={m.role==="user"?"flex justify-end":"flex justify-start"}>
                <div className={`max-w-[82%] rounded-xl px-3 py-2 text-xs leading-relaxed ${m.role==="user"?"bg-primary text-primary-foreground":"bg-secondary text-foreground border border-border"}`}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-secondary border border-border rounded-xl px-3 py-2.5 flex gap-1">
                  {[0,1,2].map(i=><div key={i} className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{animationDelay:i*0.15+"s"}}/>)}
                </div>
              </div>
            )}
            <div ref={bottomRef}/>
          </div>
          <div className="px-3 py-3 border-t border-border flex gap-2">
            <input className="flex-1 bg-secondary border border-input rounded-lg px-3 py-1.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-all"
              placeholder="Ask anything..." value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()}/>
            <button type="button" onClick={send} disabled={loading||!input.trim()}
              className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold disabled:opacity-30 transition-all">→</button>
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
    "CRITICAL: Every company MUST be real and active. Location: "+(form.location||"not specified")+". Only suggest companies with actual engineering presence there.",
    "Role: "+form.role,"Hiring Company: "+form.company,"Location: "+form.location,
    "Seniority: "+form.seniority,"Skills: "+form.skills.join(", "),
    "Preferred Industries: "+(form.industries.join(", ")||"Any"),
    "Exclusions: "+(form.exclusions.join(", ")||"None"),
    "",
    'Return: {"companies":[{"id":"c1","label":"Name","sub":"Industry","tags":["t"],"confidence":85,"stage":"Series B","talentDensity":78,"poachability":65,"likelyProfile":"sentence.","poachabilitySignals":["[Signal] x"],"whyRelevant":"sentence."}],"adjacent":[{"id":"a1","label":"Name","sub":"Why","tags":["t"]}],"wildcards":[{"id":"w1","label":"Name","sub":"Reason","tags":["t"]}],"titles":[{"id":"t1","label":"Title","sub":"Companies","tags":["t"],"confidence":90}]}',
    "Rules: 6-8 companies, NEVER include "+form.company+", adjacent=4-5 companies, wildcards=3-4 TECH companies, titles=5-7 exact job titles, Return ONLY raw valid JSON.",
  ].join("\n");
}

const EMPTY={companies:[],adjacent:[],wildcards:[],titles:[]};
const LOCATIONS=["United States","Canada","India","United Kingdom","Europe","Australia","Singapore"];

// ─── Resizable sidebar ────────────────────────────────────────────────────────
function ResizableSidebar({children}) {
  const [width,setWidth]=useState(280);
  const dragging=useRef(false); const startX=useRef(0); const startW=useRef(0);
  function onMouseDown(e){dragging.current=true;startX.current=e.clientX;startW.current=width;document.body.style.cursor="col-resize";document.body.style.userSelect="none";}
  useEffect(()=>{
    function onMouseMove(e){if(!dragging.current)return;setWidth(Math.min(480,Math.max(220,startW.current+(e.clientX-startX.current))));}
    function onMouseUp(){if(!dragging.current)return;dragging.current=false;document.body.style.cursor="";document.body.style.userSelect="";}
    window.addEventListener("mousemove",onMouseMove); window.addEventListener("mouseup",onMouseUp);
    return()=>{window.removeEventListener("mousemove",onMouseMove);window.removeEventListener("mouseup",onMouseUp);};
  },[]);
  return (
    <div style={{width,flexShrink:0,position:"relative",background:"#1a1f3c",borderRight:"1px solid #2d3461"}} className="flex flex-col z-10">
      {children}
      <div onMouseDown={onMouseDown} className="absolute top-0 right-0 w-1 h-full cursor-col-resize group z-20">
        <div className="absolute top-0 right-0 w-1 h-full transition-all group-hover:bg-sidebar-accent/30"/>
      </div>
    </div>
  );
}

// ─── Main app ─────────────────────────────────────────────────────────────────
export default function TalentMap() {
  const [form,setForm]=useState({role:"",company:"",location:"United States",seniority:"Senior",skills:[],industries:[],exclusions:[]});
  const [mapData,setMapData]=useState(null);
  const [loading,setLoading]=useState(false);
  const [parsing,setParsing]=useState(false);
  const [error,setError]=useState("");
  const [generated,setGenerated]=useState(false);
  const [showJD,setShowJD]=useState(false);
  const jdRef=useRef(null);
  const generateAbortRef=useRef(null);
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const allNodes=mapData?[...mapData.companies,...mapData.adjacent,...mapData.wildcards,...mapData.titles]:[];

  async function parseJD() {
    const txt=jdRef.current?.value||""; if(!txt.trim()) return;
    setParsing(true); setError("");
    try {
      const res=await fetch("/api/generate",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({messages:[{role:"user",content:'Extract from JD, return ONLY raw JSON: {"role":"title","seniority":"Senior/Staff/etc","skills":["s1"]} JD: '+txt.slice(0,2000)}]})});
      const data=await res.json();
      const raw=data.content?.map(b=>b.text||"").join("").trim();
      let clean=raw.replace(/```json|```/g,"").trim();
      const lb=clean.lastIndexOf("}"); if(lb!==-1) clean=clean.slice(0,lb+1);
      const parsed=JSON.parse(clean);
      setForm(f=>({...f,role:parsed.role||f.role,seniority:parsed.seniority||f.seniority,skills:parsed.skills?.length?parsed.skills:f.skills}));
      setShowJD(false);
    } catch(e){setError("JD parse failed: "+e.message);}
    setParsing(false);
  }

  function stopGenerate(){if(generateAbortRef.current)generateAbortRef.current.abort();setLoading(false);}

  async function generate() {
    if(!form.role.trim()){setError("Role title is required.");return;}
    if(generateAbortRef.current) generateAbortRef.current.abort();
    generateAbortRef.current=new AbortController();
    setError(""); setLoading(true); setMapData(null);
    try {
      const res=await fetch("/api/generate",{method:"POST",headers:{"Content-Type":"application/json"},
        signal:generateAbortRef.current.signal,
        body:JSON.stringify({messages:[{role:"user",content:buildPrompt(form)}]})});
      const data=await res.json();
      if(!res.ok){setError("API error "+res.status+": "+JSON.stringify(data));setLoading(false);return;}
      const raw=data.content?.map(b=>b.text||"").join("").trim();
      const parsed=JSON.parse(raw.replace(/```json|```/g,"").trim());
      setMapData({...EMPTY,...parsed}); setGenerated(true);
    } catch(e){if(e.name!=="AbortError")setError("Error: "+e.message);}
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

  const inputCls = "sidebar-input w-full rounded-md px-3 py-2 text-sm focus:outline-none transition-colors";
  const inputStyle = {background:"#1e2449",border:"1px solid #2d3461",color:"#bfc8d6"};
  const labelCls = ""; const labelStyle = {display:"block",fontSize:"12px",fontWeight:500,color:"#8892b0",marginBottom:"6px",letterSpacing:"0.02em",fontFamily:"Inter,sans-serif"};

  return (
    <>
    <style>{`
      .sidebar-input::placeholder { color: #4a5a8a !important; opacity: 1; }
      .sidebar-input { color: #bfc8d6 !important; }
      @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      .sc-spinner { animation: spin 0.8s linear infinite; }
    `}</style>
    <div className="flex h-screen overflow-hidden" style={{background:"#f0f4f8"}}>

      {/* ── Sidebar ── */}
      <ResizableSidebar>

        {/* Header */}
        <div className="px-5 pt-5 pb-4" style={{borderBottom:"1px solid #2d3461"}}>
          <div className="flex items-center gap-3">
            {/* Logo — teal rounded square with compass arrow, matching screenshot */}
            <div className="flex-shrink-0" style={{width:"40px",height:"40px",borderRadius:"10px",background:"#132d35",border:"1.5px solid rgba(36,201,160,0.5)",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Outer circle */}
                <circle cx="12" cy="12" r="9" stroke="#24c9a0" strokeWidth="1.5" fill="none"/>
                {/* Inner circle */}
                <circle cx="12" cy="12" r="5.5" stroke="#24c9a0" strokeWidth="1" fill="none" opacity="0.5"/>
                {/* Compass needle — pointing top-right */}
                <polygon points="12,4.5 10.5,12 12,11 13.5,12" fill="#24c9a0"/>
                <polygon points="12,19.5 10.5,12 12,13 13.5,12" fill="rgba(36,201,160,0.35)"/>
                <circle cx="12" cy="12" r="1.5" fill="#132d35" stroke="#24c9a0" strokeWidth="1"/>
              </svg>
            </div>
            <div>
              <div className="text-[15px] font-bold text-white leading-tight tracking-tight">SourcingCompass</div>
              <div className="text-[10px] font-semibold tracking-[0.15em] uppercase mt-0.5" style={{color:"#24c9a0"}}>Talent Intelligence</div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">

          <div className="grid grid-cols-2 gap-2">
            <div><label className={labelCls} style={labelStyle}>Role Title</label>
              <input className={inputCls} style={inputStyle} placeholder="e.g. Staff Engineer" value={form.role} onChange={e=>set("role",e.target.value)}/></div>
            <div><label className={labelCls} style={labelStyle}>Company</label>
              <input className={inputCls} style={inputStyle} placeholder="e.g. Atlan" value={form.company} onChange={e=>set("company",e.target.value)}/></div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div><label className={labelCls} style={labelStyle}>Location</label>
              <select className={inputCls} style={inputStyle} value={form.location} onChange={e=>set("location",e.target.value)}>
                {LOCATIONS.map(l=><option key={l}>{l}</option>)}
              </select></div>
            <div><label className={labelCls} style={labelStyle}>Seniority</label>
              <select className={inputCls} style={inputStyle} value={form.seniority} onChange={e=>set("seniority",e.target.value)}>
                {["Junior","Mid","Senior","Staff","Principal","Director","VP"].map(s=><option key={s}>{s}</option>)}
              </select></div>
          </div>

          <div><label className={labelCls} style={labelStyle}>Must-Have Skills</label>
            <TagInput placeholder="Type skill, press , or Enter" tags={form.skills} onChange={v=>set("skills",v)}/></div>

          <div><label className={labelCls} style={labelStyle}>Industries</label>
            <TagInput placeholder="e.g. Fintech, Data" tags={form.industries} onChange={v=>set("industries",v)}/></div>

          <div><label className={labelCls} style={labelStyle}>Exclusions</label>
            <TagInput placeholder="Companies to skip" tags={form.exclusions} onChange={v=>set("exclusions",v)}/></div>

          <button type="button" onClick={()=>setShowJD(v=>!v)}
            className="text-xs font-medium text-left transition-colors" style={{color:"#24c9a0"}}>
            + {showJD?"Hide":"Paste"} Job Description
          </button>
          {showJD && (
            <div className="flex flex-col gap-2">
              <textarea ref={jdRef} rows={5} className={inputCls+" resize-none"} style={inputStyle} placeholder="Paste JD here..."/>
              <button type="button" onClick={parseJD} disabled={parsing}
                className="w-full py-2 rounded-md text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-40 transition-all">
                {parsing?"Parsing...":"Parse JD — auto-fill fields"}
              </button>
            </div>
          )}

          <p style={{fontSize:"11px",color:"#4a5a8a"}}>AI-generated · verify before sourcing</p>

          {error && <div style={{fontSize:"11px",color:"#f87171",background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.25)",borderRadius:"6px",padding:"8px 10px",fontFamily:"Inter,sans-serif"}}>{error}</div>}

          {!loading ? (
            <button type="button" onClick={generate}
              style={{width:"100%",padding:"11px 16px",borderRadius:"8px",fontSize:"14px",fontWeight:600,color:"white",border:"none",cursor:"pointer",background:"#4d64d8",display:"flex",alignItems:"center",justifyContent:"center",gap:"8px",boxShadow:"0 4px 12px rgba(77,100,216,0.4)",fontFamily:"Inter,sans-serif"}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
              Generate Map
            </button>
          ) : (
            <div style={{display:"flex",gap:"8px"}}>
              <div style={{flex:1,padding:"11px",borderRadius:"8px",fontSize:"12px",fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:"8px",background:"#1e2449",color:"#4a5a8a",fontFamily:"Inter,sans-serif"}}>
                <div className="sc-spinner" style={{width:"14px",height:"14px",border:"2px solid #24c9a0",borderTopColor:"transparent",borderRadius:"50%"}}/>
                Generating...
              </div>
              <button type="button" onClick={stopGenerate}
                style={{display:"flex",alignItems:"center",gap:"6px",padding:"8px 14px",borderRadius:"8px",fontSize:"11px",fontWeight:600,border:"1px solid rgba(239,68,68,0.4)",color:"#f87171",background:"none",cursor:"pointer",fontFamily:"Inter,sans-serif",flexShrink:0}}>
                <div style={{width:"6px",height:"6px",borderRadius:"2px",background:"#ef4444"}}/>Stop
              </button>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="px-5 py-4 flex flex-col gap-1.5" style={{borderTop:"1px solid #2d3461"}}>
          <div style={{fontSize:"10px",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.1em",color:"#4a5a8a",marginBottom:"8px"}}>Legend</div>
          {Object.entries(CAT).map(([k,s])=>(
            <div key={k} className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{background:s.dot}}/>
              <span style={{fontSize:"11px",color:"#8892b0"}}>{s.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{background:"hsl(340 82% 60%)"}}/>
            <span style={{fontSize:"11px",color:"#8892b0"}}>Candidates</span>
          </div>
        </div>
      </ResizableSidebar>

      {/* ── Canvas ── */}
      <div className="flex-1 relative overflow-y-auto min-w-0" style={{background:"#f0f4f8"}}>
        {!generated && !loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8">
            <div className="w-16 h-16 rounded-2xl bg-card border border-border flex items-center justify-center mb-5 shadow-card">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <polygon points="14,4 12,14 14,12.5 16,14" fill="hsl(var(--primary))"/>
                <polygon points="14,24 12,14 14,15.5 16,14" fill="#e2e8f0"/>
                <circle cx="14" cy="14" r="2" fill="white" stroke="hsl(var(--primary))" strokeWidth="1.5"/>
                <circle cx="14" cy="14" r="10" stroke="hsl(var(--primary))" strokeWidth="1" opacity="0.15"/>
              </svg>
            </div>
            <div className="text-base font-semibold text-foreground mb-2">Configure your search</div>
            <div className="text-sm text-muted-foreground max-w-xs">Fill in the role, skills, and location — then generate a talent map</div>
          </div>
        )}

        {loading && <LoadingScreen/>}

        {mapData && !loading && (
          <div className="relative z-10 p-8">
            <div className="mb-6 pb-5 border-b border-border flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold text-foreground leading-tight">
                  {form.role.split(" ").map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(" ")} <span style={{color:"#d1d5db",fontWeight:400}}>·</span> <span style={{color:"#6b7280",fontWeight:400}}>{form.seniority}</span>
                </h1>
                <p className="text-sm text-muted-foreground mt-1.5">
                  {[form.company,form.location].filter(Boolean).join(" · ")} · {allNodes.length} nodes mapped
                </p>
              </div>
              <button type="button" onClick={exportCSV}
                className="flex-shrink-0 flex items-center gap-2 py-2 px-4 rounded-lg text-sm font-semibold border border-border text-muted-foreground hover:border-primary hover:text-primary transition-all bg-card shadow-card">
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
    </>
  );
}

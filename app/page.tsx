"use client";

import { useEffect, useMemo, useState } from "react";

type Chain = "All chains" | "Ethereum" | "BNB Chain" | "Solana";
type Activity = { time: string; title: string; detail: string; status: "Ready" | "Simulation" | "Needs setup" };
type Narrative = { topic: string; score: number; mentions: number; engagement: number; examples: string[] };
type TokenConcept = { name: string; ticker: string; thesis: string; risks: string; confidence: number };

const activity: Activity[] = [
  { time: "SYSTEM", title: "Trading execution disabled", detail: "Mainnet actions require explicit release approval.", status: "Needs setup" },
  { time: "SYSTEM", title: "Fee model configured", detail: "Target: 1% buy + 1% sell, where supported by the launch mechanism.", status: "Simulation" },
  { time: "SYSTEM", title: "Chain adapters pending", detail: "RPC and wallet integrations have not been configured.", status: "Needs setup" }
];

const chains: { name: Exclude<Chain, "All chains">; ticker: string; note: string }[] = [
  { name: "Ethereum", ticker: "ETH", note: "EVM · adapter pending" },
  { name: "BNB Chain", ticker: "BNB", note: "EVM · adapter pending" },
  { name: "Solana", ticker: "SOL", note: "SVM · adapter pending" }
];

function Metric({ label, value, caption }: { label: string; value: string; caption: string }) {
  return <article className="metric"><p className="muted">{label}</p><strong>{value}</strong><span>{caption}</span></article>;
}

export default function Home() {
  const [chain, setChain] = useState<Chain>("All chains");
  const [mode, setMode] = useState<"Simulation" | "Live">("Simulation");
  const [narrative, setNarrative] = useState("");
  const [tokenName, setTokenName] = useState("");
  const [ticker, setTicker] = useState("");
  const [notice, setNotice] = useState("Simulation mode is active. No wallet is connected and no transactions can be sent.");
  const [narratives, setNarratives] = useState<Narrative[]>([]);
  const [concepts, setConcepts] = useState<TokenConcept[]>([]);
  const [selectedNarrative, setSelectedNarrative] = useState<Narrative | null>(null);
  const [discovering, setDiscovering] = useState(false);
  const [generating, setGenerating] = useState(false);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("zero-capital-farm:draft");
      if (!saved) return;
      const draft = JSON.parse(saved) as { tokenName?: string; ticker?: string; narrative?: string };
      setTokenName(draft.tokenName ?? "");
      setTicker(draft.ticker ?? "");
      setNarrative(draft.narrative ?? "");
    } catch {
      localStorage.removeItem("zero-capital-farm:draft");
    }
  }, []);
  const filteredChains = useMemo(() => chain === "All chains" ? chains : chains.filter((item) => item.name === chain), [chain]);

  async function discoverNarratives() {
    setDiscovering(true);
    setNotice("Searching X for recent narratives…");
    try {
      const response = await fetch("/api/narratives", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Narrative discovery failed.");
      setNarratives(result.narratives ?? []);
      setSelectedNarrative(result.narratives?.[0] ?? null);
      setConcepts([]);
      setNotice(`Ranked ${result.narratives?.length ?? 0} topics from ${result.tweetCount ?? 0} recent X posts.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Narrative discovery failed.");
    } finally {
      setDiscovering(false);
    }
  }

  async function generateConcepts(item: Narrative | null = selectedNarrative) {
    if (!item) {
      setNotice("Find X narratives first, then select a topic.");
      return;
    }
    setSelectedNarrative(item);
    setGenerating(true);
    setNotice("Asking Grok to generate concept drafts…");
    try {
      const response = await fetch("/api/concepts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ narrative: item.topic, examples: item.examples })
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Grok concept generation failed.");
      setConcepts(result.concepts ?? []);
      setNotice(`Grok generated ${result.concepts?.length ?? 0} concept drafts. Nothing has been deployed or traded.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Grok concept generation failed.");
    } finally {
      setGenerating(false);
    }
  }

  function useConcept(item: TokenConcept) {
    setTokenName(item.name);
    setTicker(item.ticker);
    setNarrative(`${item.thesis} Risks: ${item.risks}`);
    setNotice(`Loaded ${item.name} (${item.ticker}) into launch preparation. Save the draft to keep it on this device.`);
    document.getElementById("launch")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function createDraft() {
    if (!tokenName.trim() || !ticker.trim()) {
      setNotice("Enter a token name and ticker to create a local launch draft.");
      return;
    }
    const draft = {
      tokenName: tokenName.trim(),
      ticker: ticker.trim().toUpperCase(),
      narrative: narrative.trim(),
      chain,
      updatedAt: new Date().toISOString()
    };
    try {
      localStorage.setItem("zero-capital-farm:draft", JSON.stringify(draft));
      setNotice(`Draft saved on this device: ${draft.tokenName} (${draft.ticker}). This does not deploy a token.`);
    } catch {
      setNotice("Could not save locally. Check this browser's storage settings.");
    }
  }

  return (
    <main className="shell">
      <aside className="sidebar">
        <a className="brand" href="#"><span className="brand-mark">Z</span><span>ZERO CAPITAL<small>FARM CONTROL</small></span></a>
        <div className="side-label">WORKSPACE</div>
        <a className="nav-item active" href="#overview"><span>▦</span> Overview</a>
        <a className="nav-item" href="#launch"><span>✳</span> Token launch</a>
        <a className="nav-item" href="#chains"><span>◈</span> Chains</a>
        <a className="nav-item" href="#activity"><span>≋</span> Audit log</a>
        <div className="sidebar-bottom"><span className="status-dot" /> SIMULATION MODE <small>Live execution locked</small></div>
      </aside>

      <section className="main-content">
        <header className="topbar"><div><p className="eyebrow">OPERATIONS / OVERVIEW</p><h1>Farm dashboard</h1></div><div className="top-actions"><span className="pill"><i /> Systems not connected</span><button className="mode-button" onClick={() => { setMode("Simulation"); setNotice("Live mode is not enabled in this foundation. Simulation remains active."); }}>{mode} mode⌄</button></div></header>

        <section className="hero" id="overview">
          <div><span className="hero-kicker">ZERO CAPITAL FARM <span>· FOUNDATION</span></span><h2>Turn market signals<br />into <em>measurable operations.</em></h2><p>One workspace for narratives, launch preparation, chain status and fee accounting.</p><div className="hero-actions"><a className="primary-button" href="#launch">Prepare a launch <span>↗</span></a><a className="text-button" href="#chains">View chain status →</a></div></div>
          <div className="hero-art" aria-hidden="true"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="orbit orbit-three" /><div className="core">Z<span>CF</span></div><div className="float-tag tag-a">01 / SIGNAL</div><div className="float-tag tag-b">02 / VERIFY</div><div className="float-tag tag-c">03 / TRACK</div></div>
        </section>

        <section className="metrics-grid">
          <Metric label="FEES COLLECTED" value="0.0000" caption="Native token · no live data" />
          <Metric label="ACTIVE LAUNCHES" value="0" caption="No contracts deployed" />
          <Metric label="WATCHLIST SIGNALS" value="0" caption="Provider not connected" />
          <Metric label="AGENT STATUS" value="STANDBY" caption="Execution disabled" />
        </section>

        <section className="panel" id="narratives" style={{ marginBottom: 24 }}>
          <div className="panel-head"><div><p className="eyebrow">SIGNAL DISCOVERY</p><h3>Trending X narratives</h3></div><button className="primary-button" onClick={discoverNarratives} disabled={discovering}>{discovering ? "Searching…" : "Find trending narratives ↗"}</button></div>
          <p className="panel-description">Ranks recent X posts by topic frequency, engagement, and recency. Requires a server-side X API bearer token.</p>
          {narratives.length > 0 ? <div className="activity-list">{narratives.slice(0, 8).map((item) => <div className="activity-row" key={item.topic}>
            <div className="activity-marker">#</div><div className="activity-copy"><h4>{item.topic}</h4><p>Score {item.score} · {item.mentions} mentions · {Math.round(item.engagement)} engagement points</p></div>
            <button className="text-button" onClick={() => { setSelectedNarrative(item); setNarrative(item.topic); }} aria-pressed={selectedNarrative?.topic === item.topic}>{selectedNarrative?.topic === item.topic ? "Selected" : "Select"}</button>
          </div>)}</div> : <p className="notice">No live topics loaded yet. Discovery uses live X data when credentials and API access are configured.</p>}
          <div style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <span className="muted">{selectedNarrative ? `Selected: ${selectedNarrative.topic}` : "Select a ranked topic to generate concepts."}</span>
            <button className="primary-button" onClick={() => generateConcepts()} disabled={generating || !selectedNarrative}>{generating ? "Generating…" : "Generate concepts with Grok ↗"}</button>
          </div>
          {concepts.length > 0 && <div className="chain-grid" style={{ marginTop: 18 }}>{concepts.map((item, index) => <article className="chain-card" key={item.ticker + index} style={{ alignItems: "flex-start" }}>
            <div className="chain-icon">{item.ticker.slice(0, 4)}</div><div className="chain-info"><h4>{item.name} ({item.ticker})</h4><p>{item.thesis}</p><p><strong>Risks:</strong> {item.risks}</p><p>Grok confidence: {item.confidence}/100 · concept only</p><button className="text-button" onClick={() => useConcept(item)}>Use in launch draft →</button></div>
          </article>)}</div>}
        </section>

        <div className="section-heading"><div><p className="eyebrow">NETWORK LAYER</p><h3>Chain connections</h3></div><select aria-label="Filter chains" value={chain} onChange={(event) => setChain(event.target.value as Chain)}><option>All chains</option><option>Ethereum</option><option>BNB Chain</option><option>Solana</option></select></div>
        <section className="chain-grid" id="chains">{filteredChains.map((item) => <article className="chain-card" key={item.name}><div className={"chain-icon " + item.ticker.toLowerCase()}>{item.ticker === "ETH" ? "◆" : item.ticker === "BNB" ? "✣" : "◎"}</div><div className="chain-info"><h4>{item.name}</h4><p>{item.note}</p></div><span className="pending">Pending</span></article>)}</section>

        <section className="work-grid">
          <article className="panel launch-panel" id="launch"><div className="panel-head"><div><p className="eyebrow">TOKEN WORKFLOW</p><h3>Launch preparation</h3></div><span className="step-count">STEP 01 / 03</span></div><p className="panel-description">Create a draft to organize a token concept. This does not deploy a contract or spend funds.</p><label htmlFor="tokenName">Token name</label><input id="tokenName" value={tokenName} onChange={(event) => setTokenName(event.target.value)} placeholder="e.g. Signal Protocol" maxLength={40} /><label htmlFor="ticker">Ticker</label><input id="ticker" value={ticker} onChange={(event) => setTicker(event.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10))} placeholder="e.g. SIGNAL" maxLength={10} /><label htmlFor="narrative">Market narrative / thesis</label><textarea id="narrative" value={narrative} onChange={(event) => setNarrative(event.target.value)} placeholder="What signal makes this concept relevant?" rows={3} maxLength={1000} /><div className="fee-note"><span>Target fee model</span><strong>1% buy / 1% sell</strong><small>Only enforceable when supported by the actual token/market contracts.</small></div><button className="primary-button full" onClick={createDraft}>Save launch draft <span>→</span></button><p className="notice" role="status">{notice}</p></article>

          <article className="panel activity-panel" id="activity"><div className="panel-head"><div><p className="eyebrow">SYSTEM JOURNAL</p><h3>Latest activity</h3></div><span className="live-label"><i /> LOCAL</span></div><div className="activity-list">{activity.map((item) => <div className="activity-row" key={item.title}><div className="activity-marker">·</div><div className="activity-copy"><span className="activity-time">{item.time}</span><h4>{item.title}</h4><p>{item.detail}</p></div><span className={"activity-status " + item.status.toLowerCase().replace(" ", "-")}>{item.status}</span></div>)}</div><div className="audit-footer"><span>Audit events shown: 3</span><button onClick={() => {
              const csv = ["time,title,detail,status", ...activity.map((item) => [item.time, item.title, item.detail, item.status].map((value) => `"${value.replace(/"/g, '""')}"`).join(","))].join("\n");
              const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
              const link = document.createElement("a");
              link.href = url;
              link.download = "zero-capital-farm-audit.csv";
              link.click();
              URL.revokeObjectURL(url);
              setNotice("Audit log exported. Entries are system status records, not on-chain transactions.");
            }}>Export log ↗</button></div></article>
        </section>
        <footer><span>ZERO CAPITAL FARM <b>·</b> FOUNDATION BUILD</span><span>NO WALLET CONNECTED <b>·</b> NO LIVE EXECUTION</span></footer>
      </section>
    </main>
  );
}

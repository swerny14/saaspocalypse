// directory-layouts.jsx — two layout variations for the Saaspocalypse scan directory

const D_INK = '#0a0a0a';
const D_CREAM = '#f4f1e8';
const D_PAPER = '#fff';
const D_LIME = '#c6ff00';
const D_YELLOW = '#ffd84d';
const D_CORAL = '#ff6b4a';
const D_PINK = '#ff3366';
const D_FONT_DISPLAY = '"Space Grotesk", system-ui, sans-serif';
const D_FONT_BODY = '"Space Grotesk", system-ui, sans-serif';
const D_FONT_MONO = '"JetBrains Mono", ui-monospace, monospace';
const D_FONT_SERIF = '"Fraunces", Georgia, serif';

// Tier presentation tokens
const TIER_STYLES = {
  WEEKEND:  { fg: D_INK, bg: '#b6f24a', label: 'WEEKEND' },
  MONTH:    { fg: D_INK, bg: '#ffd84d', label: 'A MONTH' },
  QUARTER:  { fg: D_INK, bg: '#ffa066', label: 'A QUARTER' },
  "DON'T":  { fg: D_CREAM, bg: D_INK,   label: "DON'T" },
};

// =========================================================================
// MOCK DATASET — 18 scans spanning the spectrum, mostly fictional
// =========================================================================
const DIRECTORY_SCANS = [
  { id: 'notion',     name: 'notion-ish.com',      tagline: 'block-based docs + database',         tier: 'WEEKEND', score: 78, scannedAt: '2026.04.24', author: 'mara',     hours: 14,   pop: 4821, category: 'productivity' },
  { id: 'calendly',   name: 'calendly-ish.com',    tagline: 'scheduling link generator',           tier: 'WEEKEND', score: 86, scannedAt: '2026.04.24', author: 'mara',     hours: 9,    pop: 3140, category: 'productivity' },
  { id: 'linear',     name: 'linear-ish.app',      tagline: 'issue tracker for software teams',    tier: 'MONTH',   score: 52, scannedAt: '2026.04.24', author: 'jules',    hours: 240,  pop: 9810, category: 'devtools' },
  { id: 'stripe',     name: 'stripe-ish.com',      tagline: 'payments infrastructure',             tier: "DON'T",   score: 6,  scannedAt: '2026.04.24', author: 'jules',    hours: 99999,pop: 12044,category: 'fintech' },
  { id: 'typeform',   name: 'typeform-ish.io',     tagline: 'one-question-at-a-time forms',        tier: 'WEEKEND', score: 81, scannedAt: '2026.04.23', author: 'rin',      hours: 11,   pop: 2244, category: 'forms' },
  { id: 'loom',       name: 'loom-ish.video',      tagline: 'screen recorder w/ instant share',    tier: 'MONTH',   score: 44, scannedAt: '2026.04.22', author: 'jules',    hours: 180,  pop: 5612, category: 'video' },
  { id: 'mailchimp',  name: 'mailchimp-ish.com',   tagline: 'email blasts + drip campaigns',       tier: 'QUARTER', score: 31, scannedAt: '2026.04.21', author: 'mara',     hours: 520,  pop: 1880, category: 'marketing' },
  { id: 'figma',      name: 'figma-ish.design',    tagline: 'real-time collaborative design',      tier: "DON'T",   score: 11, scannedAt: '2026.04.20', author: 'rin',      hours: 99999,pop: 8420, category: 'design' },
  { id: 'airtable',   name: 'airtable-ish.com',    tagline: 'spreadsheet but a database',          tier: 'MONTH',   score: 48, scannedAt: '2026.04.19', author: 'jules',    hours: 200,  pop: 3201, category: 'productivity' },
  { id: 'webflow',    name: 'webflow-ish.com',     tagline: 'visual website builder',              tier: 'QUARTER', score: 24, scannedAt: '2026.04.18', author: 'mara',     hours: 720,  pop: 4012, category: 'nocode' },
  { id: 'superhuman', name: 'superhuman-ish.app',  tagline: 'keyboard-first email client',         tier: 'WEEKEND', score: 72, scannedAt: '2026.04.17', author: 'rin',      hours: 22,   pop: 1644, category: 'productivity' },
  { id: 'zapier',     name: 'zapier-ish.com',      tagline: 'glue together 5000 SaaS apps',        tier: 'QUARTER', score: 28, scannedAt: '2026.04.16', author: 'jules',    hours: 600,  pop: 2730, category: 'automation' },
  { id: 'intercom',   name: 'intercom-ish.io',     tagline: 'live chat + helpdesk',                tier: 'MONTH',   score: 41, scannedAt: '2026.04.15', author: 'mara',     hours: 220,  pop: 2110, category: 'support' },
  { id: 'mixpanel',   name: 'mixpanel-ish.com',    tagline: 'product analytics',                   tier: 'MONTH',   score: 56, scannedAt: '2026.04.14', author: 'rin',      hours: 160,  pop: 1422, category: 'analytics' },
  { id: 'algolia',    name: 'algolia-ish.dev',     tagline: 'hosted search-as-you-type',           tier: 'QUARTER', score: 22, scannedAt: '2026.04.12', author: 'jules',    hours: 480,  pop: 980,  category: 'devtools' },
  { id: 'plausible',  name: 'plausible-ish.io',    tagline: 'cookie-free web analytics',           tier: 'WEEKEND', score: 84, scannedAt: '2026.04.11', author: 'mara',     hours: 12,   pop: 3322, category: 'analytics' },
  { id: 'beehiiv',    name: 'beehiiv-ish.com',     tagline: 'newsletter platform',                 tier: 'MONTH',   score: 49, scannedAt: '2026.04.09', author: 'rin',      hours: 140,  pop: 1208, category: 'publishing' },
  { id: 'replit',     name: 'replit-ish.dev',      tagline: 'browser-based IDE w/ deploy',         tier: "DON'T",   score: 14, scannedAt: '2026.04.07', author: 'jules',    hours: 99999,pop: 6210, category: 'devtools' },
];

const TIERS = ['WEEKEND', 'MONTH', 'QUARTER', "DON'T"];

// =========================================================================
// SHARED SHELL — top nav matching blog/site tokens
// =========================================================================
function DirShell({ children, width = 1280 }) {
  return (
    <div style={{ background: D_CREAM, minHeight: 600, fontFamily: D_FONT_BODY, color: D_INK }}>
      <div style={{
        borderBottom: `2.5px solid ${D_INK}`, padding: '14px 32px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: D_PAPER,
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
          <span style={{ background: D_INK, color: D_LIME, padding: '3px 10px', fontFamily: D_FONT_DISPLAY, fontWeight: 700, letterSpacing: '0.05em', fontSize: 18 }}>
            saaspocalypse
          </span>
          <span style={{ fontFamily: D_FONT_MONO, fontSize: 11, opacity: 0.5, letterSpacing: '0.1em', textTransform: 'uppercase' }}>/ the directory</span>
        </div>
        <nav style={{ display: 'flex', gap: 22, fontFamily: D_FONT_MONO, fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          <a style={{ color: D_INK }}>scan</a>
          <a style={{ color: D_INK, borderBottom: `2px solid ${D_INK}`, paddingBottom: 2 }}>archive</a>
          <a style={{ color: D_INK }}>blog</a>
          <a style={{ color: D_INK }}>about</a>
        </nav>
      </div>
      <div style={{ padding: '36px 32px 56px', maxWidth: width, margin: '0 auto' }}>
        {children}
      </div>
    </div>
  );
}

function TierBadge({ tier, size = 'md' }) {
  const t = TIER_STYLES[tier];
  const fs = size === 'sm' ? 10 : size === 'lg' ? 14 : 11;
  const pad = size === 'sm' ? '3px 8px' : size === 'lg' ? '6px 14px' : '4px 10px';
  return (
    <span style={{
      background: t.bg, color: t.fg, padding: pad, fontFamily: D_FONT_MONO,
      fontWeight: 700, fontSize: fs, letterSpacing: '0.12em',
      border: `2px solid ${D_INK}`, display: 'inline-block', whiteSpace: 'nowrap',
    }}>{t.label}</span>
  );
}

// score bar — segmented, brutalist
function ScoreBar({ score, width = 140 }) {
  const segs = 10;
  const filled = Math.round((score / 100) * segs);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ display: 'flex', gap: 2, border: `1.5px solid ${D_INK}`, padding: 2, background: D_PAPER, width }}>
        {Array.from({ length: segs }).map((_, i) => (
          <div key={i} style={{
            flex: 1, height: 10,
            background: i < filled ? D_INK : 'transparent',
          }} />
        ))}
      </div>
      <span style={{ fontFamily: D_FONT_MONO, fontWeight: 700, fontSize: 12, minWidth: 28 }}>{score}</span>
    </div>
  );
}

// =========================================================================
// LAYOUT A — "Filing cabinet": sidebar filters + dense card grid
// =========================================================================
function DirectoryA() {
  const scans = DIRECTORY_SCANS;
  const tierCounts = TIERS.reduce((acc, t) => ({ ...acc, [t]: scans.filter(s => s.tier === t).length }), {});
  const cats = [...new Set(scans.map(s => s.category))].sort();

  return (
    <DirShell>
      {/* masthead */}
      <div style={{ borderBottom: `2.5px solid ${D_INK}`, paddingBottom: 24, marginBottom: 28 }}>
        <div style={{ fontFamily: D_FONT_MONO, fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', opacity: 0.6, marginBottom: 10 }}>
          ▸ the archive · {scans.length} scans on file · updated daily
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 32, flexWrap: 'wrap' }}>
          <h1 style={{ fontFamily: D_FONT_DISPLAY, fontWeight: 700, fontSize: 88, letterSpacing: '-0.045em', lineHeight: 0.92, margin: 0 }}>
            every saas we{' '}
            <span style={{ background: D_INK, color: D_LIME, padding: '0 14px', display: 'inline-block', transform: 'rotate(-1.5deg)' }}>
              roasted
            </span>
            ,<br />
            now sortable.
          </h1>
          <p style={{ fontFamily: D_FONT_BODY, fontSize: 16, lineHeight: 1.5, opacity: 0.75, maxWidth: 360, margin: 0 }}>
            Every scan we've run, filed by buildability. Find one before you accidentally spend $144/year on a CRUD app.
          </p>
        </div>
      </div>

      {/* search bar — full width, fat */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 0, marginBottom: 32, border: `2.5px solid ${D_INK}`, boxShadow: `6px 6px 0 0 ${D_INK}`, background: D_PAPER }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 22px', gap: 14 }}>
          <span style={{ fontFamily: D_FONT_MONO, fontWeight: 700, fontSize: 14, opacity: 0.4 }}>▸</span>
          <input
            placeholder="search scans — try 'notion', 'analytics', 'don't build'…"
            style={{
              flex: 1, padding: '20px 0', fontFamily: D_FONT_DISPLAY, fontSize: 22,
              border: 'none', outline: 'none', background: 'transparent', color: D_INK,
              fontWeight: 500, letterSpacing: '-0.01em',
            }}
          />
          <span className="blink" style={{ fontFamily: D_FONT_MONO, fontSize: 18, fontWeight: 700 }}>_</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 18px', borderLeft: `2.5px solid ${D_INK}`, fontFamily: D_FONT_MONO, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', gap: 8 }}>
          <span style={{ opacity: 0.5 }}>sort:</span>
          <span style={{ borderBottom: `2px solid ${D_INK}` }}>newest ▾</span>
        </div>
        <button style={{
          background: D_INK, color: D_LIME, fontFamily: D_FONT_DISPLAY, fontWeight: 700,
          fontSize: 16, border: 'none', padding: '0 28px', cursor: 'pointer', letterSpacing: '-0.01em',
        }}>→ search</button>
      </div>

      {/* main grid: sidebar + cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 28, alignItems: 'flex-start' }}>
        {/* sidebar */}
        <aside style={{ position: 'sticky', top: 20, fontFamily: D_FONT_BODY }}>
          <FilterGroup title="by verdict">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <FilterRow active label="all" count={scans.length} />
              {TIERS.map(t => (
                <FilterRow key={t} label={t.toLowerCase()} count={tierCounts[t]} swatch={TIER_STYLES[t].bg} />
              ))}
            </div>
          </FilterGroup>

          <FilterGroup title="score range">
            <div style={{ position: 'relative', height: 36, border: `2px solid ${D_INK}`, background: D_PAPER, marginBottom: 6 }}>
              <div style={{ position: 'absolute', inset: 0, left: '20%', right: '15%', background: D_LIME, borderLeft: `2px solid ${D_INK}`, borderRight: `2px solid ${D_INK}` }} />
              <span style={{ position: 'absolute', left: 8, top: 9, fontFamily: D_FONT_MONO, fontSize: 11, fontWeight: 700 }}>0</span>
              <span style={{ position: 'absolute', right: 8, top: 9, fontFamily: D_FONT_MONO, fontSize: 11, fontWeight: 700 }}>100</span>
            </div>
            <div style={{ fontFamily: D_FONT_MONO, fontSize: 11, opacity: 0.6, display: 'flex', justifyContent: 'space-between' }}>
              <span>min: 20</span><span>max: 85</span>
            </div>
          </FilterGroup>

          <FilterGroup title="category">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {cats.map((c, i) => (
                <span key={c} style={{
                  fontFamily: D_FONT_MONO, fontSize: 11, padding: '4px 9px',
                  border: `1.5px solid ${D_INK}`, background: i === 1 ? D_LIME : D_PAPER,
                  fontWeight: 700, letterSpacing: '0.04em',
                }}>{c}</span>
              ))}
            </div>
          </FilterGroup>

          <FilterGroup title="time to build">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontFamily: D_FONT_MONO, fontSize: 12 }}>
              {['< 1 day', '1–7 days', '1–4 weeks', '1+ months', 'forever'].map((t, i) => (
                <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <span style={{
                    width: 14, height: 14, border: `2px solid ${D_INK}`,
                    background: i < 2 ? D_INK : D_PAPER, position: 'relative',
                  }}>
                    {i < 2 && <span style={{ position: 'absolute', top: -2, left: 1, color: D_LIME, fontSize: 14, fontWeight: 700 }}>✓</span>}
                  </span>
                  <span>{t}</span>
                </label>
              ))}
            </div>
          </FilterGroup>

          <FilterGroup title="by author" last>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontFamily: D_FONT_MONO, fontSize: 12 }}>
              {['mara', 'jules', 'rin'].map(a => (
                <div key={a} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>@{a}</span>
                  <span style={{ opacity: 0.5 }}>{scans.filter(s => s.author === a).length}</span>
                </div>
              ))}
            </div>
          </FilterGroup>

          <button style={{
            width: '100%', marginTop: 18, fontFamily: D_FONT_MONO, fontSize: 11, fontWeight: 700,
            letterSpacing: '0.15em', textTransform: 'uppercase', padding: '10px 0',
            border: `2px solid ${D_INK}`, background: D_PAPER, cursor: 'pointer',
          }}>↻ reset filters</button>
        </aside>

        {/* results column */}
        <div>
          {/* result meta */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, fontFamily: D_FONT_MONO, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            <span style={{ opacity: 0.7 }}>showing 12 of {scans.length} · 4 filters active</span>
            <div style={{ display: 'flex', gap: 4, border: `2px solid ${D_INK}`, background: D_PAPER }}>
              <span style={{ background: D_INK, color: D_LIME, padding: '6px 12px' }}>⊞ grid</span>
              <span style={{ padding: '6px 12px' }}>≡ list</span>
            </div>
          </div>

          {/* card grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            {scans.slice(0, 12).map((s, i) => <DirCardA key={s.id} scan={s} idx={i} />)}
          </div>

          {/* pagination */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 36, fontFamily: D_FONT_MONO, fontSize: 12, fontWeight: 700 }}>
            <PageBtn>← prev</PageBtn>
            <PageBtn active>1</PageBtn>
            <PageBtn>2</PageBtn>
            <PageBtn>3</PageBtn>
            <PageBtn>next →</PageBtn>
          </div>
        </div>
      </div>
    </DirShell>
  );
}

function FilterGroup({ title, children, last }) {
  return (
    <div style={{ borderTop: `2.5px solid ${D_INK}`, padding: '14px 0 18px', borderBottom: last ? `2.5px solid ${D_INK}` : 'none' }}>
      <div style={{ fontFamily: D_FONT_MONO, fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 12 }}>
        ▸ {title}
      </div>
      {children}
    </div>
  );
}

function FilterRow({ label, count, active, swatch }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '5px 8px', fontFamily: D_FONT_MONO, fontSize: 12, fontWeight: 700,
      background: active ? D_INK : 'transparent', color: active ? D_LIME : D_INK,
      border: `1.5px solid ${active ? D_INK : 'transparent'}`,
      letterSpacing: '0.05em', textTransform: 'uppercase', cursor: 'pointer',
    }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {swatch && <span style={{ width: 12, height: 12, background: swatch, border: `1.5px solid ${active ? D_LIME : D_INK}` }} />}
        {label}
      </span>
      <span style={{ opacity: active ? 0.7 : 0.5 }}>{count}</span>
    </div>
  );
}

function PageBtn({ children, active }) {
  return (
    <span style={{
      padding: '7px 14px', border: `2px solid ${D_INK}`,
      background: active ? D_INK : D_PAPER, color: active ? D_LIME : D_INK,
      letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer',
    }}>{children}</span>
  );
}

function DirCardA({ scan, idx }) {
  const t = TIER_STYLES[scan.tier];
  const hoursLabel = scan.hours >= 99999 ? '∞' : scan.hours < 24 ? `${scan.hours}h` : scan.hours < 168 ? `${Math.round(scan.hours / 24)}d` : `${Math.round(scan.hours / 168)}w`;
  return (
    <article style={{
      border: `2.5px solid ${D_INK}`, background: D_PAPER, position: 'relative',
      display: 'flex', flexDirection: 'column', minHeight: 220,
    }}>
      {/* color stripe */}
      <div style={{ height: 8, background: t.bg, borderBottom: `2.5px solid ${D_INK}` }} />
      <div style={{ padding: '18px 20px 16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* top row: index + date */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: D_FONT_MONO, fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', opacity: 0.65, marginBottom: 10 }}>
          <span>scan № {String(idx + 1).padStart(3, '0')}</span>
          <span>{scan.scannedAt}</span>
        </div>

        {/* domain */}
        <div style={{ fontFamily: D_FONT_DISPLAY, fontWeight: 700, fontSize: 22, letterSpacing: '-0.02em', marginBottom: 4 }}>
          {scan.name}
        </div>
        <div style={{ fontFamily: D_FONT_BODY, fontSize: 13, opacity: 0.7, marginBottom: 14, textWrap: 'pretty' }}>
          {scan.tagline}
        </div>

        {/* tier + score */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 8 }}>
          <TierBadge tier={scan.tier} />
          <ScoreBar score={scan.score} width={120} />
        </div>

        {/* foot meta */}
        <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1.5px dashed ${D_INK}`, paddingTop: 10, fontFamily: D_FONT_MONO, fontSize: 11, fontWeight: 700, letterSpacing: '0.05em' }}>
          <span style={{ opacity: 0.7 }}>≈ {hoursLabel} build</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span style={{ opacity: 0.7 }}>@{scan.author}</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span style={{ opacity: 0.7 }}>{scan.pop.toLocaleString()} 👁</span>
        </div>
      </div>
    </article>
  );
}

// =========================================================================
// LAYOUT B — "Stock ticker": full-bleed sortable table, tag chips, sticky filters
// =========================================================================
function DirectoryB() {
  const scans = DIRECTORY_SCANS;
  const tierCounts = TIERS.reduce((acc, t) => ({ ...acc, [t]: scans.filter(s => s.tier === t).length }), {});

  return (
    <DirShell width={1100}>
      {/* split masthead */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24, marginBottom: 28, alignItems: 'stretch' }}>
        <div>
          <div style={{ fontFamily: D_FONT_MONO, fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', opacity: 0.6, marginBottom: 10 }}>
            ▸ index of damage · {scans.length} entries
          </div>
          <h1 style={{ fontFamily: D_FONT_SERIF, fontWeight: 700, fontSize: 72, lineHeight: 0.92, letterSpacing: '-0.035em', margin: 0, textWrap: 'balance' }}>
            the <em style={{ background: D_LIME, padding: '0 10px', fontStyle: 'italic' }}>scan</em><br />
            archive.
          </h1>
        </div>
        {/* live stat block — looks like a stock ticker */}
        <div style={{ background: D_INK, color: D_CREAM, padding: '20px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignContent: 'center' }}>
          <Stat label="scans on file" value={scans.length} />
          <Stat label="weekend builds" value={tierCounts.WEEKEND} accent={D_LIME} />
          <Stat label="don't bothers" value={tierCounts["DON'T"]} accent={D_PINK} />
          <Stat label="median score" value="42" />
        </div>
      </div>

      {/* search + filter chip rail */}
      <div style={{ border: `2.5px solid ${D_INK}`, background: D_PAPER, marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', borderBottom: `2.5px solid ${D_INK}` }}>
          <span style={{ padding: '0 18px', fontFamily: D_FONT_MONO, fontWeight: 700, fontSize: 13, opacity: 0.5, letterSpacing: '0.1em', textTransform: 'uppercase', borderRight: `2.5px solid ${D_INK}`, alignSelf: 'stretch', display: 'flex', alignItems: 'center' }}>
            find:
          </span>
          <input
            placeholder="company name, category, scoring keyword…"
            style={{
              flex: 1, padding: '16px 18px', fontFamily: D_FONT_MONO, fontSize: 15,
              border: 'none', outline: 'none', background: 'transparent', color: D_INK, fontWeight: 500,
            }}
          />
          <span style={{ padding: '0 18px', fontFamily: D_FONT_MONO, fontSize: 11, opacity: 0.5, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            ⌘K
          </span>
        </div>
        {/* chip rail */}
        <div style={{ display: 'flex', gap: 8, padding: '12px 16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: D_FONT_MONO, fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.5, marginRight: 4 }}>verdict:</span>
          <Chip active>all <span style={{ opacity: 0.5, marginLeft: 4 }}>{scans.length}</span></Chip>
          {TIERS.map(t => (
            <Chip key={t} swatch={TIER_STYLES[t].bg}>{t.toLowerCase()} <span style={{ opacity: 0.5, marginLeft: 4 }}>{tierCounts[t]}</span></Chip>
          ))}
          <span style={{ width: 1, alignSelf: 'stretch', background: D_INK, opacity: 0.3, margin: '0 6px' }} />
          <span style={{ fontFamily: D_FONT_MONO, fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.5, marginRight: 4 }}>category:</span>
          <Chip>productivity</Chip>
          <Chip>devtools</Chip>
          <Chip>analytics</Chip>
          <Chip muted>+ 6 more</Chip>
        </div>
      </div>

      {/* result meta + sort */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 4px 10px', fontFamily: D_FONT_MONO, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
        <span style={{ opacity: 0.7 }}>{scans.length} results · 2 filters active</span>
        <span style={{ opacity: 0.5 }}>↑ click any column to sort</span>
      </div>

      {/* table */}
      <div style={{ border: `2.5px solid ${D_INK}`, background: D_PAPER, boxShadow: `6px 6px 0 0 ${D_INK}` }}>
        {/* header row */}
        <div style={{
          display: 'grid', gridTemplateColumns: '40px 1.6fr 0.9fr 1fr 1.4fr 0.8fr 0.7fr',
          background: D_INK, color: D_CREAM, fontFamily: D_FONT_MONO, fontSize: 10,
          fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase',
        }}>
          <HeaderCell>№</HeaderCell>
          <HeaderCell>scan ↓</HeaderCell>
          <HeaderCell>verdict</HeaderCell>
          <HeaderCell>score</HeaderCell>
          <HeaderCell>build time / by</HeaderCell>
          <HeaderCell>scanned</HeaderCell>
          <HeaderCell align="right">action</HeaderCell>
        </div>
        {scans.map((s, i) => <DirRowB key={s.id} scan={s} idx={i} last={i === scans.length - 1} />)}
      </div>

      {/* foot */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 22, fontFamily: D_FONT_MONO, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', flexWrap: 'wrap', gap: 12 }}>
        <span style={{ opacity: 0.6 }}>page 01 / 01 · end of archive</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <span style={{ padding: '7px 14px', border: `2px solid ${D_INK}`, background: D_PAPER, opacity: 0.5 }}>← older</span>
          <span style={{ padding: '7px 14px', border: `2px solid ${D_INK}`, background: D_INK, color: D_LIME }}>load 18 more →</span>
        </div>
      </div>
    </DirShell>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div>
      <div style={{ fontFamily: D_FONT_MONO, fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', opacity: 0.55, marginBottom: 4 }}>
        ▸ {label}
      </div>
      <div style={{ fontFamily: D_FONT_DISPLAY, fontWeight: 700, fontSize: 36, letterSpacing: '-0.03em', color: accent || D_CREAM, lineHeight: 1 }}>
        {value}
      </div>
    </div>
  );
}

function HeaderCell({ children, align }) {
  return (
    <div style={{ padding: '12px 14px', textAlign: align || 'left', borderRight: `1.5px solid ${D_CREAM}`, opacity: 0.85 }}>
      {children}
    </div>
  );
}

function Chip({ children, active, swatch, muted }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontFamily: D_FONT_MONO, fontSize: 11, fontWeight: 700,
      padding: '5px 11px', border: `2px solid ${D_INK}`,
      background: active ? D_INK : D_PAPER,
      color: active ? D_LIME : D_INK,
      opacity: muted ? 0.55 : 1,
      letterSpacing: '0.04em', cursor: 'pointer',
    }}>
      {swatch && <span style={{ width: 10, height: 10, background: swatch, border: `1.5px solid ${active ? D_LIME : D_INK}` }} />}
      {children}
    </span>
  );
}

function DirRowB({ scan, idx, last }) {
  const hoursLabel = scan.hours >= 99999 ? '∞' : scan.hours < 24 ? `${scan.hours}h` : scan.hours < 168 ? `${Math.round(scan.hours / 24)}d` : `${Math.round(scan.hours / 168)}w`;
  const zebra = idx % 2 === 1 ? D_CREAM : D_PAPER;
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '40px 1.6fr 0.9fr 1fr 1.4fr 0.8fr 0.7fr',
      background: zebra, borderBottom: last ? 'none' : `1.5px solid ${D_INK}`,
      alignItems: 'center', minHeight: 64,
    }}>
      <div style={{ padding: '12px 14px', fontFamily: D_FONT_MONO, fontSize: 11, fontWeight: 700, opacity: 0.55 }}>
        {String(idx + 1).padStart(2, '0')}
      </div>
      <div style={{ padding: '12px 14px' }}>
        <div style={{ fontFamily: D_FONT_DISPLAY, fontWeight: 700, fontSize: 17, letterSpacing: '-0.015em' }}>
          {scan.name}
        </div>
        <div style={{ fontFamily: D_FONT_BODY, fontSize: 12, opacity: 0.65 }}>
          {scan.tagline} <span style={{ fontFamily: D_FONT_MONO, opacity: 0.5, marginLeft: 4 }}>· #{scan.category}</span>
        </div>
      </div>
      <div style={{ padding: '12px 14px' }}>
        <TierBadge tier={scan.tier} size="sm" />
      </div>
      <div style={{ padding: '12px 14px' }}>
        <ScoreBar score={scan.score} width={100} />
      </div>
      <div style={{ padding: '12px 14px', fontFamily: D_FONT_MONO, fontSize: 12, fontWeight: 700, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span>≈ {hoursLabel}</span>
        <span style={{ opacity: 0.55, fontWeight: 500 }}>by @{scan.author}</span>
      </div>
      <div style={{ padding: '12px 14px', fontFamily: D_FONT_MONO, fontSize: 11, fontWeight: 700, opacity: 0.7 }}>
        {scan.scannedAt.replace('2026.', '')}
      </div>
      <div style={{ padding: '12px 14px', textAlign: 'right' }}>
        <span style={{
          fontFamily: D_FONT_MONO, fontSize: 11, fontWeight: 700,
          padding: '6px 10px', border: `2px solid ${D_INK}`,
          background: D_LIME, letterSpacing: '0.08em', textTransform: 'uppercase',
          display: 'inline-block',
        }}>open →</span>
      </div>
    </div>
  );
}

window.DirectoryA = DirectoryA;
window.DirectoryB = DirectoryB;

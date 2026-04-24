// direction-brutalist.jsx — Neo-brutalist chaos direction

function BrutalistDirection({ tweaks }) {
  const accent = tweaks.accentA || '#c6ff00';
  const scanner = useScanner("notion-ish.com");
  const headline = HEADLINES[tweaks.headlineVariant % HEADLINES.length];

  const font = tweaks.fontPairing === 'serif-mono'
    ? { display: 'Fraunces, serif', body: 'JetBrains Mono, monospace' }
    : tweaks.fontPairing === 'sans-serif'
    ? { display: 'Work Sans, sans-serif', body: 'Instrument Serif, serif' }
    : { display: 'Space Grotesk, sans-serif', body: 'JetBrains Mono, monospace' };

  return (
    <div style={{ fontFamily: font.body, background: '#f4f1e8', color: '#0a0a0a', minHeight: '100%' }}>
      {/* NAV */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 48px', borderBottom: '2.5px solid #0a0a0a', background: '#f4f1e8', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 34, height: 34, background: accent, border: '2.5px solid #0a0a0a', display: 'grid', placeItems: 'center', fontFamily: font.display, fontWeight: 700, fontSize: 20, transform: 'rotate(-3deg)' }}>§</div>
          <span style={{ fontFamily: font.display, fontWeight: 700, fontSize: 22, letterSpacing: '-0.02em' }}>saaspocalypse</span>
          <span className="nosel" style={{ fontSize: 11, background: '#0a0a0a', color: accent, padding: '2px 8px', fontFamily: font.body, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>beta, probably</span>
        </div>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center', fontFamily: font.body, fontSize: 14 }}>
          <a style={{ color: '#0a0a0a', textDecoration: 'none', cursor: 'pointer' }}>Examples</a>
          <a style={{ color: '#0a0a0a', textDecoration: 'none', cursor: 'pointer' }}>How it works</a>
          <a style={{ color: '#0a0a0a', textDecoration: 'none', cursor: 'pointer' }}>FAQ</a>
          <button className="bru-xs" style={{ background: accent, padding: '8px 16px', fontFamily: font.display, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Scan a URL ↓</button>
        </div>
      </div>

      {/* HERO */}
      <div style={{ padding: '80px 48px 60px', position: 'relative', overflow: 'hidden' }}>
        {/* decorative label */}
        <div className="nosel" style={{ position: 'absolute', top: 32, right: 48, fontFamily: font.body, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', opacity: 0.6 }}>
          est. 2026 · a public service
        </div>

        <div style={{ maxWidth: 1000, display: 'grid', gap: 20 }}>
          <div style={{ display: 'inline-flex', alignSelf: 'start', alignItems: 'center', gap: 8, padding: '6px 12px', border: '2px solid #0a0a0a', background: '#fff', fontFamily: font.body, fontSize: 12, fontWeight: 500 }}>
            <span style={{ width: 8, height: 8, background: '#22c55e', borderRadius: 99 }} />
            robot is awake · 12,483 SaaS ruined today
          </div>
          <h1 style={{ fontFamily: font.display, fontSize: 'clamp(56px, 8vw, 120px)', fontWeight: 700, lineHeight: 1.08, letterSpacing: '-0.03em', margin: 0, textWrap: 'balance' }}>
            {headline.top.split(' ').map((w, i, arr) => (
              <span key={i}>
                {i === arr.length - 1 ? (
                  <span style={{ background: accent, padding: '0.05em 0.12em', boxShadow: `0.12em 0 0 ${accent}, -0.12em 0 0 ${accent}`, boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone' }}>{w}</span>
                ) : w}
                {i < arr.length - 1 && ' '}
              </span>
            ))}
          </h1>
          <p style={{ fontFamily: font.body, fontSize: 20, maxWidth: 620, lineHeight: 1.5, margin: 0, color: '#2a2a2a' }}>
            {headline.sub}
          </p>
        </div>

        {/* URL SCANNER */}
        <div style={{ marginTop: 48, maxWidth: 780 }}>
          <ScanBox scanner={scanner} accent={accent} font={font} />
        </div>

        {/* footnote under scanner */}
        <div className="nosel" style={{ marginTop: 14, fontFamily: font.body, fontSize: 12, opacity: 0.65, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <span>✦ no signup</span>
          <span>✦ no credit card</span>
          <span>✦ we don't have a database (yet)</span>
          <span>✦ press ↵ to judge</span>
        </div>
      </div>

      {/* MARQUEE */}
      <div style={{ borderTop: '2.5px solid #0a0a0a', borderBottom: '2.5px solid #0a0a0a', background: '#0a0a0a', color: accent, padding: '14px 0', overflow: 'hidden', fontFamily: font.display, fontWeight: 600, fontSize: 22, letterSpacing: '-0.01em' }}>
        <div className="marquee-track">
          {Array.from({ length: 2 }).map((_, k) => (
            <span key={k} style={{ display: 'inline-flex', gap: 48, paddingRight: 48 }}>
              {["it's just a CRUD app", "your subscription funds a ping-pong table", "Postgres is free forever", "the backend is a google sheet",
                "Next.js on a potato", "Supabase has a generous free tier", "you have a laptop. build.", "venture capital is cope"].map((t, i) => (
                <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 48 }}>
                  <span>✦</span><span>{t}</span>
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* EXAMPLES GRID */}
      <div style={{ padding: '80px 48px' }}>
        <SectionHead
          font={font}
          eyebrow="Recent verdicts"
          title="We've been busy roasting."
          sub="Real URLs, real robot opinions, real receipts. Names changed to protect the funded."
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 22, marginTop: 40 }}>
          {EXAMPLE_VERDICTS.map((v, i) => <VerdictCard key={i} v={v} accent={accent} font={font} />)}
        </div>
      </div>

      {/* HOW IT WORKS */}
      <div style={{ background: '#0a0a0a', color: '#f4f1e8', padding: '80px 48px' }}>
        <SectionHead
          font={font}
          eyebrow="The process (lol)"
          title="Three steps. Two are us."
          sub="The third step is you, on the couch, telling yourself you'll start tomorrow. That's fine. We've been there."
          dark
          accent={accent}
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginTop: 48 }}>
          {HOW_STEPS.map((s, i) => (
            <div key={i} style={{ background: '#1a1a1a', border: `2px solid ${accent}`, padding: 28, position: 'relative' }}>
              <div style={{ fontFamily: font.body, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.1em' }}>STEP {s.n}</div>
              <h3 style={{ fontFamily: font.display, fontSize: 32, fontWeight: 700, margin: '12px 0', letterSpacing: '-0.02em' }}>{s.t}</h3>
              <p style={{ fontFamily: font.body, fontSize: 15, lineHeight: 1.6, margin: 0, opacity: 0.85 }}>{s.b}</p>
              <div style={{ position: 'absolute', top: 20, right: 20, fontFamily: font.display, fontSize: 64, fontWeight: 700, opacity: 0.15, color: accent, lineHeight: 1 }}>{s.n}</div>
            </div>
          ))}
        </div>
      </div>

      {/* TESTIMONIALS */}
      <div style={{ padding: '80px 48px' }}>
        <SectionHead
          font={font}
          eyebrow="loud fans"
          title="People who exist are saying things."
          sub="These are real quotes from real users if you squint and also accept that 'real' is a social construct."
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 22, marginTop: 40 }}>
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className="bru" style={{ background: i % 3 === 0 ? accent : i % 3 === 1 ? '#fff' : '#ffd84d', padding: 24, transform: `rotate(${(i % 2 === 0 ? -0.8 : 0.8)}deg)` }}>
              <div style={{ fontFamily: font.display, fontSize: 14, marginBottom: 10 }}>{'★'.repeat(t.stars)}{'☆'.repeat(5 - t.stars)}</div>
              <p style={{ fontFamily: font.display, fontSize: 20, lineHeight: 1.3, margin: '0 0 20px', fontWeight: 500 }}>"{t.quote}"</p>
              <div style={{ fontFamily: font.body, fontSize: 13 }}>
                <div style={{ fontWeight: 700 }}>{t.who}</div>
                <div style={{ opacity: 0.7 }}>{t.role}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* PRICING */}
      <div style={{ padding: '80px 48px', background: accent, borderTop: '2.5px solid #0a0a0a', borderBottom: '2.5px solid #0a0a0a' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontFamily: font.body, fontSize: 13, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Pricing</div>
          <h2 style={{ fontFamily: font.display, fontSize: 'clamp(48px, 7vw, 96px)', fontWeight: 700, margin: '16px 0 8px', letterSpacing: '-0.03em', lineHeight: 1 }}>
            $0<span style={{ fontSize: '0.5em', opacity: 0.6 }}>.00</span>
          </h2>
          <div style={{ fontFamily: font.body, fontSize: 18, marginBottom: 32 }}>forever · per URL · per lifetime · per regret</div>
          <div className="bru" style={{ background: '#f4f1e8', padding: 32, textAlign: 'left' }}>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 10, fontFamily: font.body, fontSize: 16 }}>
              {[
                'Unlimited URLs (please don\'t actually)',
                'Itemized stack receipts',
                'Tutorial links curated by a Real Human (who owes us a favor)',
                'A sassy verdict (non-negotiable)',
                'Zero dark patterns, zero upsells, zero seat-based anything',
                'Optional email nag 6 months later: "did u build it tho"',
              ].map((l, i) => (
                <li key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span style={{ background: '#0a0a0a', color: accent, width: 20, height: 20, display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0, marginTop: 2 }}>✓</span>
                  <span>{l}</span>
                </li>
              ))}
            </ul>
          </div>
          <div style={{ marginTop: 24, fontFamily: font.body, fontSize: 13, opacity: 0.75 }}>
            if we ever charge, you have our permission to clone us. seriously.
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div style={{ padding: '80px 48px' }}>
        <SectionHead
          font={font}
          eyebrow="F.A.Q."
          title="Frequently anxious questions."
        />
        <div style={{ maxWidth: 820, marginTop: 32 }}>
          {FAQS.map((f, i) => <FAQItem key={i} f={f} font={font} accent={accent} />)}
        </div>
      </div>

      {/* CTA */}
      <div style={{ padding: '80px 48px', background: '#0a0a0a', color: '#f4f1e8', textAlign: 'center' }}>
        <div className="wob" style={{ fontFamily: font.display, fontSize: 'clamp(40px, 6vw, 80px)', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 20 }}>
          go on then.
        </div>
        <p style={{ fontFamily: font.body, fontSize: 18, opacity: 0.8, maxWidth: 520, margin: '0 auto 32px' }}>
          paste a URL. get a verdict. save $247/mo. retire to a small cabin. you know the drill.
        </p>
        <button className="bru" style={{ background: accent, color: '#0a0a0a', padding: '18px 36px', fontFamily: font.display, fontWeight: 700, fontSize: 22, cursor: 'pointer', letterSpacing: '-0.01em' }}>
          Scan a URL →
        </button>
      </div>

      {/* FOOTER */}
      <div style={{ padding: '40px 48px', background: '#f4f1e8', borderTop: '2.5px solid #0a0a0a', fontFamily: font.body, fontSize: 13 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
          <div>
            <div style={{ fontFamily: font.display, fontWeight: 700, fontSize: 16 }}>saaspocalypse</div>
            <div style={{ opacity: 0.6, marginTop: 4 }}>© 2026 · made by someone who should've been sleeping</div>
          </div>
          <div style={{ display: 'flex', gap: 24, opacity: 0.7, flexWrap: 'wrap' }}>
            {FOOTER_EASTER.map((t, i) => <span key={i}>{t}</span>)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Shared pieces (brutalist flavored — other directions restyle)

function ScanBox({ scanner, accent, font }) {
  const { phase, url, setUrl, verdict, step, steps, start, reset } = scanner;
  const inputRef = React.useRef(null);

  const presetUrls = [
    { label: 'notion-ish.com', idx: 0 },
    { label: 'calendly-ish.com', idx: 1 },
    { label: 'linear-ish.app', idx: 2 },
    { label: 'stripe-ish.com', idx: 3 },
  ];

  return (
    <div>
      {/* INPUT BAR */}
      <div className="bru" style={{ background: '#fff', display: 'flex', alignItems: 'stretch', position: 'relative' }}>
        <div style={{ padding: '18px 18px 18px 20px', borderRight: '2.5px solid #0a0a0a', fontFamily: font.body, fontSize: 16, color: '#666', display: 'flex', alignItems: 'center' }}>https://</div>
        <input
          ref={inputRef}
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') start(url, scanner.verdictIdx); }}
          placeholder="your-next-victim.com"
          style={{ flex: 1, border: 'none', padding: '18px 20px', fontFamily: font.body, fontSize: 20, background: 'transparent', minWidth: 0 }}
        />
        <button
          onClick={() => phase === 'done' ? reset() : start(url, scanner.verdictIdx)}
          style={{ background: accent, border: 'none', borderLeft: '2.5px solid #0a0a0a', padding: '0 28px', fontFamily: font.display, fontWeight: 700, fontSize: 18, cursor: 'pointer', letterSpacing: '-0.01em' }}
        >
          {phase === 'scanning' ? 'scanning…' : phase === 'done' ? 'scan again' : 'judge it →'}
        </button>
      </div>

      {/* PRESETS */}
      <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', fontFamily: font.body, fontSize: 13 }}>
        <span style={{ opacity: 0.6 }}>or try:</span>
        {presetUrls.map((p, i) => (
          <button
            key={i}
            onClick={() => { setUrl(p.label); scanner.setVerdictIdx(p.idx); start(p.label, p.idx); }}
            className="bru-xs"
            style={{ background: '#fff', padding: '4px 10px', fontFamily: font.body, fontSize: 12, cursor: 'pointer' }}
          >{p.label}</button>
        ))}
      </div>

      {/* SCAN/VERDICT PANEL */}
      {phase !== 'idle' && (
        <div className="bru" style={{ marginTop: 18, background: '#fff', overflow: 'hidden' }}>
          {phase === 'scanning' ? (
            <ScanningPanel step={step} steps={steps} url={url} accent={accent} font={font} />
          ) : (
            <VerdictPanel verdict={verdict} accent={accent} font={font} />
          )}
        </div>
      )}
    </div>
  );
}

function ScanningPanel({ step, steps, url, accent, font }) {
  return (
    <div style={{ padding: '24px 28px', fontFamily: font.body }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        <span>scanning {url || 'your-next-victim.com'}</span>
        <span style={{ color: '#666' }}>{Math.min(step, steps.length)}/{steps.length}</span>
      </div>
      <div style={{ display: 'grid', gap: 6 }}>
        {steps.map((s, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            opacity: i < step ? 1 : i === step ? 1 : 0.25,
            fontSize: 14, fontFamily: 'JetBrains Mono, monospace',
          }}>
            <span style={{ width: 16, height: 16, display: 'grid', placeItems: 'center', background: i < step ? '#22c55e' : i === step ? accent : '#eee', border: '1.5px solid #0a0a0a', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
              {i < step ? '✓' : i === step ? '•' : ' '}
            </span>
            <span>{s}</span>
            {i === step && <span style={{ color: '#666' }}><span className="dot1">.</span><span className="dot2">.</span><span className="dot3">.</span></span>}
          </div>
        ))}
      </div>
      {/* visual sweep */}
      <div style={{ marginTop: 16, height: 6, background: '#f0eee9', border: '1.5px solid #0a0a0a', overflow: 'hidden', position: 'relative' }}>
        <div style={{ width: `${Math.min((step / steps.length) * 100, 100)}%`, height: '100%', background: accent, transition: 'width .4s' }} />
      </div>
    </div>
  );
}

function VerdictPanel({ verdict, accent, font }) {
  return (
    <div>
      {/* Header */}
      <div style={{ padding: '20px 28px', borderBottom: '2.5px solid #0a0a0a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: font.body, background: '#f4f1e8' }}>
        <div style={{ fontWeight: 700, fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase' }}>▸ verdict for {verdict.name}</div>
        <div style={{ fontSize: 12, color: '#666' }}>generated by a robot · don't sue us</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', borderBottom: '2.5px solid #0a0a0a' }}>
        {/* LEFT: verdict + reasoning */}
        <div style={{ padding: 28, borderRight: '2.5px solid #0a0a0a' }}>
          <div style={{ fontFamily: font.body, fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#666' }}>buildable: {verdict.tier}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginTop: 8 }}>
            <div style={{ fontFamily: font.display, fontSize: 88, fontWeight: 700, lineHeight: 1, letterSpacing: '-0.04em', color: verdict.tierColor }}>
              {verdict.score}
            </div>
            <div style={{ fontFamily: font.display, fontSize: 22, fontWeight: 500, color: '#666' }}>/ 100</div>
          </div>
          <p style={{ fontFamily: font.display, fontSize: 20, fontWeight: 500, lineHeight: 1.3, margin: '16px 0 0', letterSpacing: '-0.01em' }}>
            "{verdict.verdict}"
          </p>
        </div>

        {/* RIGHT: stats */}
        <div style={{ display: 'grid', gridTemplateRows: '1fr 1fr', fontFamily: font.body }}>
          <div style={{ padding: 20, borderBottom: '2.5px solid #0a0a0a' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#666' }}>Time to clone</div>
            <div style={{ fontFamily: font.display, fontSize: 36, fontWeight: 700, marginTop: 4, letterSpacing: '-0.02em' }}>{verdict.time}</div>
          </div>
          <div style={{ padding: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#666' }}>Monthly cost</div>
            <div style={{ fontFamily: font.display, fontSize: 36, fontWeight: 700, marginTop: 4, letterSpacing: '-0.02em' }}>{verdict.cost}</div>
          </div>
        </div>
      </div>

      {/* STACK RECEIPT */}
      <div style={{ padding: '24px 28px', fontFamily: 'JetBrains Mono, monospace', fontSize: 14, background: '#fafaf5' }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#666', marginBottom: 14 }}>✦ your stack receipt</div>
        {verdict.stack.map((s, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < verdict.stack.length - 1 ? '1px dashed #ccc' : 'none' }}>
            <span>{String(i + 1).padStart(2, '0')}  {s}</span>
            <span style={{ color: '#666' }}>{i === 0 ? 'free tier' : i === 1 ? 'vibes' : i === 2 ? '$0.00' : 'included'}</span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 14, marginTop: 6, borderTop: '2px solid #0a0a0a', fontWeight: 700 }}>
          <span>TOTAL</span>
          <span>{verdict.cost}</span>
        </div>
      </div>

      {/* TUTORIALS */}
      {verdict.tutorials > 0 && (
        <div style={{ padding: '18px 28px', borderTop: '2.5px solid #0a0a0a', background: accent, fontFamily: font.body, fontSize: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <span style={{ fontWeight: 500 }}>▸ {verdict.tutorials} tutorials queued for your weekend of self-loathing</span>
          <button style={{ background: '#0a0a0a', color: accent, border: 'none', padding: '8px 16px', fontFamily: font.body, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>email me the build guide →</button>
        </div>
      )}
    </div>
  );
}

function SectionHead({ eyebrow, title, sub, font, dark, accent }) {
  return (
    <div style={{ maxWidth: 820 }}>
      <div style={{ fontFamily: font.body, fontSize: 13, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: dark ? accent : '#666' }}>{eyebrow}</div>
      <h2 style={{ fontFamily: font.display, fontSize: 'clamp(40px, 5.5vw, 68px)', fontWeight: 700, margin: '12px 0 16px', letterSpacing: '-0.03em', lineHeight: 1, textWrap: 'balance' }}>{title}</h2>
      {sub && <p style={{ fontFamily: font.body, fontSize: 18, lineHeight: 1.5, margin: 0, opacity: 0.85, maxWidth: 640 }}>{sub}</p>}
    </div>
  );
}

function VerdictCard({ v, accent, font }) {
  return (
    <div className="bru" style={{ background: '#fff', padding: 22, display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: '#666' }}>▸ {v.name}</div>
        <div style={{ fontFamily: font.body, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', background: v.tierColor, color: '#0a0a0a', padding: '3px 8px' }}>{v.tier}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <div style={{ fontFamily: font.display, fontSize: 56, fontWeight: 700, lineHeight: 1, letterSpacing: '-0.03em', color: v.tierColor }}>{v.score}</div>
        <div style={{ fontFamily: font.body, fontSize: 13, color: '#666' }}>/100</div>
        <div style={{ marginLeft: 'auto', fontFamily: font.body, fontSize: 12, textAlign: 'right' }}>
          <div>{v.time}</div>
          <div style={{ color: '#666' }}>{v.cost}</div>
        </div>
      </div>
      <p style={{ fontFamily: font.display, fontSize: 17, fontWeight: 500, lineHeight: 1.35, margin: 0, letterSpacing: '-0.005em' }}>"{v.verdict}"</p>
      <div style={{ borderTop: '1.5px dashed #0a0a0a', paddingTop: 12, fontFamily: 'JetBrains Mono, monospace', fontSize: 12, display: 'grid', gap: 4 }}>
        {v.stack.slice(0, 3).map((s, i) => <div key={i} style={{ opacity: 0.8 }}>· {s}</div>)}
        {v.stack.length > 3 && <div style={{ opacity: 0.5 }}>+ {v.stack.length - 3} more</div>}
      </div>
    </div>
  );
}

function FAQItem({ f, font, accent }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div style={{ borderTop: '2px solid #0a0a0a', padding: '20px 0' }}>
      <button onClick={() => setOpen(!open)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left' }}>
        <span style={{ fontFamily: font.display, fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}>{f.q}</span>
        <span style={{ fontFamily: font.display, fontSize: 28, fontWeight: 700, width: 36, height: 36, display: 'grid', placeItems: 'center', border: '2px solid #0a0a0a', background: open ? accent : '#fff', flexShrink: 0 }}>{open ? '−' : '+'}</span>
      </button>
      {open && <p style={{ fontFamily: font.body, fontSize: 16, lineHeight: 1.6, margin: '14px 0 0', maxWidth: 700 }}>{f.a}</p>}
    </div>
  );
}

Object.assign(window, { BrutalistDirection, ScanBox, ScanningPanel, VerdictPanel, SectionHead, VerdictCard, FAQItem });

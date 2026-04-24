// verdict-report.jsx — the fully-designed verdict report card, in brutalist style

const INK = '#0a0a0a';
const CREAM = '#f4f1e8';
const LIME = '#c6ff00';
const YELLOW = '#ffd84d';
const CORAL = '#ff6b4a';

const FONT_DISPLAY = '"Space Grotesk", system-ui, sans-serif';
const FONT_BODY = '"Space Grotesk", system-ui, sans-serif';
const FONT_MONO = '"JetBrains Mono", ui-monospace, monospace';

const DIFF_COLORS = {
  'easy': LIME,
  'medium': YELLOW,
  'hard': CORAL,
  'nightmare': '#8b5cf6',
};
const DIFF_GLYPH = {
  'easy': '▁',
  'medium': '▂',
  'hard': '▅',
  'nightmare': '█',
};

function bru(extra = {}) {
  return {
    border: `2.5px solid ${INK}`,
    boxShadow: `5px 5px 0 0 ${INK}`,
    background: '#fff',
    ...extra,
  };
}

function fmtMoney(v) {
  if (typeof v === 'string') return v;
  if (v === 0) return '$0.00';
  if (v < 100) return `$${v.toFixed(2)}`;
  return `$${v.toLocaleString()}`;
}

function VerdictReport({ v }) {
  return (
    <div style={{
      background: CREAM,
      padding: 40,
      fontFamily: FONT_BODY,
      color: INK,
    }}>
      <div style={{ ...bru(), background: '#fff' }}>

        {/* ───────── HEADER BAR ───────── */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px 22px', background: CREAM, borderBottom: `2.5px solid ${INK}`,
          fontSize: 11, fontFamily: FONT_MONO, letterSpacing: '0.05em',
        }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <span style={{ background: INK, color: LIME, padding: '2px 8px', fontWeight: 700, letterSpacing: '0.1em' }}>
              SAASPOCALYPSE
            </span>
            <span style={{ opacity: 0.6 }}>verdict #{v.id.toUpperCase()}-{String(Math.floor(Math.random() * 9000) + 1000)}</span>
          </div>
          <div style={{ opacity: 0.6 }}>scanned {v.scannedAt}</div>
        </div>

        {/* ───────── TITLE BLOCK ───────── */}
        <div style={{
          padding: '36px 44px 28px',
          borderBottom: `2.5px solid ${INK}`,
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          gap: 32,
          alignItems: 'end',
        }}>
          <div>
            <div style={{ fontFamily: FONT_MONO, fontSize: 12, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#666', marginBottom: 10 }}>
              subject of investigation
            </div>
            <h2 style={{
              fontFamily: FONT_DISPLAY, fontSize: 52, fontWeight: 700,
              lineHeight: 1, letterSpacing: '-0.03em', margin: 0,
            }}>
              {v.name}
            </h2>
            <div style={{ fontFamily: FONT_MONO, fontSize: 14, marginTop: 10, opacity: 0.7 }}>
              ▸ {v.tagline}
            </div>
          </div>

          {/* tier pill */}
          <div style={{
            border: `2.5px solid ${INK}`,
            padding: '8px 16px',
            background: v.tierBg,
            fontFamily: FONT_DISPLAY,
            fontWeight: 700,
            letterSpacing: '0.05em',
            fontSize: 20,
            transform: 'rotate(-2deg)',
            whiteSpace: 'nowrap',
          }}>
            verdict: {v.tier}
          </div>
        </div>

        {/* ───────── SCORE + TAKE ───────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '280px 1fr',
          borderBottom: `2.5px solid ${INK}`,
        }}>
          {/* score */}
          <div style={{
            padding: '32px 28px',
            borderRight: `2.5px solid ${INK}`,
            background: v.tierBg,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: 260,
          }}>
            <div style={{ fontFamily: FONT_MONO, fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#333' }}>
              buildability score
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <div style={{
                fontFamily: FONT_DISPLAY, fontSize: 140, fontWeight: 700,
                lineHeight: 0.85, letterSpacing: '-0.05em', color: INK,
              }}>
                {v.score}
              </div>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: 500, opacity: 0.5 }}>
                /100
              </div>
            </div>
            <div style={{ fontFamily: FONT_MONO, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.7 }}>
              tier · <span style={{ fontWeight: 700, color: INK }}>{v.tier.toLowerCase()}</span>
            </div>
          </div>

          {/* blunt take */}
          <div style={{ padding: '32px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative' }}>
            <div style={{ fontFamily: FONT_MONO, fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#666', marginBottom: 14 }}>
              the blunt take
            </div>
            <p style={{
              fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 500,
              lineHeight: 1.3, letterSpacing: '-0.015em', margin: 0, textWrap: 'balance',
            }}>
              "{v.take}"
            </p>
            <p style={{
              fontFamily: FONT_BODY, fontSize: 15, fontWeight: 400,
              lineHeight: 1.5, margin: '16px 0 0', opacity: 0.7, maxWidth: 620,
            }}>
              {v.take_sub}
            </p>
          </div>
        </div>

        {/* ───────── COST COMPARISON ───────── */}
        <div style={{
          padding: '32px 44px',
          borderBottom: `2.5px solid ${INK}`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 24 }}>
            <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>
              cost breakdown.
            </h3>
            <div style={{ fontFamily: FONT_MONO, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.6 }}>
              their price ←→ your price
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 40px 1fr', gap: 16, alignItems: 'stretch' }}>
            {/* THEIR price */}
            <div style={{ border: `2.5px solid ${INK}`, background: '#fff5f3' }}>
              <div style={{ padding: '10px 16px', borderBottom: `2.5px solid ${INK}`, fontFamily: FONT_MONO, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between' }}>
                <span>what they charge</span>
                <span style={{ color: CORAL }}>●</span>
              </div>
              <div style={{ padding: '20px 20px 24px' }}>
                <div style={{ fontFamily: FONT_MONO, fontSize: 12, opacity: 0.7, marginBottom: 6 }}>
                  {v.currentCost.label}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <div style={{ fontFamily: FONT_DISPLAY, fontSize: 44, fontWeight: 700, lineHeight: 1, letterSpacing: '-0.03em' }}>
                    {typeof v.currentCost.price === 'number' ? `$${v.currentCost.price}` : v.currentCost.price}
                  </div>
                  <div style={{ fontFamily: FONT_BODY, fontSize: 14, opacity: 0.6 }}>/ {v.currentCost.unit}</div>
                </div>
                {v.currentCost.note && (
                  <div style={{ fontFamily: FONT_MONO, fontSize: 11, opacity: 0.6, marginTop: 6 }}>
                    ※ {v.currentCost.note}
                  </div>
                )}
                <div style={{ borderTop: '1.5px dashed #ccc', paddingTop: 10, marginTop: 16, display: 'flex', justifyContent: 'space-between', fontFamily: FONT_MONO, fontSize: 12 }}>
                  <span style={{ opacity: 0.6 }}>annual:</span>
                  <span style={{ fontWeight: 700 }}>{typeof v.currentCost.annual === 'number' ? `$${v.currentCost.annual}` : v.currentCost.annual}</span>
                </div>
              </div>
            </div>

            {/* arrow */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT_DISPLAY, fontSize: 40, fontWeight: 700, letterSpacing: '-0.05em' }}>
              ↔
            </div>

            {/* YOUR price */}
            <div style={{ border: `2.5px solid ${INK}`, background: '#f0fdf4', boxShadow: `5px 5px 0 0 ${INK}` }}>
              <div style={{ padding: '10px 16px', borderBottom: `2.5px solid ${INK}`, fontFamily: FONT_MONO, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', background: LIME, display: 'flex', justifyContent: 'space-between' }}>
                <span>what it costs you</span>
                <span>✦</span>
              </div>
              <div style={{ padding: '18px 20px 20px', fontFamily: FONT_MONO, fontSize: 13 }}>
                {v.estCost.map((line, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: i < v.estCost.length - 1 ? '1px dashed #ccc' : 'none' }}>
                    <span style={{ opacity: 0.75 }}>{String(i + 1).padStart(2, '0')} · {line.line}</span>
                    <span style={{ fontWeight: 700 }}>{fmtMoney(line.cost)}</span>
                  </div>
                ))}
                <div style={{ borderTop: `2px solid ${INK}`, marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 700 }}>
                  <span>TOTAL / mo</span>
                  <span>{fmtMoney(v.estTotal)}</span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 18, padding: '10px 16px', border: `2px dashed ${INK}`, background: CREAM, fontFamily: FONT_MONO, fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700, letterSpacing: '0.05em' }}>▸ break-even:</span>
            <span>{v.breakEven}</span>
          </div>
        </div>

        {/* ───────── ALTERNATIVES ───────── */}
        <div style={{
          padding: '32px 44px',
          borderBottom: `2.5px solid ${INK}`,
          background: CREAM,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20 }}>
            <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>
              or, you know, use one of these.
            </h3>
            <div style={{ fontFamily: FONT_MONO, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.6 }}>
              if building feels spicy
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            {v.alternatives.map((alt, i) => (
              <div key={i} style={{ border: `2.5px solid ${INK}`, background: '#fff', padding: '16px 18px', position: 'relative' }}>
                <div style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', opacity: 0.5 }}>
                  option {String.fromCharCode(65 + i)}
                </div>
                <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em', marginTop: 4 }}>
                  {alt.name}
                </div>
                <div style={{ fontFamily: FONT_BODY, fontSize: 14, lineHeight: 1.5, marginTop: 8, opacity: 0.8 }}>
                  {alt.why}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ───────── BUILD CHALLENGES ───────── */}
        <div style={{
          padding: '32px 44px',
          borderBottom: `2.5px solid ${INK}`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
            <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>
              what'll actually be hard.
            </h3>
            <div style={{ fontFamily: FONT_MONO, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.6 }}>
              est. total: {v.timeEstimate}
            </div>
          </div>
          <div style={{ fontFamily: FONT_MONO, fontSize: 12, opacity: 0.6, marginBottom: 20 }}>
            ▸ {v.timeBreakdown}
          </div>

          {/* difficulty legend */}
          <div style={{ display: 'flex', gap: 14, marginBottom: 16, fontFamily: FONT_MONO, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {Object.entries(DIFF_COLORS).map(([k, c]) => (
              <div key={k} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <div style={{ width: 12, height: 12, background: c, border: `1.5px solid ${INK}` }} />
                <span style={{ opacity: 0.7 }}>{k}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            {v.challenges.map((c, i) => (
              <div key={i} style={{
                display: 'grid',
                gridTemplateColumns: '40px 110px 1fr',
                gap: 14,
                alignItems: 'center',
                padding: '10px 14px',
                border: `2px solid ${INK}`,
                background: '#fff',
              }}>
                <div style={{
                  fontFamily: FONT_MONO, fontSize: 13, fontWeight: 700, color: '#999',
                }}>{String(i + 1).padStart(2, '0')}</div>
                <div style={{
                  fontFamily: FONT_MONO, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
                  fontWeight: 700,
                  padding: '4px 8px',
                  background: DIFF_COLORS[c.diff],
                  border: `1.5px solid ${INK}`,
                  textAlign: 'center',
                }}>
                  {c.diff}
                </div>
                <div>
                  <div style={{ fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 600, letterSpacing: '-0.005em' }}>
                    {c.name}
                  </div>
                  <div style={{ fontFamily: FONT_BODY, fontSize: 13, opacity: 0.7, marginTop: 2 }}>
                    {c.note}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* stack pills */}
          <div style={{ marginTop: 22, paddingTop: 18, borderTop: `1.5px dashed ${INK}` }}>
            <div style={{ fontFamily: FONT_MONO, fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', opacity: 0.6, marginBottom: 10 }}>
              recommended stack
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {v.stack.map((s, i) => (
                <span key={i} style={{
                  fontFamily: FONT_MONO, fontSize: 12,
                  padding: '5px 10px',
                  border: `2px solid ${INK}`,
                  background: i % 2 === 0 ? '#fff' : CREAM,
                }}>
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ───────── CTA ───────── */}
        <div style={{
          padding: '28px 44px',
          background: INK,
          color: CREAM,
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          gap: 24,
          alignItems: 'center',
        }}>
          <div>
            <div style={{ fontFamily: FONT_MONO, fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: LIME, marginBottom: 4 }}>
              ready to build?
            </div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.15 }}>
              {v.score >= 70 ? "We'll email you a 1-page build guide." :
                v.score >= 30 ? "We'll email you a 3-page build guide. Good luck." :
                  "We'll email you a link to Google Maps. Nearest park."}
            </div>
          </div>
          <button style={{
            fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em',
            background: LIME, color: INK,
            border: `2.5px solid ${LIME}`,
            boxShadow: `5px 5px 0 0 ${CREAM}`,
            padding: '16px 28px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}>
            {v.score >= 70 ? '→ get the build guide' : v.score >= 30 ? '→ email me anyway' : '→ go outside'}
          </button>
        </div>

        {/* ───────── FOOTER ───────── */}
        <div style={{
          padding: '10px 22px',
          fontFamily: FONT_MONO, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
          color: '#666', background: CREAM, borderTop: `2.5px solid ${INK}`,
          display: 'flex', justifyContent: 'space-between',
        }}>
          <span>▸ generated by a robot, vibes-checked by nobody</span>
          <span>verdict v2.1 · saaspocalypse.biz</span>
        </div>
      </div>
    </div>
  );
}

window.VerdictReport = VerdictReport;

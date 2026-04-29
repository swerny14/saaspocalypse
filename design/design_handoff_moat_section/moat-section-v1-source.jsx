// moat-section-v1-source.jsx
// "How deep is the moat" — v1 typographic hero
// Brand: Saaspocalypse (Space Grotesk + JetBrains Mono, ink/cream/lime/coral)
// This is a DESIGN REFERENCE. Recreate with your codebase's styling primitives.

const INK = '#0a0a0a';
const CREAM = '#f4f1e8';
const LIME = '#c6ff00';
const CORAL = '#ff6b4a';
const PINK = '#ff3366';
const PAPER = '#ffffff';

const FONT_DISPLAY = '"Space Grotesk", system-ui, sans-serif';
const FONT_MONO = '"JetBrains Mono", ui-monospace, monospace';

// ----- Sample data -----
const MOAT = {
  aggregate: 3.0,
  blurb: 'weighted average of the six axes below. higher = harder for an indie hacker to displace.',
  axes: [
    { key: 'capital',    score: 4.0, sub: 'what it costs to keep the lights on' },
    { key: 'technical',  score: 4.7, sub: 'depth of the underlying engineering' },
    { key: 'network',    score: 0.0, sub: 'users compound users' },
    { key: 'switching',  score: 4.0, sub: 'stickiness of customer data + workflow' },
    { key: 'data',       score: 0.0, sub: 'proprietary data accumulates over time' },
    { key: 'regulatory', score: 0.0, sub: 'real licenses + compliance, not SOC 2 theater' },
  ],
};

// Maps a 0..10 score to a {label, bar color} verdict
function severity(s) {
  if (s >= 7) return { label: 'fortress',   bar: PINK };
  if (s >= 4) return { label: 'meaningful', bar: INK };
  if (s >= 1) return { label: 'shallow',    bar: '#666' };
  return        { label: 'none',       bar: '#999' };
}

// Mono uppercase label, used for section/axis tags
function MoatLabel({ children, color = '#666' }) {
  return (
    <div style={{
      fontFamily: FONT_MONO, fontSize: 11, fontWeight: 700,
      letterSpacing: '0.18em', textTransform: 'uppercase', color,
    }}>{children}</div>
  );
}

function MoatV1() {
  const sev = severity(MOAT.aggregate);
  return (
    <div style={{
      background: CREAM, padding: 36, fontFamily: FONT_DISPLAY, color: INK,
    }}>
      <div style={{
        background: PAPER,
        border: `2.5px solid ${INK}`,
        boxShadow: `6px 6px 0 0 ${INK}`,
      }}>
        {/* ─── Header strip ─── */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px 24px',
          borderBottom: `2.5px solid ${INK}`,
          background: CREAM,
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
            <span style={{
              background: INK, color: LIME, padding: '3px 9px',
              fontFamily: FONT_MONO, fontSize: 11, fontWeight: 700, letterSpacing: '0.15em',
            }}>§ 04</span>
            <h2 style={{
              fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: 700,
              letterSpacing: '-0.02em', margin: 0,
            }}>how deep is the moat.</h2>
          </div>
          <a style={{
            fontFamily: FONT_MONO, fontSize: 11, fontWeight: 700,
            letterSpacing: '0.15em', textTransform: 'uppercase', color: INK,
            textDecoration: 'none', borderBottom: `2px solid ${INK}`, paddingBottom: 1,
          }}>methodology →</a>
        </div>

        {/* ─── Hero score row ─── */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 28,
          padding: '36px 28px 28px',
          borderBottom: `2.5px solid ${INK}`,
          alignItems: 'end',
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{
              fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 200,
              lineHeight: 0.78, letterSpacing: '-0.06em',
            }}>{MOAT.aggregate.toFixed(1)}</span>
            <span style={{
              fontFamily: FONT_DISPLAY, fontWeight: 500, fontSize: 56,
              lineHeight: 1, opacity: 0.35, letterSpacing: '-0.04em',
            }}>/10</span>
          </div>
          <div style={{ paddingBottom: 14 }}>
            <MoatLabel>aggregate score · {sev.label}</MoatLabel>
            <p style={{
              fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 500,
              lineHeight: 1.25, letterSpacing: '-0.01em',
              margin: '12px 0 0', textWrap: 'balance', maxWidth: 560,
            }}>{MOAT.blurb}</p>
            {/* Aggregate bar */}
            <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                flex: 1, height: 14, background: '#eee',
                border: `2px solid ${INK}`, position: 'relative',
              }}>
                <div style={{
                  position: 'absolute', inset: 0,
                  width: `${MOAT.aggregate * 10}%`, background: INK,
                }} />
              </div>
              <div style={{
                fontFamily: FONT_MONO, fontSize: 11, letterSpacing: '0.1em',
                textTransform: 'uppercase', color: '#666', whiteSpace: 'nowrap',
              }}>shallow ditch</div>
            </div>
          </div>
        </div>

        {/* ─── Axes grid (2 columns × 3 rows) ─── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
          {MOAT.axes.map((a, i) => {
            const s = severity(a.score);
            const isRight = i % 2 === 1;
            const isLast = i >= MOAT.axes.length - 2;
            return (
              <div key={a.key} style={{
                padding: '18px 22px',
                borderRight: isRight ? 'none' : `2.5px solid ${INK}`,
                borderBottom: isLast ? 'none' : `2.5px solid ${INK}`,
                background: a.score === 0 ? CREAM : PAPER,
              }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'baseline', gap: 12,
                }}>
                  <MoatLabel color={INK}>{a.key}</MoatLabel>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{
                      fontFamily: FONT_DISPLAY, fontSize: 30, fontWeight: 700,
                      letterSpacing: '-0.03em', lineHeight: 1,
                      color: a.score === 0 ? '#999' : INK,
                    }}>{a.score.toFixed(1)}</span>
                    <span style={{
                      fontFamily: FONT_DISPLAY, fontSize: 14, opacity: 0.4,
                    }}>/10</span>
                  </div>
                </div>
                {/* bar */}
                <div style={{
                  height: 8, background: '#eee',
                  border: `1.5px solid ${INK}`, marginTop: 10, position: 'relative',
                }}>
                  <div style={{
                    position: 'absolute', inset: 0,
                    width: `${a.score * 10}%`, background: s.bar,
                  }} />
                </div>
                <div style={{
                  fontFamily: FONT_MONO, fontSize: 12, color: '#555', marginTop: 10,
                }}>{a.sub}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

window.MoatV1 = MoatV1;

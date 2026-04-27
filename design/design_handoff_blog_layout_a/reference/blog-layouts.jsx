// blog-layouts.jsx — two layout variations for the Saaspocalypse blog index + a sample article

const INK = '#0a0a0a';
const CREAM = '#f4f1e8';
const PAPER = '#fff';
const LIME = '#c6ff00';
const YELLOW = '#ffd84d';
const CORAL = '#ff6b4a';
const FONT_DISPLAY = '"Space Grotesk", system-ui, sans-serif';
const FONT_BODY = '"Space Grotesk", system-ui, sans-serif';
const FONT_MONO = '"JetBrains Mono", ui-monospace, monospace';
const FONT_SERIF = '"Fraunces", Georgia, serif';

// shared shell — top nav and outer cream wrap
function BlogShell({ children, width = 1200 }) {
  return (
    <div style={{ background: CREAM, minHeight: 600, fontFamily: FONT_BODY, color: INK }}>
      <div style={{
        borderBottom: `2.5px solid ${INK}`, padding: '14px 32px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: PAPER,
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
          <span style={{ background: INK, color: LIME, padding: '3px 10px', fontFamily: FONT_DISPLAY, fontWeight: 700, letterSpacing: '0.05em', fontSize: 18 }}>
            saaspocalypse
          </span>
          <span style={{ fontFamily: FONT_MONO, fontSize: 11, opacity: 0.5, letterSpacing: '0.1em', textTransform: 'uppercase' }}>/ the blog</span>
        </div>
        <nav style={{ display: 'flex', gap: 22, fontFamily: FONT_MONO, fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          <a style={{ color: INK }}>scan</a>
          <a style={{ color: INK }}>archive</a>
          <a style={{ color: INK, borderBottom: `2px solid ${INK}`, paddingBottom: 2 }}>blog</a>
          <a style={{ color: INK }}>about</a>
        </nav>
      </div>
      <div style={{ padding: '40px 32px 56px', maxWidth: width, margin: '0 auto' }}>
        {children}
      </div>
    </div>
  );
}

// =========================================================================
// LAYOUT A — "Editorial broadsheet": big serif featured + dense card grid
// =========================================================================
function BlogIndexA() {
  const posts = window.BLOG_POSTS;
  const featured = posts[0];
  const rest = posts.slice(1);
  return (
    <BlogShell>
      {/* masthead */}
      <div style={{ borderBottom: `2.5px solid ${INK}`, paddingBottom: 18, marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div>
          <h1 style={{ fontFamily: FONT_SERIF, fontWeight: 700, fontSize: 64, letterSpacing: '-0.04em', lineHeight: 0.95, margin: 0 }}>
            field notes from<br /><em style={{ background: LIME, padding: '0 8px' }}>the apocalypse.</em>
          </h1>
          <p style={{ fontFamily: FONT_BODY, fontSize: 16, opacity: 0.7, margin: '14px 0 0', maxWidth: 640 }}>
            Essays and confessions from indie hackers who probably shouldn't be left alone with a dev server. Updated when we feel like it.
          </p>
        </div>
        <div style={{ fontFamily: FONT_MONO, fontSize: 11, opacity: 0.6, letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: 'right' }}>
          ▸ vol. 02 · iss. 14<br />
          ▸ apr 2026
        </div>
      </div>

      {/* featured */}
      <article style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 28, paddingBottom: 32, borderBottom: `2.5px solid ${INK}`, marginBottom: 32 }}>
        <div style={{ background: YELLOW, border: `2.5px solid ${INK}`, boxShadow: `5px 5px 0 0 ${INK}`, padding: '28px 32px', minHeight: 320, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FONT_MONO, fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            <span>▸ this week's confession</span>
            <span>{featured.date.toLowerCase()}</span>
          </div>
          <h2 style={{ fontFamily: FONT_SERIF, fontWeight: 700, fontSize: 44, lineHeight: 1.05, letterSpacing: '-0.025em', margin: '20px 0 0', textWrap: 'balance' }}>
            "{featured.title}"
          </h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <p style={{ fontFamily: FONT_BODY, fontSize: 19, lineHeight: 1.5, margin: 0, textWrap: 'pretty' }}>
            {featured.excerpt}
          </p>
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
              {featured.tags.map(t => (
                <span key={t} style={{ fontFamily: FONT_MONO, fontSize: 11, padding: '3px 8px', border: `2px solid ${INK}`, background: PAPER }}>#{t}</span>
              ))}
              <span style={{ fontFamily: FONT_MONO, fontSize: 11, padding: '3px 8px', opacity: 0.6 }}>▸ {featured.readTime} read</span>
            </div>
            <button style={{ background: INK, color: LIME, fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 16, border: 'none', padding: '12px 22px', cursor: 'pointer', letterSpacing: '-0.01em' }}>
              → read the whole confession
            </button>
          </div>
        </div>
      </article>

      {/* category chips */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 22, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontFamily: FONT_MONO, fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', opacity: 0.5, marginRight: 6 }}>browse:</span>
        {['all', 'essays', 'opinion', 'build-log', 'roasts'].map((c, i) => (
          <span key={c} style={{
            fontFamily: FONT_MONO, fontSize: 12, padding: '5px 12px',
            border: `2px solid ${INK}`,
            background: i === 0 ? INK : PAPER,
            color: i === 0 ? LIME : INK,
            fontWeight: 700, letterSpacing: '0.05em',
          }}>{c}</span>
        ))}
      </div>

      {/* post grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {rest.map((p, i) => (
          <article key={p.id} style={{ border: `2.5px solid ${INK}`, background: PAPER, padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 12, minHeight: 260 }}>
            <div style={{ fontFamily: FONT_MONO, fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', opacity: 0.7 }}>
              <span>№ {String(i + 2).padStart(2, '0')}</span>
              <span>{p.date.toLowerCase()}</span>
            </div>
            <h3 style={{ fontFamily: FONT_SERIF, fontWeight: 700, fontSize: 22, lineHeight: 1.15, letterSpacing: '-0.015em', margin: 0, textWrap: 'balance' }}>
              {p.title}
            </h3>
            <p style={{ fontFamily: FONT_BODY, fontSize: 14, lineHeight: 1.55, margin: 0, opacity: 0.75, flex: 1 }}>
              {p.excerpt}
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1.5px dashed ${INK}`, paddingTop: 10 }}>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {p.tags.slice(0, 2).map(t => (
                  <span key={t} style={{ fontFamily: FONT_MONO, fontSize: 10, opacity: 0.65 }}>#{t}</span>
                ))}
              </div>
              <span style={{ fontFamily: FONT_MONO, fontSize: 10, opacity: 0.65 }}>{p.readTime}</span>
            </div>
          </article>
        ))}
      </div>

      <NewsletterBlock variant="A" />
    </BlogShell>
  );
}

// =========================================================================
// LAYOUT B — "Newsroom list": sans-serif, single-column, dense + chronological
// =========================================================================
function BlogIndexB() {
  const posts = window.BLOG_POSTS;
  return (
    <BlogShell width={920}>
      {/* masthead — punchier */}
      <div style={{ marginBottom: 32, position: 'relative' }}>
        <div style={{ fontFamily: FONT_MONO, fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', opacity: 0.6, marginBottom: 10 }}>
          ▸ {posts.length} entries · updated weekly · grumpily
        </div>
        <h1 style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 96, letterSpacing: '-0.05em', lineHeight: 0.92, margin: 0 }}>
          notes from<br />
          <span style={{ background: INK, color: LIME, padding: '0 14px', display: 'inline-block', transform: 'rotate(-1deg)' }}>the trenches.</span>
        </h1>
        <p style={{ fontFamily: FONT_BODY, fontSize: 18, opacity: 0.75, margin: '20px 0 0', maxWidth: 600 }}>
          Essays from people who keep accidentally rebuilding Linear instead of finishing the actual app. Sub at the bottom. Or don't. We're not the boss of you.
        </p>
      </div>

      {/* filter row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `2.5px solid ${INK}`, borderBottom: `2.5px solid ${INK}`, padding: '12px 0', marginBottom: 28 }}>
        <div style={{ display: 'flex', gap: 16, fontFamily: FONT_MONO, fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          <span style={{ borderBottom: `2px solid ${INK}`, paddingBottom: 2 }}>all</span>
          <span style={{ opacity: 0.6 }}>essays</span>
          <span style={{ opacity: 0.6 }}>opinion</span>
          <span style={{ opacity: 0.6 }}>build-log</span>
        </div>
        <span style={{ fontFamily: FONT_MONO, fontSize: 11, opacity: 0.5, letterSpacing: '0.1em', textTransform: 'uppercase' }}>sorted: newest first</span>
      </div>

      {/* list */}
      <div>
        {posts.map((p, i) => (
          <article key={p.id} style={{
            display: 'grid', gridTemplateColumns: '90px 1fr 110px',
            gap: 24, padding: '24px 0',
            borderBottom: i < posts.length - 1 ? `1.5px solid ${INK}` : 'none',
            alignItems: 'baseline',
          }}>
            <div style={{ fontFamily: FONT_MONO, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.7 }}>
              <div>№ {String(i + 1).padStart(2, '0')}</div>
              <div style={{ marginTop: 6, opacity: 0.6 }}>{p.date.toLowerCase()}</div>
            </div>
            <div>
              <h3 style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: i === 0 ? 36 : 28, lineHeight: 1.1, letterSpacing: '-0.02em', margin: 0, textWrap: 'balance' }}>
                {i === 0 && <span style={{ background: LIME, padding: '0 6px', fontFamily: FONT_MONO, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', verticalAlign: 'middle', marginRight: 10, position: 'relative', top: -6 }}>latest</span>}
                {p.title}
              </h3>
              <p style={{ fontFamily: FONT_BODY, fontSize: 15, lineHeight: 1.55, margin: '10px 0 0', opacity: 0.8, maxWidth: 620 }}>
                {p.excerpt}
              </p>
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                {p.tags.map(t => (
                  <span key={t} style={{ fontFamily: FONT_MONO, fontSize: 11, padding: '2px 8px', border: `1.5px solid ${INK}`, background: PAPER }}>#{t}</span>
                ))}
              </div>
            </div>
            <div style={{ fontFamily: FONT_MONO, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.7, textAlign: 'right' }}>
              {p.readTime}
              <div style={{ marginTop: 8, opacity: 0.6 }}>by {p.author}</div>
            </div>
          </article>
        ))}
      </div>

      <NewsletterBlock variant="B" />
    </BlogShell>
  );
}

// =========================================================================
// SAMPLE ARTICLE — single post detail (used as the third artboard)
// =========================================================================
function BlogArticle() {
  const a = window.SAMPLE_ARTICLE;
  return (
    <BlogShell width={780}>
      {/* breadcrumb */}
      <div style={{ fontFamily: FONT_MONO, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.6, marginBottom: 28 }}>
        <span>← blog</span> &nbsp;/&nbsp; <span>essays</span> &nbsp;/&nbsp; <span style={{ opacity: 0.4 }}>this one</span>
      </div>

      {/* header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
          {a.tags.map(t => (
            <span key={t} style={{ fontFamily: FONT_MONO, fontSize: 11, padding: '3px 10px', border: `2px solid ${INK}`, background: LIME, fontWeight: 700, letterSpacing: '0.05em' }}>#{t}</span>
          ))}
        </div>
        <h1 style={{ fontFamily: FONT_SERIF, fontWeight: 700, fontSize: 56, lineHeight: 1.0, letterSpacing: '-0.03em', margin: 0, textWrap: 'balance' }}>
          {a.title}
        </h1>
        <div style={{ display: 'flex', gap: 22, marginTop: 20, fontFamily: FONT_MONO, fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.7, paddingTop: 16, borderTop: `1.5px solid ${INK}` }}>
          <span>by {a.author}</span>
          <span>{a.date.toLowerCase()}</span>
          <span>{a.readTime} read</span>
          <span style={{ marginLeft: 'auto', opacity: 0.5 }}>scroll for more cope</span>
        </div>
      </div>

      {/* body */}
      <div style={{ fontFamily: FONT_BODY }}>
        {a.body.map((b, i) => {
          if (b.type === 'h2') {
            return <h2 key={i} style={{ fontFamily: FONT_SERIF, fontWeight: 700, fontSize: 30, letterSpacing: '-0.02em', lineHeight: 1.15, margin: '38px 0 14px' }}>{b.text}</h2>;
          }
          if (b.type === 'callout') {
            return (
              <div key={i} style={{ background: LIME, border: `2.5px solid ${INK}`, boxShadow: `5px 5px 0 0 ${INK}`, padding: '20px 24px', margin: '24px 0', fontFamily: FONT_SERIF, fontWeight: 600, fontSize: 24, lineHeight: 1.3, fontStyle: 'italic', textWrap: 'balance' }}>
                "{b.text}"
              </div>
            );
          }
          return (
            <p key={i} style={{ fontFamily: FONT_BODY, fontSize: 18, lineHeight: 1.65, margin: '0 0 18px', textWrap: 'pretty' }}>
              {b.text}
            </p>
          );
        })}
      </div>

      {/* end matter */}
      <div style={{ borderTop: `2.5px solid ${INK}`, marginTop: 40, paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ fontFamily: FONT_MONO, fontSize: 12, opacity: 0.7 }}>
          ▸ filed under: <span style={{ fontWeight: 700, color: INK, opacity: 1 }}>essays</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={{ fontFamily: FONT_MONO, fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '8px 14px', border: `2px solid ${INK}`, background: PAPER, cursor: 'pointer' }}>← prev</button>
          <button style={{ fontFamily: FONT_MONO, fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '8px 14px', border: `2px solid ${INK}`, background: INK, color: LIME, cursor: 'pointer' }}>next →</button>
        </div>
      </div>

      <NewsletterBlock variant="A" compact />
    </BlogShell>
  );
}

// =========================================================================
// NEWSLETTER BLOCK — shared, slight variant per layout
// =========================================================================
function NewsletterBlock({ variant = 'A', compact = false }) {
  const isA = variant === 'A';
  return (
    <div style={{
      marginTop: compact ? 40 : 56,
      border: `2.5px solid ${INK}`,
      boxShadow: `8px 8px 0 0 ${INK}`,
      background: isA ? CORAL : INK,
      color: isA ? INK : CREAM,
      padding: compact ? '28px 32px' : '40px 44px',
      display: 'grid',
      gridTemplateColumns: compact ? '1fr auto' : '1.2fr 1fr',
      gap: 28,
      alignItems: 'center',
    }}>
      <div>
        <div style={{ fontFamily: FONT_MONO, fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', opacity: isA ? 0.7 : 0.5, marginBottom: 8 }}>
          ▸ the worst newsletter in indie hacking
        </div>
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: compact ? 28 : 38, letterSpacing: '-0.025em', lineHeight: 1.1, textWrap: 'balance' }}>
          One email. Roughly weekly. Possibly funny. Definitely real.
        </div>
        {!compact && (
          <p style={{ fontFamily: FONT_BODY, fontSize: 15, lineHeight: 1.55, margin: '12px 0 0', opacity: 0.8, maxWidth: 460 }}>
            Sent when there's something to say, not when the calendar reminder fires. Currently {Math.floor(Math.random() * 3000) + 4200} indie hackers reading and slowly nodding.
          </p>
        )}
      </div>
      <div style={{ display: 'flex', gap: 0, border: `2.5px solid ${INK}`, background: PAPER }}>
        <input
          placeholder="you@laptop.local"
          style={{
            flex: 1, padding: '14px 16px', fontFamily: FONT_MONO, fontSize: 14,
            border: 'none', outline: 'none', background: 'transparent', color: INK, minWidth: 180,
          }}
        />
        <button style={{
          fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 14,
          background: LIME, color: INK, border: 'none', borderLeft: `2.5px solid ${INK}`,
          padding: '0 18px', cursor: 'pointer', letterSpacing: '-0.01em', whiteSpace: 'nowrap',
        }}>
          → subscribe
        </button>
      </div>
    </div>
  );
}

window.BlogIndexA = BlogIndexA;
window.BlogIndexB = BlogIndexB;
window.BlogArticle = BlogArticle;

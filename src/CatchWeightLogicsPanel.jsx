import React, { useState } from 'react'

// ─── Design tokens (mirrors app palette) ─────────────────────────────────────
const C = {
  bg: '#f1f5f9', card: '#ffffff', border: '#e2e8f0',
  primary: '#2563eb',
  success: '#16a34a', successBg: '#dcfce7', successBorder: '#86efac',
  error:   '#dc2626', errorBg:   '#fee2e2', errorBorder:   '#fca5a5',
  warning: '#b45309', warningBg: '#fef3c7', warningBorder: '#fde68a',
  info:    '#0369a1', infoBg:    '#e0f2fe', infoBorder:    '#7dd3fc',
  purple:  '#7c3aed', purpleBg:  '#f5f3ff', purpleBorder:  '#c4b5fd',
  teal:    '#0d9488', tealBg:    '#f0fdfa', tealBorder:    '#99f6e4',
  muted: '#6b7280', text: '#1e293b', sub: '#475569',
}

// ─── Category meta ────────────────────────────────────────────────────────────
const CAT = {
  uom:      { icon: '⚖', label: 'UOM',      color: C.purple,  bg: C.purpleBg,  border: C.purpleBorder  },
  quantity: { icon: '🔢', label: 'Quantity', color: C.info,    bg: C.infoBg,    border: C.infoBorder    },
  price:    { icon: '💰', label: 'Price',    color: C.warning, bg: C.warningBg, border: C.warningBorder },
  shipping: { icon: '📦', label: 'Shipping', color: C.teal,    bg: C.tealBg,    border: C.tealBorder    },
  advisory: { icon: '⚠', label: 'Advisory', color: C.error,   bg: C.errorBg,   border: C.errorBorder   },
}

// ─── JS syntax highlighter (single-pass tokenizer — avoids matching inside emitted HTML) ──
function highlightJs(code) {
  // 1. Escape HTML entities in the ORIGINAL source first
  const escaped = code
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  // 2. Token patterns ordered by priority (first match wins at each position)
  const TOKENS = [
    // block comments
    [/\/\*[\s\S]*?\*\//, m => `<span style="color:#94a3b8;font-style:italic">${m}</span>`],
    // line comments
    [/\/\/[^\n]*/, m => `<span style="color:#94a3b8;font-style:italic">${m}</span>`],
    // template literals
    [/`[^`]*`/, m => `<span style="color:#fcd34d">${m}</span>`],
    // single-quoted strings (keep surrounding quotes uncoloured)
    [/'[^']*'/, m => `'<span style="color:#fcd34d">${m.slice(1, -1)}</span>'`],
    // CXML constants (before generic identifiers)
    [/CXML_SUBSTITUTION_CONST\.[A-Z_]+/, m => `<span style="color:#fbbf24;font-weight:700">${m}</span>`],
    // keywords
    [/\b(?:if|else|forEach|return|const|let|var|function|new|Math|Array|from|null|undefined|true|false|this)\b/, m => `<span style="color:#a78bfa;font-weight:700">${m}</span>`],
    // identifiers followed by (
    [/\b[a-zA-Z_$][a-zA-Z0-9_$]*(?=\s*\()/, m => `<span style="color:#6ee7b7">${m}</span>`],
    // numbers
    [/\b\d+(?:\.\d+)?\b/, m => `<span style="color:#fb923c">${m}</span>`],
  ]

  // 3. Walk left-to-right; at each step find the earliest matching token
  const parts = []
  let remaining = escaped
  while (remaining.length > 0) {
    let earliest = remaining.length, bestMatch = null, bestFn = null
    for (const [rx, fn] of TOKENS) {
      const m = rx.exec(remaining)
      if (m && m.index < earliest) {
        earliest = m.index
        bestMatch = m
        bestFn = fn
      }
    }
    if (!bestMatch) { parts.push(remaining); break }        // no more tokens
    if (earliest > 0) parts.push(remaining.slice(0, earliest)) // plain text before token
    parts.push(bestFn(bestMatch[0]))                        // highlighted token
    remaining = remaining.slice(earliest + bestMatch[0].length)
  }
  return parts.join('')
}

// ─── Copy button ──────────────────────────────────────────────────────────────
function CopyBtn({ text, label = '⧉ Copy', size = 'normal' }) {
  const [done, setDone] = useState(false)
  const copy = () => navigator.clipboard?.writeText(text).then(() => {
    setDone(true); setTimeout(() => setDone(false), 2000)
  })
  return (
    <button onClick={copy} style={{
      padding: size === 'small' ? '3px 8px' : '5px 14px',
      border: `1px solid ${done ? C.successBorder : C.border}`,
      borderRadius: 6, cursor: 'pointer', fontWeight: 700,
      fontSize: size === 'small' ? 10 : 11,
      background: done ? C.successBg : '#f8fafc',
      color: done ? C.success : C.sub,
      whiteSpace: 'nowrap', transition: 'all .15s',
    }}>
      {done ? '✓ Copied!' : label}
    </button>
  )
}

// ─── Single logic card ────────────────────────────────────────────────────────
function LogicCard({ logic }) {
  const [showItems, setShowItems] = useState(false)
  const cat = CAT[logic.category] || CAT.advisory
  const isAdvisory = logic.category === 'advisory'

  return (
    <div style={{
      border: `1px solid ${logic.triggered ? cat.border : C.border}`,
      borderRadius: 10, overflow: 'hidden',
      background: C.card, boxShadow: '0 1px 4px rgba(0,0,0,.05)',
      marginBottom: 14,
    }}>
      {/* ── Card header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        padding: '10px 14px',
        background: logic.triggered ? cat.bg : '#f8fafc',
        borderBottom: `1px solid ${logic.triggered ? cat.border : C.border}`,
      }}>
        <span style={{ fontSize: 18 }}>{cat.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <code style={{ fontSize: 13, fontWeight: 800, color: isAdvisory ? C.error : C.text }}>
              {logic.methodName}
            </code>

            {/* Category badge */}
            <span style={{
              padding: '1px 7px', borderRadius: 10,
              background: cat.bg, color: cat.color, border: `1px solid ${cat.border}`,
              fontSize: 10, fontWeight: 700,
            }}>
              {cat.icon} {cat.label}
            </span>

            {/* Triggered / Recommended badge */}
            {logic.triggered ? (
              <span style={{
                padding: '1px 7px', borderRadius: 10,
                background: C.errorBg, color: C.error, border: `1px solid ${C.errorBorder}`,
                fontSize: 10, fontWeight: 700,
              }}>
                ● Detected — implementation required
              </span>
            ) : (
              <span style={{
                padding: '1px 7px', borderRadius: 10,
                background: '#f1f5f9', color: C.muted, border: `1px solid ${C.border}`,
                fontSize: 10, fontWeight: 700,
              }}>
                ○ Recommended — add if applicable
              </span>
            )}
          </div>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: C.sub, lineHeight: 1.5 }}>
            {logic.description}
          </p>
        </div>

        {/* Copy entire snippet */}
        {!isAdvisory && <CopyBtn text={logic.code} label="⧉ Copy Snippet" />}
      </div>

      {/* ── Affected items ── */}
      {logic.affectedItems.length > 0 && (
        <div style={{ padding: '8px 14px', borderBottom: `1px solid ${C.border}`, background: '#fafafa' }}>
          <button
            onClick={() => setShowItems(v => !v)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: 11, color: C.sub,
              display: 'flex', alignItems: 'center', gap: 5, padding: 0,
            }}
          >
            <span style={{
              background: logic.triggered ? cat.bg : '#f1f5f9',
              color: logic.triggered ? cat.color : C.muted,
              border: `1px solid ${logic.triggered ? cat.border : C.border}`,
              padding: '1px 7px', borderRadius: 10, fontSize: 10, fontWeight: 800,
            }}>
              {logic.affectedItems.length} item{logic.affectedItems.length !== 1 ? 's' : ''} affected
            </span>
            <span style={{ fontSize: 10, color: C.muted }}>{showItems ? '▾ collapse' : '▸ expand'}</span>
          </button>

          {showItems && (
            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {logic.affectedItems.map((item, i) => (
                <div key={i} style={{
                  background: C.card, border: `1px solid ${C.border}`,
                  borderRadius: 7, padding: '5px 10px', fontSize: 11,
                  display: 'flex', flexDirection: 'column', gap: 2, minWidth: 160,
                }}>
                  <code style={{ fontWeight: 700, color: C.teal, fontSize: 10 }}>{item.supplierPartID}</code>
                  {item.shortName && <span style={{ color: C.text, fontSize: 11 }}>{item.shortName}</span>}
                  {(item.shopVal || item.xmlVal) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                      {item.shopVal && (
                        <span style={{ background: C.successBg, color: C.success, padding: '1px 5px', borderRadius: 3, fontSize: 10, fontWeight: 700, border: `1px solid ${C.successBorder}` }}>
                          shop: {item.shopVal}
                        </span>
                      )}
                      {item.xmlVal && (
                        <span style={{ background: C.errorBg, color: C.error, padding: '1px 5px', borderRadius: 3, fontSize: 10, fontWeight: 700, border: `1px solid ${C.errorBorder}` }}>
                          xml: {item.xmlVal}
                        </span>
                      )}
                      {item.cwFlag && (
                        <span style={{ background: item.cwFlag?.toLowerCase() === 'yes' ? C.warningBg : '#f1f5f9', color: item.cwFlag?.toLowerCase() === 'yes' ? C.warning : C.muted, padding: '1px 5px', borderRadius: 3, fontSize: 10, fontWeight: 700 }}>
                          CW={item.cwFlag}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Warnings ── */}
      {logic.warnings.length > 0 && (
        <div style={{ padding: '8px 14px', borderBottom: `1px solid ${C.border}` }}>
          {logic.warnings.map((w, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              background: C.warningBg, border: `1px solid ${C.warningBorder}`,
              borderRadius: 6, padding: '6px 10px', marginBottom: i < logic.warnings.length - 1 ? 5 : 0,
              fontSize: 11, color: C.warning, lineHeight: 1.5,
            }}>
              <span style={{ flexShrink: 0, marginTop: 1 }}>⚠</span>
              <span>{w.replace(/^⚠\s*/, '')}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── POOM template changes ── */}
      {logic.poomChanges?.length > 0 && (
        <div style={{ padding: '8px 14px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.info, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 5 }}>
            Required POOM Template Changes
          </div>
          {logic.poomChanges.map((p, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              background: C.infoBg, border: `1px solid ${C.infoBorder}`,
              borderRadius: 6, padding: '6px 10px', marginBottom: i < logic.poomChanges.length - 1 ? 5 : 0,
              fontSize: 11, color: C.info, lineHeight: 1.5,
            }}>
              <span style={{ flexShrink: 0, marginTop: 1 }}>📝</span>
              <span>{p}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Code block ── */}
      <div>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '6px 14px', background: '#1e293b', borderTop: `1px solid #334155`,
        }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            JavaScript Implementation
          </span>
          {!isAdvisory && <CopyBtn text={logic.code} label="⧉ Copy" size="small" />}
        </div>
        <pre
          dangerouslySetInnerHTML={{ __html: highlightJs(logic.code) }}
          style={{
            background: '#1e293b', color: '#e2e8f0',
            padding: '14px 18px', margin: 0,
            fontSize: 12, lineHeight: 1.7, overflowX: 'auto',
            fontFamily: 'ui-monospace, Cascadia Code, Consolas, monospace',
            whiteSpace: 'pre', borderRadius: '0 0 10px 10px',
          }}
        />
      </div>
    </div>
  )
}

// ─── Main panel ───────────────────────────────────────────────────────────────
export default function CatchWeightLogicsPanel({ logics }) {
  const [filter, setFilter] = useState('all') // 'all' | 'triggered' | 'uom' | 'quantity' | 'price' | 'shipping' | 'advisory'

  if (!logics || logics.length === 0) {
    return (
      <div style={{
        background: C.card, border: `1px solid ${C.border}`, borderRadius: 10,
        padding: '32px 24px', textAlign: 'center', color: C.muted, fontSize: 13,
      }}>
        <div style={{ fontSize: 32, marginBottom: 10 }}>⚡</div>
        Upload both <strong>customer_specific.xml</strong> and <strong>shop.json</strong> to generate catch-weight logic recommendations.
      </div>
    )
  }

  // Sentinel: no catch-weight items found after comparing shop.json + customer XML
  if (logics.length === 1 && logics[0]?._noCatchWeights) {
    const count = logics[0].xmlItemCount ?? 0
    return (
      <div style={{
        background: C.card, border: `1px solid ${C.successBorder}`, borderRadius: 10,
        padding: '32px 24px', textAlign: 'center', fontSize: 13,
        maxWidth: 520, margin: '0 auto',
      }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
        <div style={{ fontWeight: 800, fontSize: 15, color: C.success, marginBottom: 8 }}>
          No catch-weight items detected
        </div>
        <div style={{ color: C.muted, lineHeight: 1.7 }}>
          Compared shop.json against {count > 0 ? <><strong>{count}</strong> line item{count !== 1 ? 's' : ''}</> : 'all line items'} in the customer XML —
          none have <code style={{ background: '#f1f5f9', padding: '1px 5px', borderRadius: 3 }}>catchWeightFlag = Yes</code>.
          <br />
          No catch-weight transformation logics are required for this customer.
        </div>
      </div>
    )
  }

  // Sentinel: generator returned early because shop.json is missing
  if (logics.length === 1 && logics[0]?._requiresShopJson) {
    return (
      <div style={{
        background: C.card, border: `1px solid ${C.warningBorder}`, borderRadius: 10,
        padding: '32px 24px', textAlign: 'center', fontSize: 13,
        maxWidth: 520, margin: '0 auto',
      }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>📦</div>
        <div style={{ fontWeight: 800, fontSize: 15, color: C.text, marginBottom: 8 }}>
          shop.json required
        </div>
        <div style={{ color: C.muted, lineHeight: 1.7, marginBottom: 16 }}>
          Catch-weight and UOM logics are generated by cross-referencing the customer XML against the shop catalogue.
          <br />
          Upload your <strong>shop.json</strong> file to enable this analysis.
        </div>
        <div style={{
          display: 'inline-block',
          background: C.warningBg, border: `1px solid ${C.warningBorder}`,
          borderRadius: 8, padding: '8px 18px',
          fontSize: 11, color: C.warning, fontWeight: 700,
        }}>
          ⚠ Upload shop.json in the file input above, then re-run
        </div>
      </div>
    )
  }

  const triggered  = logics.filter(l => l.triggered)
  const categories = [...new Set(logics.map(l => l.category))]

  const visible = filter === 'all'       ? logics
    : filter === 'triggered' ? triggered
    : logics.filter(l => l.category === filter)

  return (
    <div>
      {/* ── Summary bar ── */}
      <div style={{
        background: C.card, border: `1px solid ${C.border}`, borderRadius: 10,
        padding: '14px 18px', marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,.05)',
        display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center',
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.text, marginBottom: 4 }}>
            ⚡ Catch-Weight & Data Transformation Logics
          </div>
          <div style={{ fontSize: 12, color: C.muted }}>
            {triggered.length > 0
              ? `${triggered.length} of ${logics.length} logics detected as required from your XML + shop.json data.`
              : `${logics.length} recommended logics — upload shop.json for item-level detection.`}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {triggered.length > 0 && (
            <div style={{ textAlign: 'center', padding: '8px 16px', background: C.errorBg, border: `1px solid ${C.errorBorder}`, borderRadius: 8 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: C.error }}>{triggered.length}</div>
              <div style={{ fontSize: 10, color: C.error, fontWeight: 700 }}>Required</div>
            </div>
          )}
          {Object.entries(CAT).map(([key, meta]) => {
            const count = logics.filter(l => l.category === key).length
            if (!count) return null
            return (
              <div key={key} style={{ textAlign: 'center', padding: '8px 16px', background: meta.bg, border: `1px solid ${meta.border}`, borderRadius: 8, cursor: 'pointer' }} onClick={() => setFilter(key === filter ? 'all' : key)}>
                <div style={{ fontSize: 22, fontWeight: 800, color: meta.color }}>{count}</div>
                <div style={{ fontSize: 10, color: meta.color, fontWeight: 700 }}>{meta.icon} {meta.label}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Filter pills ── */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        {[
          { key: 'all',      label: `All (${logics.length})` },
          { key: 'triggered',label: `⚡ Required (${triggered.length})` },
          ...categories.map(c => ({ key: c, label: `${CAT[c]?.icon || ''} ${CAT[c]?.label || c} (${logics.filter(l => l.category === c).length})` })),
        ].map(pill => (
          <button
            key={pill.key}
            onClick={() => setFilter(pill.key)}
            style={{
              padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
              border: `1px solid ${filter === pill.key ? C.primary : C.border}`,
              background: filter === pill.key ? C.primary : '#f8fafc',
              color: filter === pill.key ? '#fff' : C.sub,
              cursor: 'pointer', transition: 'all .15s',
            }}
          >
            {pill.label}
          </button>
        ))}
      </div>

      {/* ── Important callout box ── */}
      <div style={{
        background: C.warningBg, border: `1px solid ${C.warningBorder}`, borderRadius: 8,
        padding: '10px 14px', marginBottom: 16, fontSize: 11, color: C.warning, lineHeight: 1.6,
      }}>
        <strong>How to use:</strong> These snippets are starter implementations. Add them to your POOM handler class and call them in the correct order during data transformation.
        All methods access items via <code style={{ background: '#fffbeb', padding: '1px 5px', borderRadius: 3 }}>dataModel[CXML_SUBSTITUTION_CONST.SHOP_ORDER_DETAILS].items</code>.
        {' '}<strong>Verify that all field names match your data model</strong> before deploying — especially <code>numberOfCases</code>, <code>unitPrice</code>, etc.
      </div>

      {/* ── Logic cards ── */}
      {visible.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: C.muted, fontSize: 13 }}>
          No logics in this category.
        </div>
      ) : (
        visible.map(logic => <LogicCard key={logic.id} logic={logic} />)
      )}
    </div>
  )
}

import React, { useState, useEffect, useMemo } from 'react'
import aramarkTemplate from '../sample/aramark_shop.xml?raw'
import { analyzeCustomerXml, generatePoomTemplate, suggestVariablePaths, formatXml, crossReferenceShopJson, getShopItemFields, getShopRootFields, generateCatchWeightLogics } from './utils/xmlUtils'
import CatchWeightLogicsPanel from './CatchWeightLogicsPanel'

const C = {
  bg: '#f1f5f9', card: '#ffffff', border: '#e2e8f0',
  primary: '#2563eb',
  success: '#16a34a', successBg: '#dcfce7', successBorder: '#86efac',
  error:   '#dc2626', errorBg:   '#fee2e2', errorBorder:   '#fca5a5',
  warning: '#b45309', warningBg: '#fef3c7', warningBorder: '#fde68a',
  info:    '#0369a1', infoBg:    '#e0f2fe', infoBorder:    '#7dd3fc',
  purple:  '#7c3aed', purpleBg:  '#f5f3ff', purpleBorder:  '#c4b5fd',
  teal:    '#0d9488', tealBg:    '#f0fdfa', tealBorder:    '#99f6e4',
  review:  '#92400e', reviewBg:  '#fffbeb', reviewBorder:  '#fde68a',
  muted: '#6b7280', text: '#1e293b', sub: '#475569',
}

function UploadZone({ label, accept, hint, value, onChange }) {
  const [drag, setDrag] = useState(false)
  const id = `gz-${label.replace(/\W/g, '')}`
  const handle = f => f && f.text().then(onChange)
  return (
    <div
      onDragOver={e => { e.preventDefault(); setDrag(true) }}
      onDragLeave={() => setDrag(false)}
      onDrop={e => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files[0]) }}
      style={{
        border: `2px dashed ${drag ? C.primary : value ? C.success : C.border}`,
        borderRadius: 10, padding: '18px 16px',
        textAlign: 'center', background: drag ? '#eff6ff' : value ? '#f0fdf4' : '#fafafa',
        transition: 'all .2s'
      }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 3 }}>{label}</div>
      <code style={{ fontSize: 10, color: C.muted, background: '#f1f5f9', padding: '1px 5px', borderRadius: 3 }}>{accept}</code>
      {hint && <div style={{ fontSize: 10, color: C.muted, marginTop: 3, marginBottom: 6 }}>{hint}</div>}
      <div style={{ marginTop: 8 }}>
        <input type="file" accept={accept} id={id} style={{ display: 'none' }} onChange={e => handle(e.target.files[0])} />
        <label htmlFor={id} style={{
          display: 'inline-block', padding: '5px 14px',
          background: value ? C.success : C.primary, color: '#fff',
          borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 700
        }}>
          {value ? '✓ Loaded — Change' : 'Browse / Drop'}
        </label>
      </div>
    </div>
  )
}

function Badge({ v = 'neutral', children }) {
  const map = {
    ok:      { bg: C.successBg, color: C.success, border: C.successBorder },
    error:   { bg: C.errorBg,   color: C.error,   border: C.errorBorder   },
    warning: { bg: C.warningBg, color: C.warning,  border: C.warningBorder },
    info:    { bg: C.infoBg,    color: C.info,     border: C.infoBorder    },
    extra:   { bg: C.purpleBg,  color: C.purple,   border: C.purpleBorder  },
    teal:    { bg: C.tealBg,    color: C.teal,     border: C.tealBorder    },
    review:  { bg: C.reviewBg,  color: C.review,   border: C.reviewBorder  },
    neutral: { bg: '#f1f5f9',   color: C.sub,      border: C.border        },
  }
  const s = map[v] || map.neutral
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '2px 8px',
      borderRadius: 4, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
      background: s.bg, color: s.color, border: `1px solid ${s.border}`
    }}>
      {children}
    </span>
  )
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', gap: 10, padding: '5px 0', borderBottom: `1px solid #f1f5f9`, alignItems: 'baseline' }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, minWidth: 160, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 12, color: C.text, fontFamily: 'monospace', wordBreak: 'break-all' }}>
        {value || <em style={{ color: C.muted }}>—</em>}
      </span>
    </div>
  )
}

function SCard({ title, icon, children, accent }) {
  const accentColor = { purple: C.purple, teal: C.teal, info: C.info, warn: C.warning, review: C.review }[accent] || C.sub
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden', marginBottom: 14 }}>
      <div style={{ padding: '10px 16px', background: '#f8fafc', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 14 }}>{icon}</span>
        <span style={{ fontWeight: 700, fontSize: 13, color: accentColor }}>{title}</span>
      </div>
      <div style={{ padding: '14px 16px' }}>{children}</div>
    </div>
  )
}

function CheckRow({ name, checked, onChange, isNew }) {
  return (
    <label style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px',
      borderRadius: 7, cursor: 'pointer', marginBottom: 4,
      background: checked ? (isNew ? C.tealBg : '#f8fafc') : '#fafafa',
      border: `1px solid ${checked ? (isNew ? C.tealBorder : C.border) : '#f1f5f9'}`,
      transition: 'all .15s'
    }}>
      <input type="checkbox" checked={checked} onChange={onChange} style={{ width: 15, height: 15, cursor: 'pointer', accentColor: isNew ? C.teal : C.primary }} />
      <code style={{ fontSize: 12, fontWeight: 700, color: isNew ? C.teal : C.text, flex: 1 }}>{name}</code>
      {isNew && <Badge v="teal">new</Badge>}
    </label>
  )
}

// ─── Spinner (JS-driven, no @keyframes needed) ───────────────────────────────────
function Spinner({ size = 26, thick = 3, color = C.primary }) {
  const [deg, setDeg] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setDeg(d => (d + 9) % 360), 16)
    return () => clearInterval(t)
  }, [])
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      border: `${thick}px solid ${color}28`,
      borderTop: `${thick}px solid ${color}`,
      transform: `rotate(${deg}deg)`, flexShrink: 0,
    }} />
  )
}

// ─── StepLoader ──────────────────────────────────────────────────────────────────
function StepLoader({ steps, title, subtitle, spinColor = C.primary, compact = false }) {
  const [step,  setStep]  = useState(0)
  const [pulse, setPulse] = useState(true)
  useEffect(() => {
    setStep(0)
    const stepT  = setInterval(() => setStep(s => s < steps.length - 1 ? s + 1 : s), 420)
    const pulseT = setInterval(() => setPulse(p => !p), 550)
    return () => { clearInterval(stepT); clearInterval(pulseT) }
  }, [title, steps.length])

  if (compact) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px', background: C.infoBg,
        border: `1px solid ${C.infoBorder}`, borderRadius: 9, marginBottom: 12,
      }}>
        <Spinner size={18} thick={2} color={C.info} />
        <span style={{ fontSize: 12, fontWeight: 700, color: C.info }}>{steps[step]}…</span>
        <span style={{ fontSize: 11, color: C.info, opacity: pulse ? 0.9 : 0.3, transition: 'opacity .3s', marginLeft: 'auto' }}>processing</span>
      </div>
    )
  }

  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`, borderRadius: 14,
      padding: '36px 32px', marginBottom: 16, boxShadow: '0 4px 16px rgba(0,0,0,.07)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22,
    }}>
      {/* Outer ring + spinner */}
      <div style={{ position: 'relative', width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: `${spinColor}12`, border: `1px solid ${spinColor}22` }} />
        <Spinner size={40} thick={4} color={spinColor} />
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 5 }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: C.muted, maxWidth: 380 }}>{subtitle}</div>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, width: '100%', maxWidth: 400 }}>
        {steps.map((s, i) => {
          const done   = i < step
          const active = i === step
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 13px', borderRadius: 8,
              background: done ? C.successBg : active ? C.infoBg : '#f8fafc',
              border: `1px solid ${done ? C.successBorder : active ? C.infoBorder : C.border}`,
              opacity: i > step + 1 ? 0.45 : 1,
              transition: 'all .3s',
            }}>
              {done ? (
                <span style={{ width: 18, textAlign: 'center', fontSize: 13, color: C.success, fontWeight: 700 }}>✓</span>
              ) : active ? (
                <div style={{ width: 18, height: 18, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Spinner size={14} thick={2} color={C.info} />
                </div>
              ) : (
                <span style={{ width: 18, textAlign: 'center', fontSize: 9, color: C.muted }}>&#9679;</span>
              )}
              <span style={{
                fontSize: 12, flex: 1,
                fontWeight: done ? 600 : active ? 700 : 400,
                color: done ? C.success : active ? C.info : C.muted,
              }}>{s}</span>
              {active && (
                <span style={{ fontSize: 10, color: C.info, opacity: pulse ? 1 : 0.2, transition: 'opacity .3s' }}>…</span>
              )}
              {done && (
                <span style={{ fontSize: 10, color: C.success }}>done</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Tabs({ tabs, active, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 2, borderBottom: `2px solid ${C.border}`, marginBottom: 16 }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)} style={{
          padding: '7px 14px', border: 'none', cursor: 'pointer',
          fontWeight: active === t.id ? 700 : 500,
          color: active === t.id ? C.primary : C.muted,
          background: 'transparent',
          borderBottom: `2px solid ${active === t.id ? C.primary : 'transparent'}`,
          marginBottom: -2, fontSize: 13
        }}>
          {t.label}
          {t.count != null && t.count > 0 && (
            <span style={{
              marginLeft: 6, background: active === t.id ? C.primary : '#e2e8f0',
              color: active === t.id ? '#fff' : C.muted,
              borderRadius: 10, padding: '1px 6px', fontSize: 10, fontWeight: 700
            }}>{t.count}</span>
          )}
        </button>
      ))}
    </div>
  )
}

function VariableReviewCard({ extraExtrinsics, variablePaths, shopItemFields, shopRootFields, onChange }) {
  if (!extraExtrinsics.length) return null
  return (
    <SCard title="Review New Handlebars Variable Paths" icon="⚠️" accent="review">
      {/* Scoping rules explainer — three tiers */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
        <div style={{ background: '#f0fdf4', border: `1px solid ${C.successBorder}`, borderRadius: 7, padding: '10px 12px', fontSize: 11, color: C.text, lineHeight: 1.7 }}>
          <div style={{ fontWeight: 800, color: C.success, marginBottom: 4, fontSize: 12 }}>📦 In <code style={{ background: '#dcfce7', padding: '1px 4px', borderRadius: 3 }}>items[]</code> — direct</div>
          Field exists in shop.json <code>items[0]</code>. Accessed directly inside <code>{'{{#each}}'}</code> loop:
          <div style={{ fontFamily: 'monospace', background: '#1e293b', color: '#6ee7b7', padding: '5px 8px', borderRadius: 4, marginTop: 6, fontSize: 11 }}>{'{{fieldName}}'}</div>
        </div>
        <div style={{ background: '#eff6ff', border: `1px solid ${C.infoBorder}`, borderRadius: 7, padding: '10px 12px', fontSize: 11, color: C.text, lineHeight: 1.7 }}>
          <div style={{ fontWeight: 800, color: C.info, marginBottom: 4, fontSize: 12 }}>🌐 Root-level — <code style={{ background: '#dbeafe', padding: '1px 4px', borderRadius: 3 }}>@root</code></div>
          Field is in shop.json but <strong>not</strong> inside <code>items[]</code>. Needs <code>@root</code> to escape loop scope:
          <div style={{ fontFamily: 'monospace', background: '#1e293b', color: '#fbbf24', padding: '5px 8px', borderRadius: 4, marginTop: 6, fontSize: 11 }}>{'{{@root.ShopOrderDetails.field}}'}</div>
        </div>
        <div style={{ background: '#f8fafc', border: `1px solid ${C.border}`, borderRadius: 7, padding: '10px 12px', fontSize: 11, color: C.text, lineHeight: 1.7 }}>
          <div style={{ fontWeight: 800, color: C.muted, marginBottom: 4, fontSize: 12 }}>🔤 Not in shop.json — placeholder</div>
          Field not found anywhere in shop.json. Used as a direct Handlebars placeholder by its name:
          <div style={{ fontFamily: 'monospace', background: '#1e293b', color: '#94a3b8', padding: '5px 8px', borderRadius: 4, marginTop: 6, fontSize: 11 }}>{'{{FieldName}}'}</div>
        </div>
      </div>
      <div style={{ background: C.reviewBg, border: `1px solid ${C.reviewBorder}`, borderRadius: 7, padding: '8px 12px', marginBottom: 14, fontSize: 11, color: C.review }}>
        <strong>Action required:</strong> Paths are auto-suggested from your shop.json structure.
        {' '}<strong>Verify each one matches your actual data model</strong> before downloading.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {extraExtrinsics.map(name => {
          const path     = variablePaths[name] ?? ''
          const camel    = name.charAt(0).toLowerCase() + name.slice(1)
          const isRoot   = path.startsWith('{{@root')
          const inItems  = shopItemFields.has(name) || shopItemFields.has(camel)
          const inRootSh = shopRootFields.has(name)  || shopRootFields.has(camel)
          // Scope: item > root > direct (not in shop.json)
          const isItem   = !isRoot && inItems
          const isDirect = !isRoot && !isItem  // may be root-scope or not-in-shop placeholder
          /* colour-code: green=item, blue=@root, slate=direct placeholder */
          const borderC  = isItem ? C.successBorder : isRoot ? C.infoBorder : C.border
          const bgC      = isItem ? '#f0fdf4'        : isRoot ? '#eff6ff'    : '#f8fafc'
          const txtC     = isItem ? '#14532d'        : isRoot ? '#1e3a5f'    : C.text
          return (
            <div key={name} style={{
              display: 'grid', gridTemplateColumns: '220px 1fr',
              alignItems: 'center', gap: 10, padding: '8px 10px',
              background: '#fffbeb', border: `1.5px solid ${C.reviewBorder}`,
              borderRadius: 8
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <code style={{ fontSize: 12, fontWeight: 700, color: C.teal }}>{name}</code>
                  {isItem && (
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 10, background: C.successBg, color: C.success, border: `1px solid ${C.successBorder}` }}>
                      📦 items[]
                    </span>
                  )}
                  {isRoot && (
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 10, background: C.infoBg, color: C.info, border: `1px solid ${C.infoBorder}` }}>
                      🌐 @root
                    </span>
                  )}
                  {isDirect && !inRootSh && (
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 10, background: '#f1f5f9', color: C.muted, border: `1px solid ${C.border}` }}>
                      🔤 direct
                    </span>
                  )}
                  {isDirect && inRootSh && (
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 10, background: C.infoBg, color: C.info, border: `1px solid ${C.infoBorder}` }}>
                      🌐 @root
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 10, color: C.muted }}>
                  {`<Extrinsic name="${name}">…</Extrinsic>`}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, color: C.muted, flexShrink: 0 }}>Value →</span>
                <input
                  value={path}
                  onChange={e => onChange(name, e.target.value)}
                  spellCheck={false}
                  placeholder={`{{${name}}}`}
                  style={{
                    flex: 1, fontFamily: 'monospace', fontSize: 12,
                    padding: '5px 10px',
                    border: `1.5px solid ${borderC}`,
                    borderRadius: 6,
                    background: bgC,
                    color: txtC,
                    outline: 'none',
                  }}
                />
                <Badge v="review">verify</Badge>
              </div>
            </div>
          )
        })}
      </div>
    </SCard>
  )
}

function XmlPreview({ text }) {
  if (!text) return null
  const highlighted = text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\{\{#[^}]+\}\}/g, m => `<span style="color:#a78bfa;font-weight:700">${m}</span>`)
    .replace(/\{\{\/[^}]+\}\}/g, m => `<span style="color:#a78bfa;font-weight:700">${m}</span>`)
    .replace(/\{\{\{[^}]+\}\}\}/g, m => `<span style="color:#34d399;font-weight:700">${m}</span>`)
    .replace(/\{\{@root\.[^}]+\}\}/g, m => `<span style="color:#fbbf24;font-weight:700;text-decoration:underline dotted">${m}</span>`)
    .replace(/\{\{[^}]+\}\}/g, m => `<span style="color:#6ee7b7">${m}</span>`)
    .replace(/&lt;(\/?)([A-Za-z][A-Za-z0-9]*)/g, (_, slash, name) =>
      `&lt;<span style="color:#93c5fd">${slash}${name}</span>`)
    .replace(/\s([A-Za-z:][A-Za-z0-9:_-]*)=&quot;([^&]*)&quot;/g,
      (_, k, v) => ` <span style="color:#fca5a5">${k}</span>=<span style="color:#fcd34d">&quot;${v}&quot;</span>`)

  return (
    <pre
      dangerouslySetInnerHTML={{ __html: highlighted }}
      style={{
        background: '#1e293b', color: '#e2e8f0',
        padding: '16px', borderRadius: 8, overflowX: 'auto', overflowY: 'auto',
        maxHeight: 560, fontSize: 11.5, lineHeight: 1.6,
        fontFamily: 'ui-monospace, Cascadia Code, Consolas, monospace',
        margin: 0, border: `1px solid #334155`
      }}
    />
  )
}

// ── Diff helpers ──────────────────────────────────────────────────────────────

function computeLineDiff(leftText, rightText) {
  const L = (leftText || '').split('\n')
  const R = (rightText || '').split('\n')
  const MAX = 600
  const Lc = L.slice(0, MAX), Rc = R.slice(0, MAX)
  const nc = Lc.length, mc = Rc.length
  const dp = Array.from({ length: nc + 1 }, () => Array(mc + 1).fill(0))
  for (let i = 1; i <= nc; i++)
    for (let j = 1; j <= mc; j++)
      dp[i][j] = Lc[i - 1].trimEnd() === Rc[j - 1].trimEnd()
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1])
  const leftOut = [], rightOut = []
  let i = nc, j = mc
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && Lc[i - 1].trimEnd() === Rc[j - 1].trimEnd()) {
      leftOut.unshift({ type: 'same', text: Lc[i - 1] })
      rightOut.unshift({ type: 'same', text: Rc[j - 1] })
      i--; j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      leftOut.unshift({ type: 'empty', text: '' })
      rightOut.unshift({ type: 'added', text: Rc[j - 1] })
      j--
    } else {
      leftOut.unshift({ type: 'removed', text: Lc[i - 1] })
      rightOut.unshift({ type: 'empty', text: '' })
      i--
    }
  }
  for (let k = MAX; k < L.length; k++) {
    leftOut.push({ type: 'same', text: L[k] })
    rightOut.push({ type: 'same', text: R[k] })
  }
  return { leftOut, rightOut }
}

function DiffPane({ lines, maxHeight, style }) {
  const BG = { same: 'transparent', removed: 'rgba(220,38,38,.20)', added: 'rgba(22,163,74,.20)', empty: 'rgba(255,255,255,.02)' }
  const FG = { same: '#e2e8f0', removed: '#fca5a5', added: '#86efac', empty: '#334155' }
  const MKFG = { same: '#475569', removed: '#ef4444', added: '#22c55e', empty: '#334155' }
  const MK = { same: ' ', removed: '−', added: '+', empty: ' ' }
  let ln = 0
  return (
    <pre style={{
      margin: 0, padding: '8px 0', background: '#1e293b',
      fontFamily: 'ui-monospace, Cascadia Code, Consolas, monospace',
      fontSize: 11, lineHeight: 1.6, overflowX: 'auto', overflowY: 'auto',
      maxHeight: maxHeight || 560, border: '1px solid #334155', borderRadius: 8,
      ...(style || {})
    }}>
      {lines.map((l, idx) => {
        if (l.type !== 'empty') ln++
        return (
          <div key={idx} style={{ display: 'flex', background: BG[l.type], paddingLeft: 4, paddingRight: 8 }}>
            <span style={{ minWidth: 30, textAlign: 'right', fontSize: 10, color: '#475569', userSelect: 'none', paddingRight: 4, flexShrink: 0 }}>
              {l.type !== 'empty' ? ln : ''}
            </span>
            <span style={{ minWidth: 14, textAlign: 'center', fontSize: 11, color: MKFG[l.type], userSelect: 'none', flexShrink: 0, fontWeight: 700 }}>
              {MK[l.type]}
            </span>
            <span style={{ color: FG[l.type], whiteSpace: 'pre', flex: 1 }}>
              {l.type === 'empty' ? '\u00a0' : (l.text || ' ')}
            </span>
          </div>
        )
      })}
    </pre>
  )
}

// ── Preview-tab helpers ─────────────────────────────────────────────────────

// Collapse <Tag attr="x"></Tag> → <Tag attr="x"/> for elements with no content
function collapseEmptyTags(xml) {
  return xml.replace(/<([A-Za-z][A-Za-z0-9]*)(\s[^>]*)?><\/\1>/g, (_, tag, attrs) => `<${tag}${attrs || ''}/>`)
}

function _sampleRI(raw, base) {
  if (!raw) return ''
  const lines = raw.trim().split('\n')
  if (lines.length <= 1) return '\t'.repeat(base) + raw.trim()
  const last = [...lines].reverse().find(l => l.trim()) || ''
  const orig = (last.match(/^(\t*)/) || ['', ''])[1].length
  return lines.map((l, i) => !l.trim() ? '' : i === 0 ? '\t'.repeat(base) + l.trim() : '\t'.repeat(base) + l.slice(orig)).filter(l => l !== '').join('\n')
}

// Returns up to 3 representative items: one Normal (non-CW, non-EA), one EA (non-CW), one CW.
// Deduplicates by index so the same item is never shown twice.
function pickSampleItems(matrix) {
  if (!matrix?.length) return []
  const isEA = m => (m.xmlUom || '').toUpperCase() === 'EA' || (m.extValues?.orderedUnitOfMeasure || '').toUpperCase() === 'EA'
  const isCW = m => m.catchWeightFlag?.toLowerCase() === 'yes'
  const used = new Set()
  const picks = []
  const add = (idx, label) => { used.add(idx); picks.push({ item: matrix[idx], idx, label }) }
  const ni = matrix.findIndex(m => !isCW(m) && !isEA(m))
  if (ni !== -1) add(ni, 'Normal Item')
  const ei = matrix.findIndex((m, i) => !isCW(m) && isEA(m) && !used.has(i))
  if (ei !== -1) add(ei, 'EA Item')
  const ci = matrix.findIndex((m, i) => isCW(m) && !used.has(i))
  if (ci !== -1) add(ci, 'Catch-Weight Item')
  // fallback: nothing matched (e.g. only CW+EA items), just show first
  if (!picks.length) add(0, 'Item')
  return picks
}

function buildCustomerXmlSample(analysis) {
  if (!analysis?.itemMatrix?.length) return ''
  const T = n => '\t'.repeat(n)
  const samples = pickSampleItems(analysis.itemMatrix).map(({ item, label }) => ({ ...item, _label: label }))
  const L = []
  L.push(`<cXML payloadID="${analysis.payloadID}" timestamp="…" version="${analysis.version}" xml:lang="${analysis.xmlLang}">`)
  L.push(T(1) + '<Header>')
  for (const [key, label] of [['from', 'From'], ['to', 'To'], ['sender', 'Sender']]) {
    const c = analysis.credentials?.[key] ?? {}
    L.push(T(2) + `<${label}>`)
    L.push(T(3) + `<Credential domain="${c.domain ?? ''}">`)
    L.push(T(4) + `<Identity>${c.identity ?? ''}</Identity>`)
    if (key === 'sender') L.push(T(4) + '<SharedSecret/>')
    L.push(T(3) + '</Credential>')
    if (key === 'sender' && analysis.userAgent) L.push(T(3) + `<UserAgent>${analysis.userAgent}</UserAgent>`)
    L.push(T(2) + `</${label}>`)
  }
  L.push(T(1) + '</Header>')
  L.push(T(1) + `<Message deploymentMode="${analysis.deploymentMode}">`)
  L.push(T(2) + '<PunchOutOrderMessage>')
  L.push(T(3) + `<BuyerCookie>${analysis.buyerCookie}</BuyerCookie>`)
  L.push(T(3) + `<PunchOutOrderMessageHeader operationAllowed="${analysis.operationAllowed}">`)
  L.push(T(4) + '<Total>')
  L.push(T(5) + `<Money currency="${analysis.totalCurrency}">${analysis.totalValue}</Money>`)
  L.push(T(4) + '</Total>')
  for (const tag of (analysis.pomExtraFields ?? [])) {
    const raw = analysis.pomExtraFieldsXml?.[tag]
    L.push(raw ? _sampleRI(raw, 4) : T(4) + `<${tag}/>`)
  }
  L.push(T(3) + '</PunchOutOrderMessageHeader>')
  for (const item of samples) {
    L.push(T(3) + `<!-- ── ${item._label} ── -->`)
    L.push(T(3) + `<ItemIn lineNumber="${item.lineNumber}" quantity="${item.quantity}">`)
    L.push(T(4) + '<ItemID>')
    L.push(T(5) + `<SupplierPartID>${item.supplierPartID}</SupplierPartID>`)
    L.push(T(4) + '</ItemID>')
    L.push(T(4) + '<ItemDetail>')
    L.push(T(5) + '<UnitPrice>')
    L.push(T(6) + `<Money currency="USD">${item.unitPrice}</Money>`)
    L.push(T(5) + '</UnitPrice>')
    L.push(T(5) + '<Description xml:lang="EN">')
    L.push(T(6) + `<ShortName>${item.shortName}</ShortName>`)
    L.push(T(5) + '</Description>')
    if (item.xmlUom) L.push(T(5) + `<UnitOfMeasure>${item.xmlUom}</UnitOfMeasure>`)
    for (const [name, val] of Object.entries(item.extValues ?? {})) {
      L.push(val !== '' ? T(5) + `<Extrinsic name="${name}">${val}</Extrinsic>` : T(5) + `<Extrinsic name="${name}"/>`)    }
    L.push(T(4) + '</ItemDetail>')
    L.push(T(3) + '</ItemIn>')
  }
  if (analysis.itemCount > samples.length) {
    const n = analysis.itemCount - samples.length
    L.push(T(3) + `<!-- … ${n} more item${n > 1 ? 's' : ''} not shown … -->`)
  }
  L.push(T(2) + '</PunchOutOrderMessage>')
  L.push(T(1) + '</Message>')
  L.push('</cXML>')
  return collapseEmptyTags(L.join('\n'))
}

function computeSuggestions(analysis, shopCrossRef, cwLogics, pendingReview, selectedExtra, selectedPom, selectedCatchWeight) {
  if (!analysis) return []
  const out = []
  const diffItems = shopCrossRef?.itemAlignment?.filter(r => r.diffs?.length > 0) ?? []
  if (diffItems.length)
    out.push({ type: 'warning', icon: '🔄', title: `${diffItems.length} item${diffItems.length > 1 ? 's' : ''} have field differences vs shop.json`, body: 'UOM, price or quantity mismatches detected. Review Analysis → Cross-check.', action: 'config' })
  const trig = (cwLogics ?? []).filter(l => l.triggered && !l._noCatchWeights)
  if (trig.length)
    out.push({ type: 'review', icon: '⚡', title: `${trig.length} CW transform logic${trig.length > 1 ? 's' : ''} required`, body: 'Catch-weight runtime transformations needed. See ⚡ CW & Transform Logics tab.', action: 'cwlogics' })
  if (pendingReview?.length)
    out.push({ type: 'warning', icon: '⚠️', title: `${pendingReview.length} Handlebars path${pendingReview.length > 1 ? 's' : ''} need verification`, body: 'Auto-suggested paths may not match your data model.', action: 'config' })
  const cwCount = analysis.itemMatrix?.filter(m => m.catchWeightFlag?.toLowerCase() === 'yes').length ?? 0
  if (cwCount > 0 && selectedCatchWeight.size === 0)
    out.push({ type: 'warning', icon: '⚡', title: `${cwCount} CW item${cwCount > 1 ? 's' : ''} detected but no CW conditionals enabled`, body: 'Consider enabling CW-conditional Extrinsics in the Analysis tab.', action: 'config' })
  const notIncluded = analysis.extraExtrinsics?.filter(n => !selectedExtra.has(n)) ?? []
  if (notIncluded.length)
    out.push({ type: 'info', icon: '⚙️', title: `${notIncluded.length} extra Extrinsic${notIncluded.length > 1 ? 's' : ''} not included in template`, body: `Excluded: ${notIncluded.slice(0, 4).join(', ')}${notIncluded.length > 4 ? ', …' : ''}. Enable in Analysis tab.`, action: 'config' })
  // Phantom / hardcoded metadata items
  const phantomCount = analysis.phantomItems?.length ?? 0
  if (phantomCount > 0)
    out.push({ type: 'review', icon: '📌', title: `${phantomCount} hardcoded metadata item${phantomCount > 1 ? 's' : ''} detected & added to template`, body: `Found ${phantomCount} non-product item${phantomCount > 1 ? 's' : ''} (empty SupplierPartAuxiliaryID, zero price, blank lineNumber). These have been hardcoded after {{/each}} in the template with their literal values. Review their Description text and adjust if needed.`, action: 'preview' })
  const hasPom = new Set([...( analysis.pomExtraFields ?? []), ...selectedPom])
  // Only remind about POM fields that ARE in customer XML but not yet selected
  for (const [tag, icon, body] of [
    ['Shipping', '📦', 'Detected in customer XML but not included in template.'],
    ['ShipTo',   '📍', 'Detected in customer XML but not included in template.'],
    ['Tax',      '🧾', 'Detected in customer XML but not included in template.'],
  ]) {
    if ((analysis.pomExtraFields ?? []).includes(tag) && !selectedPom.has(tag))
      out.push({ type: 'info', icon, title: `"${tag}" block not included`, body, action: 'preview' })
  }
  return out
}

export default function GenerateSection() {
  const [customerXml,   setCustomerXml]   = useState('')
  const [shopJsonText,  setShopJsonText]  = useState('')
  const [shopCrossRef,  setShopCrossRef]  = useState(null)
  const [shopItemFields,setShopItemFields]= useState(new Set())
  const [shopRootFields, setShopRootFields]= useState(new Set())
  const [analysis,      setAnalysis]      = useState(null)
  const [selectedExtra, setSelectedExtra] = useState(new Set())
  const [selectedPom,   setSelectedPom]   = useState(new Set())
  const [variablePaths, setVariablePaths] = useState({})
  const [selectedCatchWeight, setSelectedCatchWeight] = useState(new Set())
  const [customerName,  setCustomerName]  = useState('')
  const [activeTab,     setActiveTab]     = useState('config')
  const [copyDone,      setCopyDone]      = useState(false)
  const [formatMode,    setFormatMode]    = useState(true) // true = formatted
  const [analysing,        setAnalysing]        = useState(false)
  const [crossRefAnalysing,setCrossRefAnalysing] = useState(false)
  const [previewMode,      setPreviewMode]       = useState('preview') // 'preview' | 'edit' | 'compare'
  const [editedTemplate,   setEditedTemplate]    = useState('')
  const [editDirty,        setEditDirty]         = useState(false)
  const [pomCustomizeOpen, setPomCustomizeOpen]  = useState(false)
  const [newPomField,      setNewPomField]       = useState('')
  const [compareRightEdit, setCompareRightEdit]  = useState(false)
  const [compareFullscreen, setCompareFullscreen] = useState(false)
  const [compareDiffMode,   setCompareDiffMode]   = useState(false)

  const effectiveTemplate = aramarkTemplate

  useEffect(() => {
    if (!customerXml) { setAnalysis(null); setShopCrossRef(null); setVariablePaths({}); setAnalysing(false); return }
    setTimeout(() => {
      try {
        const a = analyzeCustomerXml(customerXml, effectiveTemplate)
        setAnalysis(a)
        setSelectedExtra(new Set(a.extraExtrinsics))
        setSelectedPom(new Set(a.pomExtraFields))
        setVariablePaths(suggestVariablePaths(a.extraExtrinsics, shopItemFields, shopRootFields))
        setSelectedCatchWeight(new Set(a.catchWeightOnlyExtrinsics))
      } catch (e) {
        console.error('analyzeCustomerXml error:', e)
      } finally {
        setAnalysing(false)
      }
    }, 200)
  }, [customerXml])

  // Cross-reference shop.json whenever it or the XML analysis changes
  useEffect(() => {
    if (!shopJsonText || !analysis) { setShopCrossRef(null); setCrossRefAnalysing(false); return }
    setTimeout(() => {
      try {
        // Extract item-level and root-level fields then re-suggest variable paths
        const fields = getShopItemFields(shopJsonText)
        const rootF  = getShopRootFields(shopJsonText)
        setShopItemFields(fields)
        setShopRootFields(rootF)
        setVariablePaths(suggestVariablePaths(analysis.extraExtrinsics, fields, rootF))
        const cr = crossReferenceShopJson(shopJsonText, analysis)
        setShopCrossRef(cr)
        // Do NOT merge suggestedCatchWeightExtrinsics into selectedCatchWeight.
        // The CW-conditional template logic must be driven ONLY by
        // analysis.catchWeightOnlyExtrinsics (fields absent/empty in CW=No items
        // per actual XML data), not by UOM-mismatch hints from shop.json.
      } catch (e) { console.error('crossReferenceShopJson error:', e) }
      finally { setCrossRefAnalysing(false) }
    }, 200)
  }, [shopJsonText, analysis])

  const cwLogics = useMemo(() => {
    if (!analysis) return []
    return generateCatchWeightLogics(analysis, shopJsonText, customerXml)
  }, [analysis, shopJsonText, customerXml])

  const generatedTemplate = useMemo(() => {
    if (!analysis || !effectiveTemplate) return ''
    try {
      return generatePoomTemplate(effectiveTemplate, analysis, {
        includeExtrinsics:       [...selectedExtra],
        includePomFields:        [...selectedPom],
        variablePaths,
        catchWeightConditionals: [...selectedCatchWeight],
      })
    } catch (e) { console.error(e); return '' }
  }, [analysis, selectedExtra, selectedPom, variablePaths, selectedCatchWeight])

  // Sync edit buffer whenever the auto-generated template changes
  useEffect(() => {
    setEditedTemplate(generatedTemplate)
    setEditDirty(false)
  }, [generatedTemplate])

  const resetAll = () => {
    setCustomerXml('')
    setShopJsonText('')
    setShopCrossRef(null)
    setShopItemFields(new Set())
    setShopRootFields(new Set())
    setAnalysis(null)
    setSelectedExtra(new Set())
    setSelectedPom(new Set())
    setVariablePaths({})
    setSelectedCatchWeight(new Set())
    setCustomerName('')
    setActiveTab('config')
    setCopyDone(false)
    setFormatMode(true)
    setAnalysing(false)
    setCrossRefAnalysing(false)
    setPreviewMode('preview')
    setEditedTemplate('')
    setEditDirty(false)
    setPomCustomizeOpen(false)
    setNewPomField('')
    setCompareRightEdit(false)
    setCompareFullscreen(false)
    setCompareDiffMode(false)
  }

  const toggle = (setter, name) => setter(prev => {
    const next = new Set(prev)
    next.has(name) ? next.delete(name) : next.add(name)
    return next
  })

  const updatePath = (name, val) =>
    setVariablePaths(prev => ({ ...prev, [name]: val }))

  const downloadTemplate = () => {
    if (!generatedTemplate) return
    const slug = (customerName.trim() || 'customer').toLowerCase().replace(/\s+/g, '_')
    const src  = (previewMode === 'edit' && editDirty) ? editedTemplate : generatedTemplate
    const content = formatMode ? formatXml(src) : src
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([content], { type: 'text/xml' })),
      download: `${slug}_shop.xml`
    })
    a.click(); URL.revokeObjectURL(a.href)
  }

  const copyTemplate = () => {
    const src  = (previewMode === 'edit' && editDirty) ? editedTemplate : generatedTemplate
    const text = formatMode ? formatXml(src) : src
    navigator.clipboard?.writeText(text).then(() => {
      setCopyDone(true); setTimeout(() => setCopyDone(false), 2000)
    })
  }

  const pendingReview = analysis?.extraExtrinsics.filter(n => selectedExtra.has(n)) ?? []

  // Preview-tab derived values
  const effectiveTemplateText = (previewMode === 'edit' && editDirty) ? editedTemplate : generatedTemplate
  const effectivePreviewText  = formatMode ? formatXml(effectiveTemplateText) : effectiveTemplateText
  const customerXmlSample     = useMemo(() => buildCustomerXmlSample(analysis), [analysis])
  const sampleItemLabels       = useMemo(() => pickSampleItems(analysis?.itemMatrix ?? []).map(p => p.label), [analysis])
  const suggestions           = computeSuggestions(analysis, shopCrossRef, cwLogics, pendingReview, selectedExtra, selectedPom, selectedCatchWeight)
  const diffResult            = useMemo(() =>
    (compareDiffMode && customerXmlSample && effectivePreviewText)
      ? computeLineDiff(customerXmlSample, effectivePreviewText)
      : null,
    [compareDiffMode, customerXmlSample, effectivePreviewText]
  )

  // Shop.json items matching the sample items shown in the compare panes
  const fsShopItems = useMemo(() => {
    if (!shopJsonText || !analysis?.itemMatrix?.length) return []
    let shopData
    try { shopData = JSON.parse(shopJsonText) } catch { return [] }
    const shopItems = shopData.items || []
    return pickSampleItems(analysis.itemMatrix)
      .filter(({ idx }) => shopItems[idx])
      .map(({ item, idx, label }) => ({ label, xmlItem: item, shopItem: shopItems[idx] }))
  }, [shopJsonText, analysis])

  return (
    <div>
      <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, padding: 20, marginBottom: 20, boxShadow: '0 1px 4px rgba(0,0,0,.05)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Generate POOM Template</h2>
          {(customerXml || shopJsonText || analysis) && (
            <button
              onClick={resetAll}
              style={{
                padding: '5px 13px', border: `1px solid ${C.errorBorder}`, borderRadius: 6,
                cursor: 'pointer', fontWeight: 700, fontSize: 11,
                color: C.error, background: C.errorBg, flexShrink: 0,
              }}
            >
              ↺ Reset All
            </button>
          )}
        </div>
        <p style={{ margin: '0 0 14px', fontSize: 12, color: C.muted }}>
          Upload your <strong>customer_specific.xml</strong> and <strong>shop.json</strong> (required) together.
          The tool resolves Handlebars variable scopes from shop.json, compares UOM &amp; pricing, flags catch-weight logic, and
          generates an updated Handlebars template based on the built-in <code>aramark_shop.xml</code>.
        </p>

        <div style={{ marginBottom: 14, fontSize: 11, color: C.info, background: C.infoBg, border: `1px solid ${C.infoBorder}`, borderRadius: 7, padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>📄</span>
          <span>Base template: <strong>aramark_shop.xml</strong> — bundled automatically, no upload required.</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, maxWidth: 780 }}>
          <UploadZone
            label="Customer Specific XML"
            accept=".xml"
            hint="e.g. customer_specific.xml — actual order XML"
            value={customerXml}
            onChange={text => { setAnalysing(true); setCustomerXml(text); }}
          />
          <UploadZone
            label="shop.json ✱"
            accept=".json"
            hint="Required — resolves variable scopes, UOM, pricing & catch-weight logic"
            value={shopJsonText}
            onChange={text => { setCrossRefAnalysing(true); setShopJsonText(text); }}
          />
        </div>
      </div>

      {analysing && (
        <StepLoader
          title="Analysing customer XML"
          subtitle="Detecting Extrinsics, credentials and field value patterns"
          spinColor={C.primary}
          steps={[
            'Reading XML structure',
            'Extracting Header & credentials',
            'Identifying Extrinsics universe',
            'Classifying value patterns (always / sometimes / never)',
            'Detecting catch-weight signals',
          ]}
        />
      )}

      {!analysing && analysis && (
        <div>
          <Tabs
            tabs={[
              { id: 'config',  label: 'Analysis & Configuration', count: analysis.extraExtrinsics.length + analysis.pomExtraFields.length },
              { id: 'preview', label: 'Template Preview' },
              { id: 'cwlogics', label: '⚡ CW & Transform Logics', count: cwLogics.filter(l => l.triggered).length },
            ]}
            active={activeTab}
            onChange={setActiveTab}
          />

          {activeTab === 'config' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <SCard title="Customer XML Info" icon="🗂" accent="info">
                  <InfoRow label="payloadID"        value={analysis.payloadID} />
                  <InfoRow label="cXML version"     value={analysis.version} />
                  <InfoRow label="xml:lang"          value={analysis.xmlLang} />
                  <InfoRow label="deploymentMode"   value={analysis.deploymentMode} />
                  <InfoRow label="BuyerCookie"      value={analysis.buyerCookie} />
                  <InfoRow label="operationAllowed" value={analysis.operationAllowed} />
                  <InfoRow label="Total"            value={`${analysis.totalCurrency} ${analysis.totalValue}`} />
                  <InfoRow label="Item count"       value={String(analysis.itemCount)} />
                  {(analysis.phantomItems?.length ?? 0) > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: `1px solid ${C.border}` }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, minWidth: 160, flexShrink: 0 }}>Metadata items</span>
                      <span style={{ fontSize: 11, color: C.review, fontWeight: 700, background: C.reviewBg, border: `1px solid ${C.reviewBorder}`, borderRadius: 5, padding: '1px 8px' }}>
                        📌 {analysis.phantomItems.length} hardcoded (empty SupplierPartAuxiliaryID, price=0)
                      </span>
                    </div>
                  )}
                </SCard>

                <SCard title="Header Credentials" icon="🔐" accent="purple">
                  {/* POSR verification callout */}
                  <div style={{
                    background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 7,
                    padding: '8px 12px', marginBottom: 12, fontSize: 11, color: '#92400e', lineHeight: 1.6
                  }}>
                    <strong>⚠ Double-check with POSR (session_request):</strong> Identity values in the template
                    use HBS expressions (<code style={{ background: '#fffbeb', padding: '1px 4px', borderRadius: 3 }}>{'{{cXML.Header.To.Credential.Identity}}'}</code> etc.)
                    that are resolved at runtime from the PunchOut Setup Request — not the static values in the customer XML.
                    Verify the correct Handlebars path matches how your system exposes the POSR session credentials.
                  </div>
                  {[['from','From','{{cXML.Header.To.Credential.Identity}}'],['to','To','{{cXML.Header.Sender.Credential.Identity}}'],['sender','Sender','{{cXML.Header.To.Credential.Identity}}']].map(([key, label, hbs]) => (
                    <div key={key} style={{ marginBottom: 12, padding: '8px 10px', background: '#f8fafc', borderRadius: 7, border: `1px solid ${C.border}` }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: C.purple, marginBottom: 6, textTransform: 'uppercase', letterSpacing: .5 }}>{label}</div>
                      <InfoRow label="domain"          value={analysis.credentials[key]?.domain} />
                      <InfoRow label="identity (XML)"  value={analysis.credentials[key]?.identity} />
                      <div style={{ display: 'flex', gap: 10, padding: '4px 0', borderBottom: '1px solid #f1f5f9', alignItems: 'baseline' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, minWidth: 160, flexShrink: 0 }}>identity (template)</span>
                        <code style={{ fontSize: 12, color: '#6ee7b7', fontFamily: 'monospace', background: '#1e293b', padding: '1px 6px', borderRadius: 3 }}>{hbs}</code>
                      </div>
                    </div>
                  ))}
                  <InfoRow label="UserAgent" value={analysis.userAgent} />
                </SCard>
              </div>

              <div>
                {analysis.pomExtraFields.length > 0 && (
                  <SCard title="Extra PunchOutOrderMessageHeader Fields" icon="📋" accent="warn">
                    <p style={{ fontSize: 11, color: C.muted, marginTop: 0, marginBottom: 10 }}>
                      These tags exist in the customer XML but not in the base template.
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginBottom: 8 }}>
                      <button onClick={() => setSelectedPom(new Set(analysis.pomExtraFields))} style={btnSmall(C.info)}>Select all</button>
                      <button onClick={() => setSelectedPom(new Set())} style={btnSmall(C.muted)}>Clear all</button>
                    </div>
                    {analysis.pomExtraFields.map(f => (
                      <CheckRow key={f} name={f} isNew checked={selectedPom.has(f)} onChange={() => toggle(setSelectedPom, f)} />
                    ))}
                  </SCard>
                )}

                <SCard title="Extrinsics" icon="⚙" accent="teal">
                  {analysis.extraExtrinsics.length > 0 ? (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: C.teal, textTransform: 'uppercase', letterSpacing: .5 }}>
                          Extra — {analysis.extraExtrinsics.length}
                        </span>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => setSelectedExtra(new Set(analysis.extraExtrinsics))} style={btnSmall(C.teal)}>Select all</button>
                          <button onClick={() => setSelectedExtra(new Set())} style={btnSmall(C.muted)}>Clear all</button>
                        </div>
                      </div>
                      {analysis.extraExtrinsics.map(name => (
                        <CheckRow key={name} name={name} isNew checked={selectedExtra.has(name)} onChange={() => toggle(setSelectedExtra, name)} />
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: C.success, fontSize: 12, marginTop: 0 }}>✓ No extra Extrinsics — matches base template</p>
                  )}
                  <details>
                    <summary style={{ fontSize: 11, fontWeight: 700, color: C.muted, cursor: 'pointer', marginBottom: 6, textTransform: 'uppercase', letterSpacing: .5 }}>
                      Base Template Extrinsics ({analysis.baseExtrinsics.length}) — always included
                    </summary>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                      {analysis.baseExtrinsics.map(n => <Badge key={n} v="neutral">{n}</Badge>)}
                    </div>
                  </details>

                  {/* Catch-weight conditional section */}
                  {analysis.extrinsicUniverse?.length > 0 && (
                    <div style={{ marginTop: 16, borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: .5 }}>
                          ⚡ Catch-Weight Conditional
                        </span>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => setSelectedCatchWeight(new Set(analysis.catchWeightOnlyExtrinsics?.length ? analysis.catchWeightOnlyExtrinsics : analysis.extraExtrinsics))} style={btnSmall('#92400e')}>Select all</button>
                          <button onClick={() => setSelectedCatchWeight(new Set())} style={btnSmall(C.muted)}>Clear all</button>
                        </div>
                      </div>
                      <p style={{ fontSize: 11, color: C.muted, marginTop: 0, marginBottom: 8, lineHeight: 1.5 }}>
                        Checked Extrinsics will be wrapped in
                        <code style={{ background: '#fef9c3', color: '#713f12', padding: '1px 5px', borderRadius: 3, marginLeft: 4 }}>
                          {'{{#if (eq catchWeightFlag "Yes")}}'}
                        </code>
                        {' '}in the generated template.
                        {analysis.catchWeightOnlyExtrinsics?.length > 0
                          ? <span style={{ color: '#92400e', fontWeight: 600 }}> {analysis.catchWeightOnlyExtrinsics.length} auto-detected from data.</span>
                          : <span style={{ color: C.muted }}> None auto-detected — select manually if needed.</span>}
                      </p>
                      {[...analysis.extrinsicUniverse].filter(n => n !== 'catchWeightFlag').map(name => {
                        const isAutoDetected = analysis.catchWeightOnlyExtrinsics?.includes(name)
                        const isExtraOnly    = analysis.extraExtrinsics.includes(name)
                        return (
                          <label key={name} style={{
                            display: 'flex', alignItems: 'center', gap: 8, padding: '5px 9px',
                            borderRadius: 6, cursor: 'pointer', marginBottom: 3,
                            background: selectedCatchWeight.has(name) ? '#fffbeb' : '#fafafa',
                            border: `1px solid ${selectedCatchWeight.has(name) ? '#fde68a' : '#f1f5f9'}`,
                          }}>
                            <input
                              type="checkbox"
                              checked={selectedCatchWeight.has(name)}
                              onChange={() => toggle(setSelectedCatchWeight, name)}
                              style={{ width: 14, height: 14, cursor: 'pointer', accentColor: '#92400e' }}
                            />
                            <code style={{ fontSize: 11, fontWeight: 700, flex: 1, color: C.text }}>{name}</code>
                            {isAutoDetected && <Badge v="review">auto</Badge>}
                            {isExtraOnly    && <Badge v="teal">new</Badge>}
                          </label>
                        )
                      })}
                    </div>
                  )}
                </SCard>
              </div>

              {/* Per-item Extrinsic matrix — full width */}
              {/* ─── Extrinsic Pattern Rules ──────────────────────────────────────────── */}
              {analysis.extrinsicUniverse?.length > 0 && (() => {
                const patterns  = analysis.extrinsicPatterns || {}
                const counts    = { always_valued: 0, sometimes_valued: 0, always_empty: 0, cw_only: 0 }
                analysis.extrinsicUniverse.forEach(n => { const p = patterns[n] || 'sometimes_valued'; if (counts[p] !== undefined) counts[p]++ })
                const PAT_META = {
                  always_valued:    { label: 'Always valued',    color: C.success,  bg: C.successBg,  border: C.successBorder, action: '<Extrinsic>{{val}}</Extrinsic>' },
                  sometimes_valued: { label: 'Sometimes valued', color: C.info,     bg: C.infoBg,     border: C.infoBorder,    action: '{{#if}}…{{else}}<Extrinsic/>{{/if}}' },
                  always_empty:     { label: 'Empty in sample',  color: C.warning,  bg: C.warningBg,  border: C.warningBorder, action: '{{#if}}…{{else}}<Extrinsic/>{{/if}}' },
                  cw_only:          { label: 'CW-only',           color: '#92400e',  bg: '#fffbeb',    border: '#fde68a',       action: '{{#if (eq catchWeightFlag "Yes")}}' },
                }
                return (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <SCard title="Extrinsic Template Rules (from customer_specific)" icon="📐" accent="info">
                      {/* Stats row */}
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                        {Object.entries(PAT_META).map(([key, m]) => (
                          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: m.bg, border: `1px solid ${m.border}`, borderRadius: 6 }}>
                            <span style={{ fontSize: 16, fontWeight: 800, color: m.color }}>{counts[key]}</span>
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 700, color: m.color }}>{m.label}</div>
                              <div style={{ fontSize: 9, color: m.color, opacity: 0.8, fontFamily: 'monospace' }}>{m.action}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* Per-Extrinsic table */}
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ borderCollapse: 'collapse', fontSize: 11, width: '100%' }}>
                          <thead>
                            <tr style={{ background: '#f8fafc' }}>
                              {['Extrinsic', 'Pattern', 'In Template As', 'Reason'].map(h => (
                                <th key={h} style={{ padding: '5px 10px', borderBottom: `2px solid ${C.border}`, textAlign: 'left', fontWeight: 700, color: C.muted, whiteSpace: 'nowrap' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {analysis.extrinsicUniverse.map(name => {
                              const pat = patterns[name] || 'sometimes_valued'
                              const m   = PAT_META[pat]
                              const isUser = selectedCatchWeight.has(name) && pat !== 'cw_only'
                              const effectivePat = (pat === 'always_empty') ? 'always_empty' : (selectedCatchWeight.has(name) ? 'cw_only' : pat)
                              const em = PAT_META[effectivePat] || m
                              const reasons = {
                                always_valued:    'Has a value in every item — emitted as plain tag',
                                sometimes_valued: 'Mixed — has value in some items, empty in others',
                                always_empty:     'Self-closing in all sample items — guarded with {{#if}} in case runtime has a value',
                                cw_only:          pat === 'cw_only' ? 'Only valued when catchWeightFlag=Yes' : 'Manually set as CW-conditional',
                              }
                              return (
                                <tr key={name} style={{ borderBottom: `1px solid ${C.border}` }}>
                                  <td style={{ padding: '5px 10px', fontFamily: 'monospace', fontWeight: 700, color: C.text }}>{name}</td>
                                  <td style={{ padding: '5px 10px' }}>
                                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: m.bg, color: m.color, border: `1px solid ${m.border}` }}>
                                      {m.label}
                                    </span>
                                  </td>
                                  <td style={{ padding: '5px 10px', fontFamily: 'monospace', fontSize: 10 }}>
                                    {effectivePat === 'always_valued' && <span style={{ color: C.success, fontFamily: 'monospace' }}>{`<Extrinsic name="${name}">{{…}}</Extrinsic>`}</span>}
                                    {(effectivePat === 'always_empty' || effectivePat === 'sometimes_valued') && <span style={{ color: C.info }}>{`{{#if …}}…{{else}}<Extrinsic/>{{/if}}`}</span>}
                                    {effectivePat === 'cw_only' && <span style={{ color: '#92400e' }}>{`{{#if (eq catchWeightFlag "Yes")}}…{{/if}}`}</span>}
                                    {isUser && <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: C.reviewBg, color: C.review, border: `1px solid ${C.reviewBorder}` }}>override</span>}
                                  </td>
                                  <td style={{ padding: '5px 10px', fontSize: 10, color: C.muted }}>{reasons[effectivePat] || reasons[pat]}</td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </SCard>
                  </div>
                )
              })()}

              {analysis.itemMatrix?.length > 0 && (() => {
                const interesting = [
                  ...(analysis.catchWeightOnlyExtrinsics  || []),
                  ...(analysis.inconsistentExtrinsics     || []),
                ].filter((n, i, a) => a.indexOf(n) === i)
                if (!interesting.length) return null
                return (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <SCard title="Per-Item Extrinsic Presence" icon="🔍" accent="info">
                      <p style={{ fontSize: 11, color: C.muted, marginTop: 0, marginBottom: 10, lineHeight: 1.5 }}>
                        Only Extrinsics that vary across items are shown.{' '}
                        <span style={{ color: C.success, fontWeight: 700 }}>✓</span> = present,{' '}
                        <span style={{ color: C.error, fontWeight: 700 }}>✗</span> = missing,{' '}
                        <span style={{ background: '#fef9c3', padding: '1px 4px', borderRadius: 3, fontSize: 10 }}>⚡ CW</span> = catch-weight conditional,{' '}
                        <span style={{ color: '#b45309', fontWeight: 700 }}>—</span> = expected absent (CW=No).
                      </p>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ borderCollapse: 'collapse', fontSize: 11, minWidth: '100%' }}>
                          <thead>
                            <tr>
                              <th style={{ padding: '5px 10px', background: '#f8fafc', borderBottom: `2px solid ${C.border}`, textAlign: 'left', fontWeight: 700, color: C.muted, minWidth: 200, position: 'sticky', left: 0, zIndex: 1 }}>
                                Extrinsic
                              </th>
                              {analysis.itemMatrix.map(m => (
                                <th key={m.lineNumber} style={{ padding: '4px 8px', background: '#f8fafc', borderBottom: `2px solid ${C.border}`, textAlign: 'center', fontWeight: 700, color: C.sub, minWidth: 72, whiteSpace: 'nowrap' }}>
                                  <div>#{m.lineNumber}</div>
                                  <code style={{ fontWeight: 400, fontSize: 9, color: C.muted }}>{m.supplierPartID}</code>
                                  {m.catchWeightFlag && (
                                    <div style={{ fontSize: 9, fontWeight: 700, marginTop: 1, color: m.catchWeightFlag.toLowerCase() === 'yes' ? '#b45309' : C.muted, textTransform: 'uppercase' }}>
                                      CW={m.catchWeightFlag}
                                    </div>
                                  )}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {interesting.map(name => {
                              const isCW = analysis.catchWeightOnlyExtrinsics?.includes(name)
                              return (
                                <tr key={name} style={{ background: isCW ? '#fffbeb' : 'transparent' }}>
                                  <td style={{ padding: '4px 10px', borderBottom: `1px solid ${C.border}`, fontFamily: 'monospace', fontWeight: 700, color: isCW ? '#92400e' : C.text, position: 'sticky', left: 0, background: isCW ? '#fffbeb' : C.card }}>
                                    {name}
                                    {isCW && <span style={{ marginLeft: 5, fontSize: 9, background: '#fef3c7', padding: '1px 4px', borderRadius: 3, color: '#92400e', fontFamily: 'sans-serif', fontWeight: 700 }}>⚡ CW</span>}
                                  </td>
                                  {analysis.itemMatrix.map(m => {
                                    const present   = m.presentExtrinsics?.includes(name)
                                    const cwNoItem  = isCW && m.catchWeightFlag?.toLowerCase() !== 'yes'
                                    const cellBg    = present
                                      ? (isCW && m.catchWeightFlag?.toLowerCase() === 'yes' ? '#f0fdf4' : 'transparent')
                                      : (cwNoItem ? '#fffbeb' : C.errorBg)
                                    return (
                                      <td key={m.lineNumber} style={{ padding: '4px 6px', borderBottom: `1px solid ${C.border}`, textAlign: 'center', background: cellBg }}>
                                        {present
                                          ? <span style={{ color: C.success, fontWeight: 700 }}>✓</span>
                                          : cwNoItem
                                            ? <span style={{ color: '#b45309', fontWeight: 700, fontSize: 13 }}>—</span>
                                            : <span style={{ color: C.error, fontWeight: 700 }}>✗</span>}
                                      </td>
                                    )
                                  })}
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </SCard>
                  </div>
                )
              })()}

              {/* ─── Shop.json Cross-reference, full width ─────────────────────────── */}
              {crossRefAnalysing && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <StepLoader
                    title="Cross-referencing shop.json"
                    subtitle="Matching items, comparing UOM & pricing, detecting catch-weight signals"
                    spinColor={C.teal}
                    steps={[
                      'Parsing shop.json',
                      'Matching items by Supplier ID',
                      'Comparing UOM & unit pricing',
                      'Detecting catch-weight signals',
                      'Suggesting variable path scopes',
                    ]}
                  />
                </div>
              )}
              {!crossRefAnalysing && shopCrossRef && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <SCard
                    title={`shop.json Cross-check — ${shopCrossRef.xmlItemCount} XML item${shopCrossRef.xmlItemCount !== 1 ? 's' : ''} vs ${shopCrossRef.shopItemCount} shop item${shopCrossRef.shopItemCount !== 1 ? 's' : ''}`}
                    icon="🔄"
                    accent={shopCrossRef.hasCWSignals ? 'warn' : 'teal'}
                  >
                    {/* Summary row */}
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
                      {shopCrossRef.hasOrderMismatch
                        ? <Badge v="error">⚠ Item order mismatch detected</Badge>
                        : <Badge v="ok">✓ Items in same order</Badge>}
                      {shopCrossRef.hasCWSignals
                        ? <Badge v="warning">⚡ Catch-weight logic signals found — check below</Badge>
                        : <Badge v="ok">✓ No UOM / pricing catch-weight signals</Badge>}
                      {shopCrossRef.extraShopItems.length > 0 &&
                        <Badge v="extra">+{shopCrossRef.extraShopItems.length} extra in shop.json</Badge>}
                      {shopCrossRef.suggestedCatchWeightExtrinsics.length > 0 && (
                        <span style={{ fontSize: 11, color: '#92400e', fontWeight: 700 }}>
                          Auto-added to CW conditionals:&nbsp;
                          {shopCrossRef.suggestedCatchWeightExtrinsics.map(n => (
                            <code key={n} style={{ background: '#fef3c7', padding: '1px 5px', borderRadius: 3, marginRight: 4 }}>{n}</code>
                          ))}
                        </span>
                      )}
                    </div>

                    {/* Per-item alignment table */}
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ borderCollapse: 'collapse', fontSize: 11, minWidth: '100%' }}>
                        <thead>
                          <tr style={{ background: '#f8fafc' }}>
                            {['#', 'Supplier ID', 'Short Name', 'Matched', 'In Order', 'CW Flag', 'Diffs'].map(h => (
                              <th key={h} style={{ padding: '5px 10px', borderBottom: `2px solid ${C.border}`, textAlign: 'left', fontWeight: 700, color: C.muted, whiteSpace: 'nowrap' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {shopCrossRef.itemAlignment.map(row => {
                            const hasCWDiff = row.diffs?.some(d => d.isCWSignal)
                            return (
                              <tr key={row.lineNumber} style={{ background: hasCWDiff ? '#fffbeb' : 'transparent', borderBottom: `1px solid ${C.border}` }}>
                                <td style={{ padding: '5px 10px', fontWeight: 700, color: C.sub }}>{row.lineNumber}</td>
                                <td style={{ padding: '5px 10px', fontFamily: 'monospace', fontSize: 10, color: C.sub }}>{row.supplierPartID}</td>
                                <td style={{ padding: '5px 10px', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.shortName}</td>
                                <td style={{ padding: '5px 10px', textAlign: 'center' }}>
                                  {!row.shopFound
                                    ? <Badge v="error">not found</Badge>
                                    : row.matchedById
                                      ? <Badge v="ok">by ID</Badge>
                                      : <Badge v="warning">by position</Badge>}
                                </td>
                                <td style={{ padding: '5px 10px', textAlign: 'center' }}>
                                  {row.shopFound && (row.inOrder
                                    ? <span style={{ color: C.success, fontWeight: 700 }}>✓</span>
                                    : <Badge v="warning">reordered</Badge>)}
                                </td>
                                <td style={{ padding: '5px 10px', textAlign: 'center' }}>
                                  <span style={{ fontSize: 10, fontWeight: 700, color: row.catchWeightFlag?.toLowerCase() === 'yes' ? '#b45309' : C.muted }}>
                                    {row.catchWeightFlag || '—'}
                                  </span>
                                </td>
                                <td style={{ padding: '5px 10px', minWidth: 200 }}>
                                  {!row.shopFound ? (
                                    <span style={{ color: C.error, fontSize: 10 }}>No matching shop.json item</span>
                                  ) : row.diffs?.length === 0 ? (
                                    <span style={{ color: C.success, fontSize: 10 }}>✓ All checked fields match</span>
                                  ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                      {row.diffs.map((d, i) => (
                                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                                          {d.isCWSignal && <span style={{ fontSize: 9, background: '#fef3c7', color: '#92400e', padding: '1px 4px', borderRadius: 3, fontWeight: 700 }}>⚡ CW</span>}
                                          <code style={{ fontSize: 10, color: C.sub, fontWeight: 700 }}>{d.field}</code>
                                          <span style={{ fontSize: 10, color: C.success, fontFamily: 'monospace' }}>{d.shopVal}</span>
                                          <span style={{ fontSize: 9, color: C.muted }}>→</span>
                                          <span style={{ fontSize: 10, color: C.error, fontFamily: 'monospace' }}>{d.xmlVal}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Extra shop items */}
                    {shopCrossRef.extraShopItems.length > 0 && (
                      <div style={{ marginTop: 10, padding: '8px 12px', background: C.purpleBg, border: `1px solid ${C.purpleBorder}`, borderRadius: 7 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: C.purple }}>Items in shop.json not found in XML:</span>
                        {shopCrossRef.extraShopItems.map(s => (
                          <span key={s.supplierId} style={{ marginLeft: 8, fontSize: 10, fontFamily: 'monospace' }}>
                            {s.supplierId} ({s.name})
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Legend */}
                    <div style={{ marginTop: 10, fontSize: 10, color: C.muted, lineHeight: 1.8 }}>
                      Values shown as: <span style={{ color: C.success, fontFamily: 'monospace', fontWeight: 700 }}>shop.json</span>
                      {' → '}
                      <span style={{ color: C.error, fontFamily: 'monospace', fontWeight: 700 }}>customer XML</span>
                      {' · '}
                      <span style={{ background: '#fef3c7', color: '#92400e', padding: '1px 5px', borderRadius: 3, fontWeight: 700 }}>⚡ CW</span>
                      {' = catch-weight signal (auto-added to Catch-Weight Conditionals above)'}
                    </div>
                  </SCard>
                </div>
              )}

              {pendingReview.length > 0 && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <VariableReviewCard
                    extraExtrinsics={pendingReview}
                    variablePaths={variablePaths}
                    shopItemFields={shopItemFields}
                    shopRootFields={shopRootFields}
                    onChange={updatePath}
                  />
                </div>
              )}

              <div style={{ gridColumn: '1 / -1', background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 4 }}>Customer Internal Name (for filename)</label>
                  <input
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    placeholder="e.g. aramark"
                    style={{ width: '100%', padding: '7px 10px', border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 13, fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box', background: '#f8fafc', color: C.text }}
                  />
                  {customerName && (
                    <div style={{ fontSize: 10, color: C.muted, marginTop: 3 }}>
                      Filename: <code>{customerName.toLowerCase().replace(/\s+/g,'_')}_shop.xml</code>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button onClick={() => setActiveTab('preview')} disabled={!generatedTemplate} style={btnPrimary(!!generatedTemplate, C.info)}>
                    👁 Preview Template
                  </button>
                  <button onClick={downloadTemplate} disabled={!generatedTemplate} style={btnPrimary(!!generatedTemplate, C.teal)}>
                    ↓ Download POOM Template
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'preview' && (
            <div>
              {!generatedTemplate ? (
                <div style={{ padding: 24, background: C.warningBg, borderRadius: 10, border: `1px solid ${C.warningBorder}`, color: C.warning, fontSize: 13 }}>Generating…</div>
              ) : (<>
                {/* ── Toolbar ──────────────────────────────────────────────── */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 10, alignItems: 'center', flexWrap: 'wrap', background: C.card, border: `1px solid ${C.border}`, borderRadius: 9, padding: '8px 12px' }}>
                  {/* View mode */}
                  <div style={{ display: 'flex', gap: 2, background: '#f1f5f9', borderRadius: 6, padding: 2 }}>
                    {[{ id: 'preview', label: '👁 Preview' }, { id: 'edit', label: '✏️ Edit' }, { id: 'compare', label: '⇔ Compare' }].map(({ id, label }) => (
                      <button key={id} onClick={() => setPreviewMode(id)} style={{ padding: '4px 12px', border: 'none', borderRadius: 5, cursor: 'pointer', fontWeight: previewMode === id ? 700 : 500, fontSize: 11, background: previewMode === id ? C.primary : 'transparent', color: previewMode === id ? '#fff' : C.muted, transition: 'all .15s' }}>{label}</button>
                    ))}
                  </div>
                  <div style={{ width: 1, height: 18, background: C.border, flexShrink: 0 }} />
                  {/* POM Fields */}
                  <button onClick={() => setPomCustomizeOpen(o => !o)} style={{ padding: '4px 11px', border: `1px solid ${pomCustomizeOpen ? C.primary : C.border}`, borderRadius: 5, cursor: 'pointer', fontWeight: 600, fontSize: 11, background: pomCustomizeOpen ? '#eff6ff' : 'transparent', color: pomCustomizeOpen ? C.primary : C.sub }}>
                    ⚙ POM Fields {selectedPom.size > 0 ? `(${selectedPom.size})` : ''} {pomCustomizeOpen ? '▲' : '▾'}
                  </button>
                  {/* Stats badges */}
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    <Badge v="teal">{selectedExtra.size} Extrinsic{selectedExtra.size !== 1 ? 's' : ''}</Badge>
                    {selectedPom.size > 0 && <Badge v="warning">{selectedPom.size} POM</Badge>}
                    {selectedCatchWeight.size > 0 && <Badge v="review">⚡{selectedCatchWeight.size} CW</Badge>}
                    {editDirty && <Badge v="error">● Edited</Badge>}
                    <Badge v="info">{effectivePreviewText.split('\n').length} lines</Badge>
                  </div>
                  {/* Right actions */}
                  <div style={{ display: 'flex', gap: 6, marginLeft: 'auto', flexShrink: 0, alignItems: 'center' }}>
                    {previewMode === 'edit' && editDirty && (
                      <button onClick={() => { setEditedTemplate(generatedTemplate); setEditDirty(false) }} style={{ padding: '4px 10px', border: `1px solid ${C.errorBorder}`, borderRadius: 5, cursor: 'pointer', fontWeight: 600, fontSize: 11, color: C.error, background: C.errorBg }}>↺ Reset Edit</button>
                    )}
                    <button onClick={() => setFormatMode(f => !f)} style={{ padding: '4px 10px', border: `1px solid ${C.border}`, borderRadius: 5, cursor: 'pointer', fontWeight: 600, fontSize: 11, background: formatMode ? C.primary : 'transparent', color: formatMode ? '#fff' : C.sub }}>{formatMode ? '✓ Formatted' : 'Format XML'}</button>
                    <button onClick={copyTemplate} style={btnSmall(C.sub)}>{copyDone ? '✓ Copied!' : '⧉ Copy'}</button>
                    <button onClick={downloadTemplate} style={{ ...btnSmall(C.teal), padding: '4px 14px', fontWeight: 700 }}>↓ Download</button>
                  </div>
                </div>

                {/* ── POM Fields customize panel ─────────────────────────── */}
                {pomCustomizeOpen && (
                  <div style={{ marginBottom: 10, background: C.card, border: `1px solid ${C.infoBorder}`, borderRadius: 9, padding: '14px 16px' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.info, marginBottom: 10 }}>⚙ PunchOutOrderMessageHeader Fields — Toggle &amp; Manage</div>
                    {/* Detected from customer XML */}
                    {analysis.pomExtraFields.length > 0 && (
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 6 }}>Detected in customer XML (exact structure preserved):</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {analysis.pomExtraFields.map(tag => {
                            const on = selectedPom.has(tag)
                            return <button key={tag} onClick={() => toggle(setSelectedPom, tag)} style={{ padding: '5px 14px', borderRadius: 14, cursor: 'pointer', fontWeight: 700, fontSize: 11, transition: 'all .15s', border: `1.5px solid ${on ? C.teal : C.border}`, background: on ? C.tealBg : '#f8fafc', color: on ? C.teal : C.muted }}>{on ? '✓ ' : ''}{tag}</button>
                          })}
                        </div>
                      </div>
                    )}
                    {/* Known common fields not in detected list */}
                    {(() => {
                      const addable = ['Shipping', 'ShipTo', 'Tax', 'Comments', 'EstimatedDeliveryDate'].filter(f => !analysis.pomExtraFields.includes(f))
                      if (!addable.length) return null
                      return (
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 6 }}>Common fields (fallback template — not in customer XML):</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {addable.map(f => {
                              const on = selectedPom.has(f)
                              return <button key={f} onClick={() => toggle(setSelectedPom, f)} style={{ padding: '5px 14px', borderRadius: 14, cursor: 'pointer', fontWeight: 700, fontSize: 11, transition: 'all .15s', border: `1.5px solid ${on ? C.warning : C.border}`, background: on ? C.warningBg : '#f8fafc', color: on ? C.warning : C.muted }}>{on ? '✓ ' : '+ '}{f}</button>
                            })}
                          </div>
                        </div>
                      )
                    })()}
                    {/* Custom field input */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: C.muted }}>Custom field:</span>
                      <input value={newPomField} onChange={e => setNewPomField(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && newPomField.trim()) { toggle(setSelectedPom, newPomField.trim()); setNewPomField('') } }} placeholder="FieldName…" style={{ padding: '5px 10px', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 12, fontFamily: 'monospace', outline: 'none', width: 160 }} />
                      <button onClick={() => { if (newPomField.trim()) { toggle(setSelectedPom, newPomField.trim()); setNewPomField('') } }} style={btnSmall(C.primary)}>+ Add</button>
                      {selectedPom.size > 0 && <button onClick={() => setSelectedPom(new Set())} style={btnSmall(C.error)}>Clear all</button>}
                    </div>
                    {/* Active selection summary */}
                    {selectedPom.size > 0 && (
                      <div style={{ padding: '8px 10px', background: '#f0fdf4', border: `1px solid ${C.successBorder}`, borderRadius: 7 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: C.success }}>✓ Will be inserted: </span>
                        {[...selectedPom].map(tag => (
                          <span key={tag} style={{ marginRight: 6 }}>
                            <code style={{ background: '#dcfce7', padding: '1px 5px', borderRadius: 3, fontSize: 11, color: '#14532d' }}>{tag}</code>
                            <button onClick={() => toggle(setSelectedPom, tag)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.error, fontSize: 12, padding: '0 2px', fontWeight: 700 }}>×</button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Suggestions ───────────────────────────────────────────── */}
                {suggestions.length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <details open={suggestions.some(s => s.type === 'warning' || s.type === 'review')}>
                      <summary style={{ fontSize: 11, fontWeight: 700, color: C.sub, cursor: 'pointer', marginBottom: 6, padding: '4px 0', userSelect: 'none' }}>
                        💡 {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''} &amp; check{suggestions.length !== 1 ? 's' : ''}
                      </summary>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 6 }}>
                        {suggestions.map((s, i) => {
                          const meta = { warning: { bg: C.warningBg, border: C.warningBorder, color: C.warning }, review: { bg: C.reviewBg, border: C.reviewBorder, color: C.review }, info: { bg: C.infoBg, border: C.infoBorder, color: C.info }, error: { bg: C.errorBg, border: C.errorBorder, color: C.error } }[s.type] || { bg: '#f8fafc', border: C.border, color: C.sub }
                          return (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', background: meta.bg, border: `1px solid ${meta.border}`, borderRadius: 7, fontSize: 11 }}>
                              <span style={{ fontSize: 14, flexShrink: 0 }}>{s.icon}</span>
                              <div style={{ flex: 1 }}>
                                <span style={{ fontWeight: 700, color: meta.color }}>{s.title}</span>
                                {s.body && <span style={{ color: C.muted, marginLeft: 6 }}>{s.body}</span>}
                              </div>
                              {s.action && <button onClick={() => setActiveTab(s.action)} style={{ padding: '2px 9px', border: `1px solid ${meta.border}`, borderRadius: 4, cursor: 'pointer', fontSize: 10, fontWeight: 700, color: meta.color, background: 'transparent', flexShrink: 0 }}>Go →</button>}
                            </div>
                          )
                        })}
                      </div>
                    </details>
                  </div>
                )}

                {/* ── Pending review warning ────────────────────────────────── */}
                {pendingReview.length > 0 && (
                  <div style={{ marginBottom: 10, padding: '8px 12px', background: C.reviewBg, border: `1px solid ${C.reviewBorder}`, borderRadius: 7, fontSize: 11, color: C.review }}>
                    ⚠ <strong>{pendingReview.length} variable path{pendingReview.length !== 1 ? 's' : ''}</strong> highlighted in <span style={{ background: '#fef9c3', padding: '1px 4px', borderRadius: 3, fontFamily: 'monospace' }}>gold underline</span> need review.{' '}
                    <button onClick={() => setActiveTab('config')} style={{ background: 'none', border: 'none', color: C.review, cursor: 'pointer', fontWeight: 700, fontSize: 11, padding: 0, textDecoration: 'underline' }}>Analysis tab →</button>
                  </div>
                )}

                {/* ── PREVIEW mode ─────────────────────────────────────────── */}
                {previewMode === 'preview' && (
                  <>
                    <XmlPreview text={effectivePreviewText} />
                    <div style={{ marginTop: 8, display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 10, color: C.muted }}>
                      <span><span style={{ color: '#fbbf24', fontFamily: 'monospace', textDecoration: 'underline dotted' }}>{'{{@root.…}}'}</span> — new variable (verify!)</span>
                      <span><span style={{ color: '#6ee7b7', fontFamily: 'monospace' }}>{'{{var}}'}</span> — HBS variable</span>
                      <span><span style={{ color: '#a78bfa', fontFamily: 'monospace' }}>{'{{#each}}'}</span> — block helper</span>
                      <span><span style={{ color: '#93c5fd', fontFamily: 'monospace' }}>&lt;Tag&gt;</span> — XML element</span>
                    </div>
                  </>
                )}

                {/* ── EDIT mode ────────────────────────────────────────────── */}
                {previewMode === 'edit' && (
                  <div>
                    <div style={{ marginBottom: 6, padding: '7px 12px', background: C.infoBg, border: `1px solid ${C.infoBorder}`, borderRadius: 7, fontSize: 11, color: C.info, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>✏️ <strong>Edit mode</strong> — changes are reflected in Copy and Download.{editDirty && <span style={{ color: C.error, marginLeft: 8, fontWeight: 700 }}>● Unsaved changes</span>}</span>
                    </div>
                    <textarea
                      value={editedTemplate}
                      onChange={e => { setEditedTemplate(e.target.value); setEditDirty(e.target.value !== generatedTemplate) }}
                      spellCheck={false}
                      style={{ width: '100%', minHeight: 580, padding: '14px', boxSizing: 'border-box', background: '#1e293b', color: '#e2e8f0', border: '1px solid #334155', borderRadius: 8, fontFamily: 'ui-monospace, Cascadia Code, Consolas, monospace', fontSize: 11.5, lineHeight: 1.6, resize: 'vertical', outline: 'none', tabSize: 4 }}
                    />
                  </div>
                )}

                {/* ── COMPARE mode ─────────────────────────────────────────── */}
                {previewMode === 'compare' && (
                  <>
                    {/* Compare toolbar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, padding: '7px 12px', background: '#f8fafc', border: `1px solid ${C.border}`, borderRadius: 7, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: C.sub }}>Compare Options</span>
                      <button
                        onClick={() => setCompareDiffMode(p => !p)}
                        title="Highlight lines that differ between Customer XML and POOM template"
                        style={{ padding: '4px 12px', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 11, fontWeight: 600, background: compareDiffMode ? C.warning : '#e2e8f0', color: compareDiffMode ? '#fff' : C.muted, transition: 'all .15s' }}>
                        {compareDiffMode ? '⬦ Diff ON' : '⬡ Diff Highlight'}
                      </button>
                      {compareDiffMode && (
                        <div style={{ display: 'flex', gap: 8, fontSize: 10, flexWrap: 'wrap' }}>
                          <span style={{ padding: '2px 8px', borderRadius: 4, background: 'rgba(220,38,38,.15)', color: '#ef4444', fontWeight: 700 }}>− only in Customer XML</span>
                          <span style={{ padding: '2px 8px', borderRadius: 4, background: 'rgba(22,163,74,.15)', color: '#16a34a', fontWeight: 700 }}>+ only in Template</span>
                        </div>
                      )}
                      <button
                        onClick={() => setCompareFullscreen(true)}
                        title="Open fullscreen compare view"
                        style={{ marginLeft: 'auto', padding: '4px 14px', border: `1px solid ${C.primary}`, borderRadius: 5, cursor: 'pointer', fontSize: 11, fontWeight: 600, background: '#fff', color: C.primary }}>
                        ⛶ Fullscreen
                      </button>
                    </div>

                    {/* Normal compare grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 10, alignItems: 'start', width: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>
                      {/* Left: Customer XML sample (read-only) */}
                      <div style={{ minWidth: 0, overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: C.sub, background: '#f1f5f9', padding: '4px 10px', borderRadius: 6, border: `1px solid ${C.border}` }}>📋 Customer XML — Sample</span>
                          <span style={{ fontSize: 10, color: C.muted }}>
                            {sampleItemLabels.join(' + ')}
                            {analysis.itemCount > sampleItemLabels.length ? ` (${analysis.itemCount} total)` : ''}
                          </span>
                        </div>
                        <div style={{ overflow: 'auto', maxHeight: 640 }}>
                          {compareDiffMode && diffResult
                            ? <DiffPane lines={diffResult.leftOut} maxHeight={620} />
                            : <XmlPreview text={customerXmlSample} />}
                        </div>
                      </div>
                      {/* Right: Generated template — preview OR editable */}
                      <div style={{ minWidth: 0, overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: C.teal, background: C.tealBg, padding: '4px 10px', borderRadius: 6, border: `1px solid ${C.tealBorder}` }}>✦ POOM Template</span>
                          {editDirty && <Badge v="error">● Edited</Badge>}
                          <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                            <button onClick={() => setCompareRightEdit(false)} style={{ padding: '3px 9px', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 10, fontWeight: 600, background: !compareRightEdit ? C.primary : '#f1f5f9', color: !compareRightEdit ? '#fff' : C.muted }}>👁 Preview</button>
                            <button onClick={() => setCompareRightEdit(true)} style={{ padding: '3px 9px', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 10, fontWeight: 600, background: compareRightEdit ? C.primary : '#f1f5f9', color: compareRightEdit ? '#fff' : C.muted }}>✏️ Edit</button>
                          </div>
                        </div>
                        {compareRightEdit ? (
                          <textarea
                            value={editedTemplate}
                            onChange={e => { setEditedTemplate(e.target.value); setEditDirty(e.target.value !== generatedTemplate) }}
                            spellCheck={false}
                            style={{ width: '100%', height: 600, padding: '10px', boxSizing: 'border-box', background: '#1e293b', color: '#e2e8f0', border: '1px solid #334155', borderRadius: 8, fontFamily: 'ui-monospace, Cascadia Code, Consolas, monospace', fontSize: 11, lineHeight: 1.55, resize: 'vertical', outline: 'none', tabSize: 4 }}
                          />
                        ) : (
                          <div style={{ overflow: 'auto', maxHeight: 640 }}>
                            {compareDiffMode && diffResult
                              ? <DiffPane lines={diffResult.rightOut} maxHeight={620} />
                              : <XmlPreview text={effectivePreviewText} />}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ── Fullscreen overlay ──────────────────────────────── */}
                    {compareFullscreen && (
                      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#0f172a', display: 'flex', flexDirection: 'column' }}>
                        {/* FS header */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: '#1e293b', borderBottom: '2px solid #334155', flexShrink: 0, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginRight: 4 }}>⬦ Compare — Fullscreen</span>
                          {editDirty && <span style={{ fontSize: 11, color: '#fca5a5', fontWeight: 700 }}>● Edited</span>}
                          <button
                            onClick={() => setCompareDiffMode(p => !p)}
                            style={{ padding: '4px 12px', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 11, fontWeight: 600, background: compareDiffMode ? '#b45309' : '#334155', color: compareDiffMode ? '#fef3c7' : '#94a3b8', transition: 'all .15s' }}>
                            {compareDiffMode ? '⬦ Diff ON' : '⬡ Diff Highlight'}
                          </button>
                          {compareDiffMode && (
                            <div style={{ display: 'flex', gap: 8, fontSize: 10 }}>
                              <span style={{ padding: '2px 8px', borderRadius: 4, background: 'rgba(220,38,38,.25)', color: '#fca5a5', fontWeight: 700 }}>− Customer only</span>
                              <span style={{ padding: '2px 8px', borderRadius: 4, background: 'rgba(22,163,74,.25)', color: '#86efac', fontWeight: 700 }}>+ Template only</span>
                            </div>
                          )}
                          <div style={{ display: 'flex', gap: 4, marginLeft: 'auto', alignItems: 'center' }}>
                            <button onClick={() => setCompareRightEdit(false)} style={{ padding: '4px 12px', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 11, fontWeight: 600, background: !compareRightEdit ? C.primary : '#334155', color: !compareRightEdit ? '#fff' : '#94a3b8' }}>👁 Preview</button>
                            <button onClick={() => setCompareRightEdit(true)} style={{ padding: '4px 12px', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 11, fontWeight: 600, background: compareRightEdit ? C.primary : '#334155', color: compareRightEdit ? '#fff' : '#94a3b8' }}>✏️ Edit Template</button>
                            <button onClick={() => setCompareFullscreen(false)} style={{ padding: '4px 14px', border: '1px solid #475569', borderRadius: 5, cursor: 'pointer', fontSize: 12, fontWeight: 700, background: '#0f172a', color: '#e2e8f0', marginLeft: 6 }}>✕ Close</button>
                          </div>
                        </div>
                        {/* FS body */}
                        <div style={{ flex: 1, overflow: 'hidden', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 14, flex: fsShopItems.length ? '0 0 55%' : 1, overflow: 'hidden', minHeight: 0 }}>
                            {/* FS Left pane */}
                            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
                              <div style={{ padding: '5px 12px', background: '#1e293b', border: '1px solid #334155', borderBottom: 'none', borderRadius: '7px 7px 0 0', fontSize: 11, fontWeight: 700, color: '#94a3b8', flexShrink: 0 }}>
                                📋 Customer XML — Sample
                                <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 400, color: '#475569' }}>
                                  {sampleItemLabels.join(' + ')}
                                  {analysis.itemCount > sampleItemLabels.length ? ` (${analysis.itemCount} total)` : ''}
                                </span>
                              </div>
                              <div style={{ flex: 1, overflow: 'auto', minHeight: 0, border: '1px solid #334155', borderRadius: '0 0 7px 7px' }}>
                                {compareDiffMode && diffResult
                                  ? <DiffPane lines={diffResult.leftOut} style={{ borderRadius: '0 0 7px 7px', border: 'none', maxHeight: 'none' }} />
                                  : <XmlPreview text={customerXmlSample} />}
                              </div>
                            </div>
                            {/* FS Right pane */}
                            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
                              <div style={{ padding: '5px 12px', background: '#134e4a', border: '1px solid #0d9488', borderBottom: 'none', borderRadius: '7px 7px 0 0', fontSize: 11, fontWeight: 700, color: '#5eead4', flexShrink: 0 }}>
                                ✦ POOM Template
                                {editDirty && <span style={{ marginLeft: 8, fontSize: 10, color: '#fca5a5', fontWeight: 700 }}>● Unsaved changes</span>}
                              </div>
                              <div style={{ flex: 1, overflow: 'auto', minHeight: 0, border: '1px solid #0d9488', borderRadius: '0 0 7px 7px' }}>
                                {compareRightEdit ? (
                                  <textarea
                                    value={editedTemplate}
                                    onChange={e => { setEditedTemplate(e.target.value); setEditDirty(e.target.value !== generatedTemplate) }}
                                    spellCheck={false}
                                    style={{ width: '100%', height: '100%', padding: '12px', boxSizing: 'border-box', background: '#1e293b', color: '#e2e8f0', border: 'none', outline: 'none', fontFamily: 'ui-monospace, Cascadia Code, Consolas, monospace', fontSize: 11.5, lineHeight: 1.6, resize: 'none', tabSize: 4 }}
                                  />
                                ) : (
                                  compareDiffMode && diffResult
                                    ? <DiffPane lines={diffResult.rightOut} style={{ borderRadius: '0 0 7px 7px', border: 'none', maxHeight: 'none' }} />
                                    : <XmlPreview text={effectivePreviewText} />
                                )}
                              </div>
                            </div>
                          </div>

                          {/* FS bottom: shop.json items */}
                          {fsShopItems.length > 0 && (
                            <div style={{ flex: 1, overflow: 'hidden', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                              <div style={{ padding: '5px 12px', background: '#1c1917', border: '1px solid #44403c', borderBottom: 'none', borderRadius: '7px 7px 0 0', fontSize: 11, fontWeight: 700, color: '#d6d3d1', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span>📦 shop.json — Corresponding Items</span>
                                <span style={{ fontSize: 10, fontWeight: 400, color: '#78716c' }}>positionally matched to sample items above</span>
                              </div>
                              <div style={{ flex: 1, overflow: 'auto', minHeight: 0, background: '#1c1917', border: '1px solid #44403c', borderRadius: '0 0 7px 7px', padding: '10px 14px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${fsShopItems.length}, minmax(0,1fr))`, gap: 14 }}>
                                  {fsShopItems.map(({ label, xmlItem, shopItem }) => {
                                    const getXmlVal = k => k === 'supplierId' ? xmlItem.supplierPartID
                                      : k === 'name' ? xmlItem.shortName
                                      : k === 'uom' ? xmlItem.xmlUom
                                      : k === 'unitPrice' ? xmlItem.unitPrice
                                      : k === 'quantity' ? String(xmlItem.quantity ?? '')
                                      : xmlItem.extValues?.[k] != null ? String(xmlItem.extValues[k]) : undefined
                                    const labelColor = label.includes('Catch') ? '#f59e0b' : label.includes('EA') ? '#a78bfa' : '#67e8f9'
                                    const labelIcon  = label.includes('Catch') ? '⚡' : label.includes('EA') ? '🏷️' : '📦'
                                    return (
                                      <div key={label}>
                                        <div style={{ fontSize: 11, fontWeight: 700, color: labelColor, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                                          {labelIcon} {label}
                                          <span style={{ fontSize: 10, fontWeight: 400, color: '#78716c' }}>#{xmlItem.lineNumber} · {xmlItem.supplierPartID}</span>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '2px 10px', fontFamily: 'ui-monospace, Cascadia Code, Consolas, monospace', fontSize: 10.5, lineHeight: 1.65 }}>
                                          {Object.entries(shopItem).map(([k, v]) => {
                                            const xmlVal = getXmlVal(k)
                                            const sVal = String(v ?? '').trim()
                                            const xVal = xmlVal != null ? String(xmlVal).trim() : undefined
                                            const isDiff = xVal !== undefined && sVal !== '' && xVal !== '' && sVal !== xVal
                                            const isEmpty = sVal === ''
                                            return [
                                              <span key={k + '_k'} style={{ color: isDiff ? '#fbbf24' : '#6b7280', whiteSpace: 'nowrap', paddingRight: 4 }}>{k}</span>,
                                              <span key={k + '_v'} style={{ color: isDiff ? '#fde68a' : isEmpty ? '#374151' : '#d6d3d1', background: isDiff ? 'rgba(251,191,36,.1)' : 'transparent', borderRadius: 3, paddingLeft: isDiff ? 4 : 0 }}>
                                                {isEmpty
                                                  ? <span style={{ color: '#374151', fontStyle: 'italic' }}>(empty)</span>
                                                  : <>{sVal}{isDiff && <span style={{ marginLeft: 6, color: '#6b7280', fontStyle: 'italic' }}>← xml: {xVal}</span>}</>}
                                              </span>
                                            ]
                                          })}
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>)}
            </div>
          )}

          {activeTab === 'cwlogics' && (
            <CatchWeightLogicsPanel logics={cwLogics} />
          )}
        </div>
      )}

      {!analysis && customerXml && (
        <div style={{ padding: 20, background: C.errorBg, borderRadius: 10, border: `1px solid ${C.errorBorder}`, color: C.error, fontSize: 13 }}>
          ⚠ Could not parse the uploaded XML. Make sure it is a valid customer_specific cXML file.
        </div>
      )}
    </div>
  )
}

function btnPrimary(enabled, color = '#2563eb') {
  return {
    padding: '8px 18px', border: 'none', borderRadius: 7, cursor: enabled ? 'pointer' : 'not-allowed',
    fontWeight: 700, fontSize: 13,
    background: enabled ? color : '#94a3b8', color: '#fff',
    opacity: enabled ? 1 : .6, transition: 'background .15s'
  }
}

function btnSmall(color) {
  return {
    padding: '3px 10px', border: `1px solid ${color}`, borderRadius: 5,
    cursor: 'pointer', fontWeight: 600, fontSize: 11, color, background: 'transparent'
  }
}

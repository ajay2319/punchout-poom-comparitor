import React, { useState, useMemo, useEffect } from 'react'
import { compareXmlAgainstTemplate } from './utils/compareXml'
import { compareJsonAndXml } from './utils/compareJsonXml'
import { analyzeCustomerXml, generatePoomTemplate, formatXml, generateCatchWeightLogics } from './utils/xmlUtils'
import GenerateSection from './GenerateSection'
import SqlSection from './SqlSection'
import CatchWeightLogicsPanel from './CatchWeightLogicsPanel'
import HelpSection from './HelpSection'
import syscoLogo from '../sample/syscologo.png'

// ─── Design tokens ───────────────────────────────────────────────────────────
const C = {
  bg: '#f1f5f9', card: '#ffffff', border: '#e2e8f0',
  primary: '#2563eb', primaryDark: '#1d4ed8',
  success: '#16a34a', successBg: '#dcfce7', successBorder: '#86efac',
  error: '#dc2626',   errorBg:   '#fee2e2', errorBorder:   '#fca5a5',
  warning: '#b45309', warningBg: '#fef3c7', warningBorder: '#fde68a',
  info:    '#0369a1', infoBg:    '#e0f2fe', infoBorder:    '#7dd3fc',
  purple:  '#7c3aed', purpleBg:  '#f5f3ff', purpleBorder:  '#c4b5fd',
  muted: '#6b7280', text: '#1e293b', sub: '#475569',
}

// ─── Primitives ──────────────────────────────────────────────────────────────
function Badge({ v = 'neutral', children, style = {} }) {
  const map = {
    ok:      { bg: C.successBg,  color: C.success,  border: C.successBorder },
    error:   { bg: C.errorBg,    color: C.error,     border: C.errorBorder   },
    warning: { bg: C.warningBg,  color: C.warning,   border: C.warningBorder },
    info:    { bg: C.infoBg,     color: C.info,      border: C.infoBorder    },
    extra:   { bg: C.purpleBg,   color: C.purple,    border: C.purpleBorder  },
    neutral: { bg: '#f1f5f9',    color: C.sub,       border: C.border        },
  }
  const s = map[v] || map.neutral
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3,
      padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      whiteSpace: 'nowrap', ...style }}>
      {children}
    </span>
  )
}

function Chip({ ok, label, expected, actual }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 6 }}>
      <span style={{ fontWeight: 700, fontSize: 13, color: ok ? C.success : C.error }}>{ok ? '✓' : '✗'}</span>
      <span style={{ fontSize: 12, color: C.sub, fontWeight: 600 }}>{label}</span>
      {expected && <Badge v="neutral">{expected}</Badge>}
      {!ok && actual && <><span style={{ fontSize: 11, color: C.muted }}>got</span><Badge v="error">{actual}</Badge></>}
    </div>
  )
}

function Row({ label, jsonVal, xmlVal, isMatch }) {
  return (
    <tr style={{ background: isMatch ? 'transparent' : '#fffbeb' }}>
      <td style={tdS}>{label}</td>
      <td style={{ ...tdS, fontFamily: 'monospace', color: isMatch ? C.text : C.success, maxWidth: 260, wordBreak: 'break-all' }}>{jsonVal || <em style={{ color: C.muted }}>—</em>}</td>
      <td style={{ ...tdS, fontFamily: 'monospace', color: isMatch ? C.text : C.error, background: !isMatch ? C.errorBg : 'transparent', maxWidth: 260, wordBreak: 'break-all' }}>{xmlVal || <em style={{ color: C.muted }}>—</em>}</td>
      <td style={{ ...tdS, textAlign: 'center' }}>{isMatch ? <span style={{ color: C.success }}>✓</span> : <span style={{ color: C.error }}>✗</span>}</td>
    </tr>
  )
}
const tdS = { padding: '5px 10px', borderBottom: '1px solid #f1f5f9', fontSize: 12 }

// ─── Tabs ─────────────────────────────────────────────────────────────────────
function Tabs({ tabs, active, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 2, borderBottom: `2px solid ${C.border}`, marginBottom: 16 }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)} style={{
          padding: '7px 14px', border: 'none', cursor: 'pointer', fontWeight: active === t.id ? 700 : 500,
          color: active === t.id ? C.primary : C.muted, background: 'transparent',
          borderBottom: `2px solid ${active === t.id ? C.primary : 'transparent'}`,
          marginBottom: -2, fontSize: 13, display: 'flex', alignItems: 'center', gap: 5
        }}>
          {t.label}
          {t.count != null && t.count > 0 && (
            <span style={{ background: active === t.id ? C.primary : '#e2e8f0', color: active === t.id ? '#fff' : C.muted, borderRadius: 10, padding: '1px 6px', fontSize: 10, fontWeight: 700 }}>
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

// ─── Upload Zone ──────────────────────────────────────────────────────────────
function UploadZone({ label, accept, hint, value, onChange }) {
  const [drag, setDrag] = useState(false)
  const id = `uz-${label.replace(/\s/g, '')}`
  const handle = f => f && f.text().then(onChange)
  return (
    <div onDragOver={e => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)}
      onDrop={e => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files[0]) }}
      style={{ border: `2px dashed ${drag ? C.primary : value ? C.success : C.border}`, borderRadius: 10,
        padding: '18px 16px', textAlign: 'center', background: drag ? '#eff6ff' : value ? '#f0fdf4' : '#fafafa',
        transition: 'all .2s' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4 }}>{label}</div>
      <code style={{ fontSize: 11, color: C.muted, background: '#f1f5f9', padding: '1px 5px', borderRadius: 3 }}>{accept}</code>
      <div style={{ fontSize: 11, color: C.muted, marginTop: 4, marginBottom: 8 }}>{hint}</div>
      <input type="file" accept={accept} id={id} style={{ display: 'none' }} onChange={e => handle(e.target.files[0])} />
      <label htmlFor={id} style={{ display: 'inline-block', padding: '6px 16px', background: value ? C.success : C.primary,
        color: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
        {value ? '✓ Loaded — Change' : 'Browse / Drop'}
      </label>
    </div>
  )
}

// ─── Inline XML preview panel (Compare section) ───────────────────────────────
function XmlPreviewPanel({ xml, formatMode, onToggleFormat, onDownload }) {
  const [copied, setCopied] = useState(false)
  const [copyErr, setCopyErr] = useState(false)

  const displayText = formatMode === 'formatted' ? formatXml(xml) : xml

  // Simple syntax highlighting
  const highlighted = displayText
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

  const copy = () => {
    navigator.clipboard?.writeText(displayText).then(
      () => { setCopied(true); setTimeout(() => setCopied(false), 2000) },
      () => { setCopyErr(true); setTimeout(() => setCopyErr(false), 2000) }
    )
  }

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, marginBottom: 20, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: '#f8fafc', borderBottom: `1px solid ${C.border}`, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: C.sub, flex: 1 }}>Updated POOM Template</span>
        <Badge v="info">{displayText.split('\n').length} lines</Badge>
        <button
          onClick={onToggleFormat}
          style={{ padding: '4px 12px', border: `1px solid ${C.border}`, borderRadius: 5, cursor: 'pointer', fontWeight: 600, fontSize: 11, background: formatMode === 'formatted' ? C.primary : 'transparent', color: formatMode === 'formatted' ? '#fff' : C.sub }}>
          {formatMode === 'formatted' ? '✓ Formatted' : 'Format XML'}
        </button>
        <button onClick={copy} style={{ padding: '4px 12px', border: `1px solid ${C.border}`, borderRadius: 5, cursor: 'pointer', fontWeight: 600, fontSize: 11, background: 'transparent', color: copied ? C.success : copyErr ? C.error : C.sub }}>
          {copied ? '✓ Copied' : copyErr ? '✗ Failed' : '⧉ Copy'}
        </button>
        <button onClick={onDownload} style={{ padding: '4px 12px', border: `1px solid ${C.successBorder}`, borderRadius: 5, cursor: 'pointer', fontWeight: 700, fontSize: 11, background: C.successBg, color: C.success }}>
          ↓ Download
        </button>
      </div>
      {/* Legend */}
      <div style={{ display: 'flex', gap: 12, padding: '5px 14px', background: '#1e293b', flexWrap: 'wrap', borderBottom: '1px solid #334155' }}>
        {[
          ['#fbbf24', '{{@root.…}} — new var (verify!)'],
          ['#6ee7b7', '{{var}} — existing variable'],
          ['#a78bfa', '{{#each/if}} — block'],
          ['#93c5fd', '<Tag> — XML element'],
        ].map(([color, label]) => (
          <span key={label} style={{ fontSize: 10, color, fontFamily: 'monospace' }}>{label}</span>
        ))}
      </div>
      {/* Code */}
      <pre
        dangerouslySetInnerHTML={{ __html: highlighted }}
        style={{ background: '#1e293b', color: '#e2e8f0', padding: '12px 16px', overflowX: 'auto', overflowY: 'auto', maxHeight: 500, fontSize: 11.5, lineHeight: 1.6, fontFamily: 'ui-monospace, Cascadia Code, Consolas, monospace', margin: 0 }}
      />
    </div>
  )
}

// ─── CW Alert ────────────────────────────────────────────────────────────────
const CW_META = {
  UOMWeightInXML:      { bg: C.errorBg,   border: C.errorBorder,   icon: '⚖', title: 'Catch Weight — XML UOM is Weight Unit (shop has CS)' },
  UOMWeightInShop:     { bg: C.errorBg,   border: C.errorBorder,   icon: '⚖', title: 'Catch Weight — Shop JSON UOM is Weight Unit (XML has CS)' },
  UOMMismatch:         { bg: C.errorBg,   border: C.errorBorder,   icon: '⚠', title: 'UnitOfMeasure Mismatch' },
  OrderedUOMDiff:      { bg: C.errorBg,   border: C.errorBorder,   icon: '⚠', title: 'orderedUnitOfMeasure Mismatch' },
  PricingUOMDiff:      { bg: C.warningBg, border: C.warningBorder, icon: '💰', title: 'unitPriceInOrderedUOM Mismatch' },
  UnitPriceDiff:       { bg: C.warningBg, border: C.warningBorder, icon: '💰', title: 'UnitPrice Mismatch' },
  ExtendedPriceDiff:   { bg: C.warningBg, border: C.warningBorder, icon: '💰', title: 'itemExtendedPrice Mismatch' },
  QuantityDiff:        { bg: C.errorBg,   border: C.errorBorder,   icon: '🔢', title: 'Quantity Mismatch' },
  CatchWeightFlagDiff: { bg: C.warningBg, border: C.warningBorder, icon: '🚩', title: 'catchWeightFlag Mismatch' },
  SplitIndicatorDiff:  { bg: C.warningBg, border: C.warningBorder, icon: '⚠', title: 'splitIndicator Mismatch' },
  ClassificationDiff:  { bg: C.infoBg,    border: C.infoBorder,    icon: 'ℹ', title: 'Classification (CMIM) Mismatch' },
  AvgWeightDiff:       { bg: C.infoBg,    border: C.infoBorder,    icon: 'ℹ', title: 'averageWeightPerCase Mismatch' },
  CasePackDiff:        { bg: C.infoBg,    border: C.infoBorder,    icon: 'ℹ', title: 'casePack / itemsPerCase Mismatch' },
  CaseSizeDiff:        { bg: C.infoBg,    border: C.infoBorder,    icon: 'ℹ', title: 'caseSize Mismatch' },
  DescriptionDiff:     { bg: '#f8fafc',   border: C.border,        icon: '📝', title: 'Description / ShortName Mismatch' },
  MarketPriceFlagDiff: { bg: '#f8fafc',   border: C.border,        icon: '~',  title: 'marketPriceFlag Mismatch' },
  SpecialOrderDiff:    { bg: '#f8fafc',   border: C.border,        icon: '~',  title: 'specialOrderItem Mismatch' },
  ValueMismatch:       { bg: '#f8fafc',   border: C.border,        icon: '~',  title: 'Value Mismatch' },
}

const SEV_COLOR = { high: C.error, warning: C.warning, medium: C.info, low: C.muted }

function CWAlert({ cw }) {
  const s = CW_META[cw.type] || CW_META.ValueMismatch
  return (
    <div style={{ padding: '10px 14px', borderRadius: 7, marginBottom: 6, background: s.bg, border: `1px solid ${s.border}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div style={{ fontWeight: 700, fontSize: 13 }}>{s.icon} {s.title}</div>
        <span style={{ fontSize: 10, fontWeight: 700, color: SEV_COLOR[cw.severity] || C.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>{cw.severity}</span>
      </div>
      <div style={{ display: 'flex', gap: 0, borderRadius: 5, overflow: 'hidden', border: `1px solid ${C.border}`, fontSize: 12 }}>
        <div style={{ flex: 1, padding: '6px 10px', background: '#f0fdf4' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.success, marginBottom: 2 }}>shop.json</div>
          <code style={{ color: C.text, fontWeight: 600 }}>{cw.jsonValue || <em style={{ color: C.muted, fontStyle: 'normal' }}>(empty)</em>}</code>
        </div>
        <div style={{ width: 1, background: C.border }} />
        <div style={{ flex: 1, padding: '6px 10px', background: '#fff1f2' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.error, marginBottom: 2 }}>customer XML</div>
          <code style={{ color: C.text, fontWeight: 600 }}>{cw.xmlValue || <em style={{ color: C.muted, fontStyle: 'normal' }}>(empty)</em>}</code>
        </div>
      </div>
    </div>
  )
}

// ─── Item Card ────────────────────────────────────────────────────────────────
function ItemCard({ item, hasJson, cwOnlyExtrinsics = [] }) {
  const [open, setOpen]   = useState(false)
  const [sub,  setSub]    = useState('template')
  const [showAll, setShowAll] = useState(false)

  const tplIssues  = item.missingExtrinsics.length + item.missingItemDetailChildren.length
  // catchWeights IS the set of all field mismatches (fieldDiffs where !isMatch) — no double count
  const cwCount     = item.catchWeights?.length || 0
  const totalIssues = tplIssues + cwCount

  const borderColor = totalIssues > 0 ? C.errorBorder : C.border
  const headerBg    = totalIssues > 0 ? '#fff1f2' : '#f8fafc'

  const visibleDiffs = showAll
    ? item.fieldDiffs.filter(d => !d.bothEmpty)
    : item.fieldDiffs.filter(d => !d.isMatch && !d.bothEmpty)

  // Group diffs
  const groups = ['Item', 'ItemDetail', 'Extrinsics']

  return (
    <div style={{ border: `1px solid ${borderColor}`, borderRadius: 9, marginBottom: 10, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.05)' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px', background: headerBg, border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 800, fontSize: 14, color: C.text }}>Line {item.lineNumber}</span>
          <code style={{ fontSize: 11, background: '#f1f5f9', padding: '1px 6px', borderRadius: 4, color: C.sub }}>{item.supplierPartID}</code>
          {item.shortName && <span style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{item.shortName}</span>}
          <span style={{ fontSize: 11, color: C.muted }}>qty: {item.quantity}</span>
          {item.xmlUOM && <Badge v="info">XML UOM: {item.xmlUOM}</Badge>}
          {hasJson && item.jsonUOM && item.jsonUOM !== item.xmlUOM && <Badge v="warning">JSON UOM: {item.jsonUOM}</Badge>}
          {item.catchWeightFlag
            ? <Badge v={item.catchWeightFlag.toLowerCase() === 'yes' ? 'warning' : 'neutral'}>CW: {item.catchWeightFlag}</Badge>
            : null}
        </div>
        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          {tplIssues > 0  && <Badge v="error">{tplIssues} template issue{tplIssues !== 1 ? 's' : ''}</Badge>}
          {cwCount > 0    && <Badge v="warning">{cwCount} value diff{cwCount !== 1 ? 's' : ''}</Badge>}
          {item.matchedByIndex && <Badge v="info">idx match</Badge>}
          {totalIssues === 0 && <Badge v="ok">✓ OK</Badge>}
          <span style={{ color: C.muted, fontSize: 12, marginLeft: 4 }}>{open ? '▾' : '▸'}</span>
        </div>
      </button>

      {open && (
        <div style={{ padding: '14px', borderTop: `1px solid ${C.border}` }}>
          <Tabs
            tabs={[
              { id: 'template',    label: 'Template Check', count: tplIssues },
              { id: 'catchweights',label: 'Value Diffs (shop.json vs XML)', count: cwCount },
              { id: 'values',      label: 'Full Field Table' },
            ]}
            active={sub} onChange={setSub}
          />

          {/* ── Template Check ── */}
          {sub === 'template' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 12, color: C.error, marginBottom: 6, textTransform: 'uppercase', letterSpacing: .5 }}>
                  Missing Extrinsics ({item.missingExtrinsics.length})
                </div>
                {item.missingExtrinsics.length === 0
                  ? <span style={{ fontSize: 12, color: C.success }}>All present ✓</span>
                  : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {item.missingExtrinsics.map(e => {
                        const isCWOnly    = cwOnlyExtrinsics.includes(e)
                        const isCWNo      = item.catchWeightFlag?.toLowerCase() !== 'yes'
                        const isExpected  = isCWOnly && isCWNo
                        return (
                          <span key={e} title={isExpected ? 'Expected missing — catch-weight-only field, CW flag is No' : 'Missing from template'}>
                            <Badge v={isExpected ? 'neutral' : 'error'}>{isExpected ? '✓ ' : ''}{e}{isExpected ? ' (CW only)' : ''}</Badge>
                          </span>
                        )
                      })}
                    </div>
                  )}

                {/* Cross-item inconsistencies */}
                {(() => {
                  const trueInconsistent = (item.missingFromUniverse || []).filter(n =>
                    !item.missingExtrinsics.includes(n) // not already shown above
                  )
                  if (!trueInconsistent.length) return null
                  const cwOnly    = trueInconsistent.filter(n => cwOnlyExtrinsics.includes(n))
                  const nonCwOnly = trueInconsistent.filter(n => !cwOnlyExtrinsics.includes(n))
                  const isCWNo    = item.catchWeightFlag?.toLowerCase() !== 'yes'
                  return (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.warning, marginBottom: 4, textTransform: 'uppercase', letterSpacing: .5 }}>
                        Present in other items but missing here
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {cwOnly.map(e => (
                          <span key={e} title={isCWNo ? 'Expected — catch-weight-only field, CW flag is No' : 'Present in other CW=Yes items'}>
                            <Badge v={isCWNo ? 'neutral' : 'warning'}>{e}{isCWNo ? ' (CW only)' : ''}</Badge>
                          </span>
                        ))}
                        {nonCwOnly.map(e => (
                          <span key={e} title="Present in other items but missing from this one">
                            <Badge v="warning">⚠ {e}</Badge>
                          </span>
                        ))}
                      </div>
                    </div>
                  )
                })()}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 12, color: '#7c3aed', marginBottom: 6, textTransform: 'uppercase', letterSpacing: .5 }}>
                  Extra Extrinsics ({item.extraExtrinsics.length})
                </div>
                {item.extraExtrinsics.length === 0
                  ? <span style={{ fontSize: 12, color: C.muted }}>None</span>
                  : <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>{item.extraExtrinsics.map(e => <Badge key={e} v="extra">{e}</Badge>)}</div>}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 12, color: C.error, marginBottom: 6, textTransform: 'uppercase', letterSpacing: .5 }}>
                  Missing ItemDetail Children ({item.missingItemDetailChildren.length})
                </div>
                {item.missingItemDetailChildren.length === 0
                  ? <span style={{ fontSize: 12, color: C.success }}>All present ✓</span>
                  : <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>{item.missingItemDetailChildren.map(e => <Badge key={e} v="error">{e}</Badge>)}</div>}
                {item.extraItemDetailChildren?.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: '#7c3aed', marginBottom: 4 }}>Extra Children</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>{item.extraItemDetailChildren.map(e => <Badge key={e} v="extra">{e}</Badge>)}</div>
                  </div>
                )}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 12, color: C.sub, marginBottom: 6, textTransform: 'uppercase', letterSpacing: .5 }}>Attribute Checks</div>
                {(item.attrChecks || []).map(ac => <Chip key={ac.attr} ok={ac.ok} label={ac.attr} expected={ac.ok ? ac.actual : ac.expected} actual={ac.ok ? null : ac.actual} />)}
              </div>
            </div>
          )}

          {/* ── Catch Weights / Value Diffs ── */}
          {sub === 'catchweights' && (
            <div>
              {!hasJson ? (
                <p style={{ color: C.muted, fontSize: 13, padding: '8px 0' }}>Upload shop.json to compare values.</p>
              ) : !item.hasJsonItem ? (
                <p style={{ color: C.warning, fontSize: 13 }}>⚠ SupplierPartID <code>{item.supplierPartID}</code> not found in shop.json{item.matchedByIndex ? ' — matched by index position' : ''}.</p>
              ) : item.catchWeights?.length === 0 ? (
                <p style={{ color: C.success, fontSize: 13 }}>All field values match between shop.json and customer XML. ✓</p>
              ) : (
                <div>
                  {item.matchedByIndex && <p style={{ color: C.info, fontSize: 12, marginBottom: 8 }}>ℹ Matched by index position (supplierId not found in shop.json).</p>}
                  {['high','warning','medium','low'].map(sev => {
                    const group = item.catchWeights.filter(cw => cw.severity === sev)
                    if (group.length === 0) return null
                    const sevLabel = { high: '🔴 High', warning: '🟡 Warning', medium: '🔵 Medium', low: '⚪ Low' }[sev]
                    return (
                      <div key={sev} style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: SEV_COLOR[sev], marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>{sevLabel} ({group.length})</div>
                        {group.map((cw, i) => <CWAlert key={i} cw={cw} />)}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Full Field Table (JSON vs XML) ── */}
          {sub === 'values' && (
            <div>
              {!hasJson ? (
                <p style={{ color: C.muted, fontSize: 13, padding: '8px 0' }}>Upload shop.json to compare values.</p>
              ) : !item.hasJsonItem ? (
                <p style={{ color: C.warning, fontSize: 13 }}>⚠ SupplierPartID <code>{item.supplierPartID}</code> not found in shop.json.</p>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    {cwCount === 0
                      ? <Badge v="ok">All {item.fieldDiffs.filter(d => !d.bothEmpty).length} field values match ✓</Badge>
                      : <Badge v="warning">{cwCount} of {item.fieldDiffs.filter(d => !d.bothEmpty).length} fields differ</Badge>}
                    <button onClick={() => setShowAll(a => !a)} style={{ fontSize: 11, color: C.info, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                      {showAll ? 'Show diffs only' : 'Show all fields'}
                    </button>
                  </div>
                  {visibleDiffs.length === 0 ? (
                    <p style={{ color: C.success, fontSize: 13 }}>No differences{showAll ? '' : ' (toggle to show all)'}. ✓</p>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            {['Field', 'JSON Value', 'XML Value', ''].map((h, i) => (
                              <th key={i} style={{ padding: '6px 10px', background: '#f8fafc', textAlign: i === 3 ? 'center' : 'left', fontSize: 11, color: C.muted, borderBottom: `2px solid ${C.border}`, fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {groups.map(g => {
                            const gRows = visibleDiffs.filter(d => d.group === g)
                            if (gRows.length === 0) return null
                            return (
                              <React.Fragment key={g}>
                                <tr><td colSpan={4} style={{ padding: '4px 10px', background: '#f8fafc', fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: .5 }}>{g}</td></tr>
                                {gRows.map(d => <Row key={d.label} label={d.label} jsonVal={d.jsonValue} xmlVal={d.xmlValue} isMatch={d.isMatch} />)}
                              </React.Fragment>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          )}


        </div>
      )}
    </div>
  )
}

// ─── Summary Bar ─────────────────────────────────────────────────────────────
function SummaryBar({ report }) {
  const items = report.items || []
  const totalTplIssues = items.reduce((s, it) => s + it.missingExtrinsics.length + it.missingItemDetailChildren.length, 0)
  // catchWeights is the authoritative set of shop.json vs XML mismatches
  const totalCW        = items.reduce((s, it) => s + (it.catchWeights?.length || 0), 0)
  const highCW         = items.reduce((s, it) => s + (it.catchWeights?.filter(cw => cw.severity === 'high').length || 0), 0)
  const headerIssues   = report.envelope.checks.filter(c => !c.ok && c.expected !== '(dynamic)').length +
                         (report.envelope.deploymentMode.ok ? 0 : 1) +
                         report.header.credentials.reduce((s, c) => s + (c.domain.ok ? 0 : 1), 0)

  const stat = (label, val, v, sub) => (
    <div style={{ textAlign: 'center', padding: '10px 20px' }}>
      <div style={{ fontSize: 28, fontWeight: 800, color: val > 0 ? (v === 'ok' ? C.success : C.error) : C.success }}>{val}</div>
      <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginTop: 2 }}>{label}</div>
      {sub != null && <div style={{ fontSize: 10, color: highCW > 0 ? C.error : C.muted, marginTop: 1 }}>{sub}</div>}
    </div>
  )

  return (
    <div style={{ display: 'flex', gap: 0, background: C.card, borderRadius: 10, border: `1px solid ${C.border}`, marginBottom: 20, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.06)', flexWrap: 'wrap' }}>
      {stat('Items', items.length, 'ok')}
      <div style={{ width: 1, background: C.border }} />
      {stat('Header Issues', headerIssues, 'error')}
      <div style={{ width: 1, background: C.border }} />
      {stat('Template Issues', totalTplIssues, 'error')}
      <div style={{ width: 1, background: C.border }} />
      {stat('Value Diffs', totalCW, 'error', `${highCW} high severity`)}
    </div>
  )
}

// ─── Header Tab ───────────────────────────────────────────────────────────────
function HeaderTab({ report }) {
  const { envelope, header, punchOutHeader } = report

  const section = (title, children) => (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontWeight: 700, fontSize: 13, color: C.text, marginBottom: 8, paddingBottom: 4, borderBottom: `1px solid ${C.border}` }}>{title}</div>
      {children}
    </div>
  )

  return (
    <div>
      {section('cXML Envelope Attributes',
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
          {envelope.checks.map(c => (
            <div key={c.field} style={{ background: '#f8fafc', borderRadius: 6, padding: '8px 12px', border: `1px solid ${c.ok ? C.border : C.errorBorder}` }}>
              <div style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>{c.field}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginTop: 2 }}>{c.actual || <em style={{ color: C.muted }}>—</em>}</div>
              {!c.ok && c.expected !== '(dynamic)' && <div style={{ fontSize: 11, color: C.error, marginTop: 2 }}>Expected: {c.expected}</div>}
            </div>
          ))}
          <div style={{ background: '#f8fafc', borderRadius: 6, padding: '8px 12px', border: `1px solid ${envelope.deploymentMode.ok ? C.border : C.errorBorder}` }}>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>Message@deploymentMode</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginTop: 2 }}>{envelope.deploymentMode.actual || <em style={{ color: C.muted }}>—</em>}</div>
            {!envelope.deploymentMode.ok && <div style={{ fontSize: 11, color: C.error, marginTop: 2 }}>Expected: {envelope.deploymentMode.expected}</div>}
          </div>
        </div>
      )}

      {section('Header Credentials',
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {header.credentials.map(c => (
            <div key={c.part} style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 12px', border: `1px solid ${c.domain.ok ? C.border : C.errorBorder}` }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: C.sub, marginBottom: 6 }}>{c.part}</div>
              <div style={{ fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: C.muted, fontWeight: 600 }}>domain: </span>
                <code style={{ background: c.domain.ok ? '#f0fdf4' : C.errorBg, padding: '1px 5px', borderRadius: 3, fontSize: 11, color: c.domain.ok ? C.success : C.error }}>{c.domain.actual || '(missing)'}</code>
                {!c.domain.ok && <span style={{ fontSize: 11, color: C.error, marginLeft: 4 }}>→ expected: {c.domain.expected}</span>}
              </div>
              <div style={{ fontSize: 12 }}>
                <span style={{ color: C.muted, fontWeight: 600 }}>identity: </span>
                <code style={{ background: '#f1f5f9', padding: '1px 5px', borderRadius: 3, fontSize: 11 }}>{c.identity.value || '(missing)'}</code>
              </div>
            </div>
          ))}
        </div>
      )}

      {section('Sender Details',
        <Chip ok={header.userAgent.ok} label="UserAgent" expected={header.userAgent.expected} actual={header.userAgent.ok ? null : header.userAgent.actual} />
      )}

      {section('PunchOutOrderMessage',
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
          <div style={{ background: '#f8fafc', borderRadius: 6, padding: '8px 12px', border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>BuyerCookie</div>
            <div style={{ fontSize: 12, fontWeight: 600, marginTop: 2, wordBreak: 'break-all' }}>{punchOutHeader.buyerCookie || <em style={{ color: C.muted }}>(empty)</em>}</div>
          </div>
          <div style={{ background: '#f8fafc', borderRadius: 6, padding: '8px 12px', border: `1px solid ${punchOutHeader.operationAllowed.ok ? C.border : C.errorBorder}` }}>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>operationAllowed</div>
            <div style={{ fontSize: 12, fontWeight: 600, marginTop: 2 }}>{punchOutHeader.operationAllowed.actual || '(missing)'}</div>
            {!punchOutHeader.operationAllowed.ok && <div style={{ fontSize: 11, color: C.error }}>Expected: {punchOutHeader.operationAllowed.expected}</div>}
          </div>
          <div style={{ background: '#f8fafc', borderRadius: 6, padding: '8px 12px', border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>Total</div>
            <div style={{ fontSize: 12, fontWeight: 600, marginTop: 2 }}>{punchOutHeader.totalValue} {punchOutHeader.totalCurrency}</div>
          </div>
          {punchOutHeader.extraFields.length > 0 && (
            <div style={{ background: C.purpleBg, borderRadius: 6, padding: '8px 12px', border: `1px solid ${C.purpleBorder}` }}>
              <div style={{ fontSize: 11, color: C.purple, fontWeight: 600 }}>Extra Fields (vs Template)</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                {punchOutHeader.extraFields.map(f => <Badge key={f} v="extra">{f}</Badge>)}
              </div>
            </div>
          )}
          {punchOutHeader.missingFields.length > 0 && (
            <div style={{ background: C.errorBg, borderRadius: 6, padding: '8px 12px', border: `1px solid ${C.errorBorder}` }}>
              <div style={{ fontSize: 11, color: C.error, fontWeight: 600 }}>Missing Fields (from Template)</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                {punchOutHeader.missingFields.map(f => <Badge key={f} v="error">{f}</Badge>)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Value Diffs Tab (global) ────────────────────────────────────────────────────────────────
function CatchWeightsTab({ items }) {
  const flagged = items.filter(it => it.catchWeights?.length > 0)
  if (flagged.length === 0) {
    return <p style={{ color: C.success, fontSize: 14 }}>No value differences detected between shop.json and customer XML. ✓</p>
  }
  return (
    <div>
      {flagged.map(item => (
        <div key={item.lineNumber} style={{ marginBottom: 22, borderBottom: `1px solid ${C.border}`, paddingBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontWeight: 800, fontSize: 14 }}>Line {item.lineNumber}</span>
            <code style={{ background: '#f1f5f9', padding: '1px 6px', borderRadius: 3, fontSize: 11 }}>{item.supplierPartID}</code>
            {item.shortName && <span style={{ fontSize: 13, color: C.sub }}>{item.shortName}</span>}
            {item.matchedByIndex && <Badge v="info">idx match</Badge>}
            <Badge v="warning">{item.catchWeights.length} diff{item.catchWeights.length !== 1 ? 's' : ''}</Badge>
          </div>
          {['high','warning','medium','low'].map(sev => {
            const group = item.catchWeights.filter(cw => cw.severity === sev)
            if (group.length === 0) return null
            const sevLabel = { high: '🔴 High', warning: '🟡 Warning', medium: '🔵 Medium', low: '⚪ Low' }[sev]
            return (
              <div key={sev} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: SEV_COLOR[sev], marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 }}>{sevLabel}</div>
                {group.map((cw, i) => <CWAlert key={i} cw={cw} />)}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// ─── Spinner (JS-driven) ─────────────────────────────────────────────────────────────────
function Spinner({ size = 26, thick = 3, color = C.primary }) {
  const [deg, setDeg] = useState(0)
  useEffect(() => { const t = setInterval(() => setDeg(d => (d + 9) % 360), 16); return () => clearInterval(t) }, [])
  return <div style={{ width: size, height: size, borderRadius: '50%', border: `${thick}px solid ${color}28`, borderTop: `${thick}px solid ${color}`, transform: `rotate(${deg}deg)`, flexShrink: 0 }} />
}

// ─── Compare Loader ────────────────────────────────────────────────────────────────
const COMPARE_STEPS = [
  'Parsing files',
  'Comparing XML against template',
  'Cross-referencing shop.json values',
  'Analysing Extrinsics & catch-weight',
  'Building comparison report',
]
function CompareLoader() {
  const [step,  setStep]  = useState(0)
  const [pulse, setPulse] = useState(true)
  useEffect(() => {
    setStep(0)
    const stepT  = setInterval(() => setStep(s => s < COMPARE_STEPS.length - 1 ? s + 1 : s), 400)
    const pulseT = setInterval(() => setPulse(p => !p), 550)
    return () => { clearInterval(stepT); clearInterval(pulseT) }
  }, [])
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`, borderRadius: 14,
      padding: '32px', marginBottom: 20, boxShadow: '0 4px 16px rgba(0,0,0,.07)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
    }}>
      <div style={{ position: 'relative', width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: `${C.primary}12`, border: `1px solid ${C.primary}22` }} />
        <Spinner size={40} thick={4} color={C.primary} />
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 4 }}>Running Comparison</div>
        <div style={{ fontSize: 12, color: C.muted }}>Analysing all items, Extrinsics and value differences</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, width: '100%', maxWidth: 400 }}>
        {COMPARE_STEPS.map((s, i) => {
          const done = i < step; const active = i === step
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 13px', borderRadius: 8,
              background: done ? C.successBg : active ? C.infoBg : '#f8fafc',
              border: `1px solid ${done ? C.successBorder : active ? C.infoBorder : C.border}`,
              opacity: i > step + 1 ? 0.4 : 1, transition: 'all .3s',
            }}>
              {done   ? <span style={{ width: 18, textAlign: 'center', fontSize: 13, color: C.success, fontWeight: 700 }}>✓</span>
               : active ? <div style={{ width: 18, height: 18, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spinner size={14} thick={2} color={C.info} /></div>
               : <span style={{ width: 18, textAlign: 'center', fontSize: 9, color: C.muted }}>&#9679;</span>}
              <span style={{ fontSize: 12, flex: 1, fontWeight: done ? 600 : active ? 700 : 400, color: done ? C.success : active ? C.info : C.muted }}>{s}</span>
              {active && <span style={{ fontSize: 10, color: C.info, opacity: pulse ? 1 : 0.2, transition: 'opacity .3s' }}>…</span>}
              {done  && <span style={{ fontSize: 10, color: C.success }}>done</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main App ───────────────────────────────────────────────────────────────────────────
export default function App() {
  const [templateText,    setTemplateText]    = useState('')
  const [customerXmlText, setCustomerXmlText] = useState('')
  const [shopJsonText,    setShopJsonText]    = useState('')
  const [report,          setReport]          = useState(null)
  const [updatedXml,      setUpdatedXml]      = useState('')
  const [mainTab,         setMainTab]         = useState('items')
  const [filterDiffs,     setFilterDiffs]     = useState(false)
  const [section,         setSection]         = useState('compare')
  const BRAND = '#008cd2'
  const [showXmlPreview,  setShowXmlPreview]  = useState(false)
  const [xmlFormatMode,   setXmlFormatMode]   = useState('formatted') // 'raw' | 'formatted'
  const [comparing,       setComparing]       = useState(false)

  const cwLogics = useMemo(() => {
    if (!report || !customerXmlText) return []
    const cwAnalysis = report._cwAnalysis
    if (!cwAnalysis) return []
    return generateCatchWeightLogics(cwAnalysis, shopJsonText, customerXmlText)
  }, [report, shopJsonText, customerXmlText])

  const onRun = () => {
    if (!templateText || !customerXmlText) {
      alert('Please upload Template XML and Customer Specific XML first.')
      return
    }
    setComparing(true)
    setTimeout(() => {
      try {
        const xmlReport  = compareXmlAgainstTemplate(templateText, customerXmlText)
        const jsonReport = shopJsonText ? compareJsonAndXml(shopJsonText, customerXmlText) : { items: [] }
        const cwAnalysis = analyzeCustomerXml(customerXmlText, templateText)

        const merged = xmlReport.items.map((xItem, idx) => {
          const jItem  = jsonReport.items.find(j => j.supplierPartID === xItem.supplierPartID) || {}
          const cwItem = cwAnalysis.itemMatrix.find(m => m.supplierPartID === xItem.supplierPartID)
                      || cwAnalysis.itemMatrix[idx]
                      || {}
          return {
            ...xItem,
            fieldDiffs:          jItem.fieldDiffs          || [],
            catchWeights:        jItem.catchWeights        || [],
            jsonUOM:             jItem.jsonUOM             || '',
            hasJsonItem:         !!jItem.hasJsonItem,
            catchWeightFlag:     xItem.catchWeightFlag     || cwItem.catchWeightFlag || '',
            missingFromUniverse: cwItem.missingFromUniverse || [],
          }
        })

        setReport({ ...xmlReport, items: merged, hasJson: !!shopJsonText, catchWeightOnlyExtrinsics: cwAnalysis.catchWeightOnlyExtrinsics, _cwAnalysis: cwAnalysis })
        try {
          setUpdatedXml(generatePoomTemplate(templateText, cwAnalysis, {
            includeExtrinsics:       cwAnalysis.extraExtrinsics,
            includePomFields:        cwAnalysis.pomExtraFields,
            catchWeightConditionals: cwAnalysis.catchWeightOnlyExtrinsics,
          }))
        } catch (_) { setUpdatedXml('') }
        setMainTab('items')
      } catch (err) {
        alert('Error running comparison: ' + err.message)
      } finally {
        setComparing(false)
      }
    }, 200)
  }

  const download = (name, text) => {
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([text], { type: 'text/plain' })), download: name })
    a.click(); URL.revokeObjectURL(a.href)
  }

  const filteredItems = useMemo(() => {
    if (!report) return []
    if (!filterDiffs) return report.items
    return report.items.filter(it =>
      it.missingExtrinsics.length > 0 ||
      it.missingItemDetailChildren.length > 0 ||
      it.catchWeights?.length > 0
    )
  }, [report, filterDiffs])

  const totalIssueItems = useMemo(() => {
    if (!report) return 0
    return report.items.filter(it =>
      it.missingExtrinsics.length > 0 ||
      it.missingItemDetailChildren.length > 0 ||
      it.catchWeights?.length > 0
    ).length
  }, [report])

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif", color: C.text }}>
      {/* Sticky header + nav wrapper */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 12px rgba(0,0,0,.3)', transition: 'box-shadow .2s' }}>
        {/* Header */}
        <div style={{ background: '#0a1628', padding: '0 28px', display: 'flex', alignItems: 'center', gap: 0, borderBottom: `3px solid ${BRAND}`, minHeight: 60, width: '100%' }}>
          {/* Sysco Logo */}
          <div style={{ display: 'flex', alignItems: 'center', paddingRight: 20, marginRight: 20, borderRight: '1px solid rgba(255,255,255,.12)' }}>
            <img
              src={syscoLogo}
              alt="Sysco"
              style={{ height: 32, objectFit: 'contain', display: 'block' }}
              onError={e => { e.target.style.display = 'none' }}
            />
          </div>
          {/* Tool name */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#f8fafc', letterSpacing: -0.3, lineHeight: 1 }}>cXML Comparator</span>
            <span style={{ fontSize: 10, color: BRAND, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', lineHeight: 1 }}>Sysco POM Tooling</span>
          </div>
          {/* Spacer */}
          <div style={{ flex: 1 }} />
          {/* Version pill */}
          <span style={{ fontSize: 11, color: '#94a3b8', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>v2.0</span>
        </div>

        {/* Section switcher */}
        <div style={{ background: '#0a1628', padding: '0 28px', display: 'flex', gap: 0, borderBottom: `2px solid #1e293b`, width: '100%' }}>
          {[
            { id: 'compare',  label: '⚖ Compare Values' },
            { id: 'generate', label: '📄 Generate POOM Template' },
            { id: 'sql',      label: '🗄 Generate SQL' },
            { id: 'help',     label: '📚 Help & Docs' },
          ].map(s => (
            <button key={s.id} onClick={() => setSection(s.id)} style={{
              padding: '11px 20px', border: 'none', cursor: 'pointer', fontWeight: 700,
              fontSize: 13, background: 'transparent',
              color: section === s.id ? '#f8fafc' : '#94a3b8',
              borderBottom: `2px solid ${section === s.id ? BRAND : 'transparent'}`,
              marginBottom: -2, transition: 'all .15s'
            }}>{s.label}</button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px' }}>
        {section === 'generate' && <GenerateSection />}
        {section === 'sql'      && <SqlSection />}
        {section === 'help'     && <HelpSection />}
        {section === 'compare' && <>
        {/* Upload section */}
        <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, padding: 20, marginBottom: 20, boxShadow: '0 1px 4px rgba(0,0,0,.05)' }}>
          <h2 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700 }}>Upload Files</h2>
          <p style={{ margin: '0 0 16px', fontSize: 12, color: C.muted }}>Template is the <strong>aramark_shop.xml</strong> style file (uses Handlebars <code>{'{{...}}'}</code>). The <strong>Customer Specific XML</strong> and <strong>Shop JSON</strong> are captured from a <strong>TradeCentric PunchOut session</strong>.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
            <UploadZone label="Template XML" accept=".xml" hint="e.g. aramark_shop.xml — uses {{Handlebars}}" value={templateText} onChange={setTemplateText} />
            <UploadZone label="Customer Specific XML" accept=".xml" hint="From TradeCentric session — cXML PunchOutOrderMessage" value={customerXmlText} onChange={setCustomerXmlText} />
            <UploadZone label="Shop JSON (optional)" accept=".json" hint="From TradeCentric session — shop source data" value={shopJsonText} onChange={setShopJsonText} />
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
            <button onClick={onRun} disabled={!templateText || !customerXmlText || comparing} style={{
              padding: '9px 24px',
              background: (!templateText || !customerXmlText) ? '#94a3b8' : comparing ? C.info : C.primary,
              color: '#fff', border: 'none', borderRadius: 8,
              cursor: (!templateText || !customerXmlText || comparing) ? 'not-allowed' : 'pointer',
              fontWeight: 700, fontSize: 14, letterSpacing: .2,
              display: 'flex', alignItems: 'center', gap: 8,
              transition: 'background .2s',
            }}>
              {comparing
                ? <><Spinner size={16} thick={2} color="#fff" /> Analysing…</>
                : <>▶ Run Comparison</>}
            </button>
            {report && (
              <>
                <button
                  onClick={() => setShowXmlPreview(p => !p)}
                  disabled={!updatedXml}
                  style={{ padding: '8px 16px', background: showXmlPreview ? C.primary : C.infoBg, color: showXmlPreview ? '#fff' : C.info, border: `1px solid ${C.infoBorder}`, borderRadius: 8, cursor: updatedXml ? 'pointer' : 'not-allowed', fontWeight: 700, fontSize: 13 }}>
                  {showXmlPreview ? '▾ Hide Template' : '👁 Preview Template'}
                </button>
                <button onClick={() => download('updated_poom_template.xml', xmlFormatMode === 'formatted' && updatedXml ? formatXml(updatedXml) : updatedXml)} disabled={!updatedXml} style={{ padding: '8px 16px', background: updatedXml ? C.successBg : '#f1f5f9', color: updatedXml ? C.success : C.muted, border: `1px solid ${updatedXml ? C.successBorder : C.border}`, borderRadius: 8, cursor: updatedXml ? 'pointer' : 'not-allowed', fontWeight: 700, fontSize: 13 }}>↓ Updated POOM Template</button>
                <button onClick={() => download('comparison_report.json', JSON.stringify(report, null, 2))} style={{ padding: '8px 16px', background: C.infoBg, color: C.info, border: `1px solid ${C.infoBorder}`, borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>↓ Report JSON</button>
              </>
            )}
          </div>
        </div>

        {/* Compare Loader */}
        {comparing && <CompareLoader />}

        {/* Inline XML preview panel */}
        {!comparing && showXmlPreview && updatedXml && (
          <XmlPreviewPanel
            xml={updatedXml}
            formatMode={xmlFormatMode}
            onToggleFormat={() => setXmlFormatMode(m => m === 'formatted' ? 'raw' : 'formatted')}
            onDownload={() => download('updated_poom_template.xml', xmlFormatMode === 'formatted' ? formatXml(updatedXml) : updatedXml)}
          />
        )}

        {/* Results */}
        {!comparing && report && (
          <div>
            <SummaryBar report={report} />

            {/* Template requirements info */}
            <details style={{ marginBottom: 16, background: C.card, border: `1px solid ${C.border}`, borderRadius: 9, padding: '10px 14px' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: 13, color: C.sub }}>Template Requirements</summary>
              <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 6 }}>Required Extrinsics ({report.template.requiredExtrinsics.length})</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>{report.template.requiredExtrinsics.map(e => <Badge key={e} v="neutral">{e}</Badge>)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 6 }}>Required ItemDetail Children ({report.template.requiredChildren.length})</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>{report.template.requiredChildren.map(e => <Badge key={e} v="neutral">{e}</Badge>)}</div>
                </div>
              </div>
            </details>

            <Tabs
              tabs={[
                { id: 'items',       label: 'Items',         count: report.items.length },
                { id: 'header',      label: 'Header & Envelope' },
                { id: 'catchweights', label: 'Value Diffs (shop.json ↔ XML)', count: report.items.filter(it => it.catchWeights?.length > 0).length },
                { id: 'cwlogics',    label: '⚡ CW & Transform Logics', count: cwLogics.filter(l => l.triggered).length },
              ]}
              active={mainTab} onChange={setMainTab}
            />

            {mainTab === 'header' && <div style={{ background: C.card, borderRadius: 10, border: `1px solid ${C.border}`, padding: 16 }}><HeaderTab report={report} /></div>}

            {mainTab === 'catchweights' && <div style={{ background: C.card, borderRadius: 10, border: `1px solid ${C.border}`, padding: 16 }}><CatchWeightsTab items={report.items} /></div>}

            {mainTab === 'cwlogics' && (
              <CatchWeightLogicsPanel logics={cwLogics} />
            )}

            {mainTab === 'items' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 13, color: C.muted }}>{filteredItems.length} of {report.items.length} items shown</span>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', fontWeight: 600, color: C.sub }}>
                    <input type="checkbox" checked={filterDiffs} onChange={e => setFilterDiffs(e.target.checked)} />
                    Show only items with issues ({totalIssueItems})
                  </label>
                </div>
                {filteredItems.map(item => <ItemCard key={item.lineNumber} item={item} hasJson={report.hasJson} cwOnlyExtrinsics={report.catchWeightOnlyExtrinsics || []} />)}
                {filteredItems.length === 0 && <p style={{ color: C.success, fontSize: 14, textAlign: 'center', padding: 32 }}>All items look good! ✓</p>}
              </div>
            )}
          </div>
        )}
        </>}
      </div>
    </div>
  )
}

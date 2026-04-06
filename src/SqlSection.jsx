import React, { useState, useCallback, useMemo } from 'react'
import initialCsvRaw from '../sample/customers.csv?raw'

// ─── Design tokens (same palette as rest of app) ──────────────────────────────
const C = {
  bg: '#f1f5f9', card: '#ffffff', border: '#e2e8f0',
  primary: '#2563eb', primaryDark: '#1d4ed8',
  success: '#16a34a', successBg: '#dcfce7', successBorder: '#86efac',
  error:   '#dc2626', errorBg:   '#fee2e2', errorBorder:   '#fca5a5',
  warning: '#b45309', warningBg: '#fef3c7', warningBorder: '#fde68a',
  info:    '#0369a1', infoBg:    '#e0f2fe', infoBorder:    '#7dd3fc',
  purple:  '#7c3aed', purpleBg:  '#f5f3ff', purpleBorder:  '#c4b5fd',
  teal:    '#0d9488', tealBg:    '#f0fdfa', tealBorder:    '#99f6e4',
  muted: '#6b7280', text: '#1e293b', sub: '#475569',
}

// ─── Random 15-char uppercase alphanumeric key ────────────────────────────────
const REF_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
function generateRef() {
  return Array.from({ length: 15 }, () =>
    REF_CHARS[Math.floor(Math.random() * REF_CHARS.length)]
  ).join('')
}

// ─── Primitives ───────────────────────────────────────────────────────────────
function Label({ children, required }) {
  return (
    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.sub, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.4 }}>
      {children}
      {required && <span style={{ color: C.error, marginLeft: 3 }}>✱</span>}
    </label>
  )
}

function Field({ label, required, children, hint }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <Label required={required}>{label}</Label>
      {children}
      {hint && <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>{hint}</div>}
    </div>
  )
}

const inputStyle = (extra = {}) => ({
  width: '100%', boxSizing: 'border-box',
  padding: '8px 11px', border: `1px solid ${C.border}`, borderRadius: 7,
  fontSize: 13, fontFamily: 'inherit', color: C.text,
  background: C.card, outline: 'none',
  ...extra,
})

const selectStyle = () => ({
  ...inputStyle(), cursor: 'pointer', appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236b7280' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', backgroundSize: 12, paddingRight: 30,
})

function RefInput({ label, value, onRegenerate, onChange, hint }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard?.writeText(value).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 1500)
    })
  }
  return (
    <div style={{ marginBottom: 16 }}>
      <Label required>{label}</Label>
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          value={value}
          onChange={e => onChange(e.target.value.toUpperCase().slice(0, 15))}
          spellCheck={false}
          maxLength={15}
          style={{ ...inputStyle(), flex: 1, fontFamily: 'ui-monospace, Consolas, monospace', fontWeight: 700, letterSpacing: 1, color: C.teal }}
        />
        <button
          onClick={onRegenerate}
          title="Regenerate"
          style={{ padding: '8px 12px', border: `1px solid ${C.border}`, borderRadius: 7, background: '#f8fafc', cursor: 'pointer', fontSize: 14, color: C.sub, fontWeight: 700 }}>
          ↺
        </button>
        <button
          onClick={copy}
          style={{ padding: '8px 11px', border: `1px solid ${copied ? C.successBorder : C.border}`, borderRadius: 7, background: copied ? C.successBg : '#f8fafc', cursor: 'pointer', fontSize: 11, color: copied ? C.success : C.sub, fontWeight: 700, whiteSpace: 'nowrap' }}>
          {copied ? '✓' : '⧉'}
        </button>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        {hint && <div style={{ fontSize: 10, color: C.muted }}>{hint}</div>}
        <div style={{ fontSize: 10, color: value.length === 15 ? C.success : C.warning, marginLeft: 'auto' }}>
          {value.length}/15 chars{value.length === 15 ? ' ✓' : ' (need 15)'}
        </div>
      </div>
    </div>
  )
}

function Toggle({ value, onChange, label }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
      }}>
      <div style={{
        width: 38, height: 22, borderRadius: 11,
        background: value ? C.primary : C.border,
        position: 'relative', transition: 'background .2s', flexShrink: 0,
      }}>
        <div style={{
          position: 'absolute', top: 3, left: value ? 19 : 3,
          width: 16, height: 16, borderRadius: 8, background: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,.2)', transition: 'left .2s',
        }} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{label}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color: value ? C.primary : C.muted }}>{value ? 'true' : 'false'}</span>
    </button>
  )
}

// ─── SQL builder ──────────────────────────────────────────────────────────────
// dbTarget: 'dev' → customer_id_seq, ::enum_customer_environment, includes is_esysco
// dbTarget: 'prod' → customer_id_seq1, ::environment_enum, NO is_esysco
function buildSql({ customerRef, nullCustomerRef, name, internalName, orderApprovalRef, nullOrderApprovalRef, credentialMode, environment, customerConfig, thirdParty, broadline, isSftpPoApproval, isEsysco, credIdentity, credSharedSecret, extraFields = [], dbTarget = 'dev' }) {
  const isProd = dbTarget === 'prod'
  const seqName = isProd ? 'customer_id_seq1' : 'customer_id_seq'
  const envCast = isProd ? '::environment_enum' : '::enum_customer_environment'
  let configVal = 'null'
  if (credentialMode === 'PARTNER_BASED') {
    const obj = { commonCredentials: { identity: credIdentity, sharedSecret: credSharedSecret } }
    configVal = `'${JSON.stringify(obj)}'`
  }

  const cols = [
    'id', 'customer_ref', '"name"', 'created_at', 'internal_name',
    'order_approval_customer_ref', 'credential_mode', 'environment',
    'customer_config', 'third_party', 'broadline',
    'is_sftp_po_approval_customer',
    ...(isProd ? [] : ['is_esysco']),
  ]
  const vals = [
    `nextval('${seqName}'::regclass)`,
    nullCustomerRef ? 'null' : `'${customerRef}'`,
    `'${name.replace(/'/g, "''")}'`,
    `now()`,
    `'${internalName.replace(/'/g, "''")}'`,
    nullOrderApprovalRef ? 'null' : `'${orderApprovalRef}'`,
    `'${credentialMode}'`,
    `'${environment}'${envCast}`,
    configVal,
    `'${thirdParty.replace(/'/g, "''")}'`,
    `'${broadline}'::broadline_enum`,
    String(isSftpPoApproval),
    ...(isProd ? [] : [String(isEsysco)]),
  ]

  // Append extra fields
  for (const f of extraFields) {
    if (!f.column.trim()) continue
    const colName = f.column.trim()
    cols.push(colName.includes(' ') ? `"${colName}"` : colName)
    if (f.type === 'null')    vals.push('null')
    else if (f.type === 'boolean') vals.push(f.value === 'true' ? 'true' : 'false')
    else if (f.type === 'raw')     vals.push(f.value || 'null')
    else                           vals.push(`'${(f.value || '').replace(/'/g, "''")}'`)
  }

  return (
    `INSERT INTO public.customer\n` +
    `(${cols.join(', ')})\n` +
    `VALUES(${vals.join(', ')});`
  )
}

// ─── Extra Fields Card ────────────────────────────────────────────────────────
const VALUE_TYPES = [
  { value: 'string',  label: "'string'" ,  hint: 'Quoted text',           color: '#fcd34d' },
  { value: 'raw',     label: 'raw / expr',  hint: 'Inserted as-is (casts, functions, JSON)', color: '#6ee7b7' },
  { value: 'boolean', label: 'boolean',     hint: 'true or false',         color: '#fb923c' },
  { value: 'null',    label: 'null',        hint: 'NULL value',            color: '#94a3b8' },
]

function newField() {
  return { id: Math.random().toString(36).slice(2), column: '', value: '', type: 'string' }
}

function ExtraFieldsCard({ fields, onChange }) {
  const addField  = () => onChange([...fields, newField()])
  const removeField = id => onChange(fields.filter(f => f.id !== id))
  const updateField = (id, key, val) => onChange(fields.map(f => f.id === id ? { ...f, [key]: val } : f))

  const typeInfo = t => VALUE_TYPES.find(x => x.value === t) || VALUE_TYPES[0]

  return (
    <SCard title="Extra Fields" icon="➕" accent="info">
      <div style={{ background: C.infoBg, border: `1px solid ${C.infoBorder}`, borderRadius: 7, padding: '8px 12px', marginBottom: 14, fontSize: 11, color: C.info, lineHeight: 1.6 }}>
        Add any new columns that should be included in the query. These are appended after the standard fields.
        Use <strong>raw / expr</strong> type for casts (<code>::some_type</code>), functions (<code>now()</code>), or JSON strings.
      </div>

      {fields.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          {/* Header row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 140px 32px', gap: 8, marginBottom: 6, padding: '0 2px' }}>
            {['Column name', 'Value', 'Type', ''].map((h, i) => (
              <div key={i} style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.4 }}>{h}</div>
            ))}
          </div>

          {fields.map((f, idx) => {
            const ti = typeInfo(f.type)
            const isNull = f.type === 'null'
            const isBool = f.type === 'boolean'
            return (
              <div key={f.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 140px 32px', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                {/* Column name */}
                <input
                  value={f.column}
                  onChange={e => updateField(f.id, 'column', e.target.value)}
                  placeholder={`column_name`}
                  style={{
                    ...inputStyle({ padding: '7px 10px' }),
                    fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 12, color: C.teal,
                    background: f.column ? C.card : '#fffbeb',
                    border: `1px solid ${f.column ? C.border : C.warningBorder}`,
                  }}
                />
                {/* Value */}
                {isNull ? (
                  <div style={{ ...inputStyle({ padding: '7px 10px' }), fontSize: 12, color: C.muted, fontStyle: 'italic', background: '#f8fafc', cursor: 'not-allowed' }}>null</div>
                ) : isBool ? (
                  <select
                    value={f.value}
                    onChange={e => updateField(f.id, 'value', e.target.value)}
                    style={{ ...selectStyle(), padding: '7px 28px 7px 10px', fontSize: 12, fontFamily: 'ui-monospace, Consolas, monospace', color: '#fb923c', fontWeight: 700 }}
                  >
                    <option value="true">true</option>
                    <option value="false">false</option>
                  </select>
                ) : (
                  <input
                    value={f.value}
                    onChange={e => updateField(f.id, 'value', e.target.value)}
                    placeholder={f.type === 'raw' ? `e.g. now(), 'val'::type` : `value`}
                    style={{
                      ...inputStyle({ padding: '7px 10px' }),
                      fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 12,
                      color: ti.color,
                      background: '#1e293b',
                    }}
                  />
                )}
                {/* Type */}
                <select
                  value={f.type}
                  onChange={e => updateField(f.id, 'type', e.target.value)}
                  style={{ ...selectStyle(), padding: '7px 26px 7px 8px', fontSize: 11, fontWeight: 700, color: ti.color, background: '#1e293b', border: `1px solid #334155` }}
                >
                  {VALUE_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                {/* Remove */}
                <button
                  onClick={() => removeField(f.id)}
                  title={`Remove ${f.column || `field ${idx + 1}`}`}
                  style={{ width: 32, height: 32, border: `1px solid ${C.errorBorder}`, borderRadius: 6, background: C.errorBg, color: C.error, cursor: 'pointer', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                >
                  ×
                </button>
              </div>
            )
          })}
        </div>
      )}

      {fields.length === 0 && (
        <div style={{ textAlign: 'center', padding: '18px 0 10px', color: C.muted, fontSize: 12 }}>
          No extra fields yet. Click <strong>+ Add Field</strong> to add a new column.
        </div>
      )}

      <button
        onClick={addField}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', border: `1.5px dashed ${C.infoBorder}`, borderRadius: 7, background: C.infoBg, color: C.info, cursor: 'pointer', fontWeight: 700, fontSize: 12 }}
      >
        + Add Field
      </button>
    </SCard>
  )
}


function SqlPreview({ sql, label, dbTarget = 'dev' }) {
  const [copied, setCopied] = useState(false)
  const isProd = dbTarget === 'prod'

  const copy = () => {
    navigator.clipboard?.writeText(sql).then(
      () => { setCopied(true); setTimeout(() => setCopied(false), 2000) }
    )
  }

  // Syntax highlight
  const highlighted = sql
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\b(INSERT INTO|VALUES|public)\b/g, m => `<span style="color:#a78bfa;font-weight:700">${m}</span>`)
    .replace(/\b(nextval|now)\b/g, m => `<span style="color:#6ee7b7">${m}</span>`)
    .replace(/::[a-z_]+/g, m => `<span style="color:#fbbf24">${m}</span>`)
    .replace(/'([^']*)'/g, (_, v) => `'<span style="color:#fcd34d">${v}</span>'`)
    .replace(/\b(true|false|null)\b/g, m => `<span style="color:#fb923c;font-weight:700">${m}</span>`)
    .replace(/(?<=\()([^)]+)(?=\))/, cols =>
      cols.split(',').map(c => `<span style="color:#93c5fd">${c}</span>`).join(',')
    )

  const headerBg   = isProd ? '#fef3c7' : C.infoBg
  const headerColor = isProd ? C.warning : C.info
  const headerBorder = isProd ? C.warningBorder : C.infoBorder

  return (
    <div style={{ background: C.card, border: `1px solid ${isProd ? C.warningBorder : C.border}`, borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: headerBg, borderBottom: `1px solid ${headerBorder}` }}>
        {label && (
          <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 10px', borderRadius: 4, background: isProd ? '#b45309' : C.primary, color: '#fff', letterSpacing: 0.4, flexShrink: 0 }}>
            {label}
          </span>
        )}
        <span style={{ fontSize: 12, fontWeight: 700, color: headerColor, flex: 1 }}>
          {isProd ? 'PROD — customer_id_seq1, environment_enum, no is_esysco' : 'DEV — customer_id_seq, enum_customer_environment, is_esysco included'}
        </span>
        <button
          onClick={copy}
          style={{ padding: '4px 14px', border: `1px solid ${copied ? C.successBorder : headerBorder}`, borderRadius: 5, cursor: 'pointer', fontWeight: 700, fontSize: 11, background: copied ? C.successBg : 'transparent', color: copied ? C.success : headerColor }}>
          {copied ? '✓ Copied!' : '⧉ Copy SQL'}
        </button>
      </div>
      <pre
        dangerouslySetInnerHTML={{ __html: highlighted }}
        style={{ background: '#1e293b', color: '#e2e8f0', padding: '16px 20px', overflowX: 'auto', fontSize: 12.5, lineHeight: 1.7, fontFamily: 'ui-monospace, Cascadia Code, Consolas, monospace', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}
      />
    </div>
  )
}

// ─── SCard ────────────────────────────────────────────────────────────────────
function SCard({ title, icon, children, accent = 'info' }) {
  const accentMap = {
    info:    { border: C.infoBorder,    bg: C.infoBg,    color: C.info    },
    success: { border: C.successBorder, bg: C.successBg, color: C.success },
    purple:  { border: C.purpleBorder,  bg: C.purpleBg,  color: C.purple  },
    warn:    { border: C.warningBorder,  bg: C.warningBg, color: C.warning },
  }
  const a = accentMap[accent] || accentMap.info
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, marginBottom: 16, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.05)' }}>
      <div style={{ background: a.bg, borderBottom: `1px solid ${a.border}`, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
        {icon && <span style={{ fontSize: 14 }}>{icon}</span>}
        <span style={{ fontWeight: 700, fontSize: 13, color: a.color }}>{title}</span>
      </div>
      <div style={{ padding: '14px 16px' }}>{children}</div>
    </div>
  )
}

// ─── CSV Parser ───────────────────────────────────────────────────────────────
function parseCSVLine(line) {
  const result = []
  let cur = '', inQ = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++ }
      else inQ = !inQ
    } else if (ch === ',' && !inQ) {
      result.push(cur); cur = ''
    } else {
      cur += ch
    }
  }
  result.push(cur)
  return result
}

function parseCSV(text) {
  if (!text || !text.trim()) return []
  const lines = text.trim().split('\n').filter(Boolean)
  if (lines.length < 2) return []
  const rawHeaders = parseCSVLine(lines[0])
  const headers = rawHeaders.map(h => h.replace(/^"|"$/g, '').trim())
  return lines.slice(1).map((line, _i) => {
    const vals = parseCSVLine(line)
    const obj = {}
    headers.forEach((h, j) => { obj[h] = (vals[j] || '').replace(/^"|"$/g, '') })
    return obj
  })
}

// ─── Row SQL builders ─────────────────────────────────────────────────────────
function sqlStr(v) {
  return v && v.trim() ? `'${v.replace(/'/g, "''")}'` : 'null'
}

function buildInsertFromRow(row, extraFields = [], dbTarget = 'dev') {
  const isProd = dbTarget === 'prod'
  const seqName = isProd ? 'customer_id_seq1' : 'customer_id_seq'
  const envCast = isProd ? '::environment_enum' : '::enum_customer_environment'
  const cc = row.customer_config || ''
  const configVal = (!cc || cc === '{}' || cc === 'null' || cc === '""')
    ? 'null' : `'${cc.replace(/'/g, "''")}'`

  const cols = [
    'id', 'customer_ref', '"name"', 'created_at', 'internal_name',
    'order_approval_customer_ref', 'credential_mode', 'environment',
    'customer_config', 'third_party', 'broadline',
    'is_sftp_po_approval_customer',
    ...(isProd ? [] : ['is_esysco']),
  ]
  const vals = [
    `nextval('${seqName}'::regclass)`,
    sqlStr(row.customer_ref),
    sqlStr(row.name),
    `now()`,
    sqlStr(row.internal_name),
    row.order_approval_customer_ref && row.order_approval_customer_ref.trim()
      ? `'${row.order_approval_customer_ref}'` : 'null',
    `'${row.credential_mode || 'USER_BASED'}'`,
    `'${row.environment || 'Production'}'${envCast}`,
    configVal,
    row.third_party && row.third_party.trim() ? sqlStr(row.third_party) : 'null',
    row.broadline && row.broadline.trim()
      ? `'${row.broadline}'::broadline_enum` : 'null',
    row.is_sftp_po_approval_customer === 'true' ? 'true' : 'false',
    ...(isProd ? [] : [row.is_esysco === 'true' ? 'true' : 'false']),
  ]
  for (const f of extraFields) {
    if (!f.column.trim()) continue
    const colName = f.column.trim()
    cols.push(colName.includes(' ') ? `"${colName}"` : colName)
    if (f.type === 'null')         vals.push('null')
    else if (f.type === 'boolean') vals.push(f.value === 'true' ? 'true' : 'false')
    else if (f.type === 'raw')     vals.push(f.value || 'null')
    else                           vals.push(`'${(f.value || '').replace(/'/g, "''")}'`)
  }
  return `INSERT INTO public.customer\n(${cols.join(', ')})\nVALUES(${vals.join(', ')});`
}

function buildUpdateFromRow(row, extraFields = [], dbTarget = 'dev') {
  const isProd = dbTarget === 'prod'
  const envCast = isProd ? '::environment_enum' : '::enum_customer_environment'
  const cc = row.customer_config || ''
  const configVal = (!cc || cc === '{}' || cc === 'null' || cc === '""')
    ? 'null' : `'${cc.replace(/'/g, "''")}'`

  const sets = [
    `customer_ref = '${row.customer_ref}'`,
    `"name" = ${sqlStr(row.name)}`,
    `internal_name = ${sqlStr(row.internal_name)}`,
    `order_approval_customer_ref = ${row.order_approval_customer_ref && row.order_approval_customer_ref.trim() ? `'${row.order_approval_customer_ref}'` : 'null'}`,
    `credential_mode = '${row.credential_mode || 'USER_BASED'}'`,
    `environment = '${row.environment || 'Production'}'${envCast}`,
    `customer_config = ${configVal}`,
    `third_party = ${row.third_party && row.third_party.trim() ? sqlStr(row.third_party) : 'null'}`,
    `broadline = ${row.broadline && row.broadline.trim() ? `'${row.broadline}'::broadline_enum` : 'null'}`,
    `is_sftp_po_approval_customer = ${row.is_sftp_po_approval_customer === 'true' ? 'true' : 'false'}`,
    ...(isProd ? [] : [`is_esysco = ${row.is_esysco === 'true' ? 'true' : 'false'}`]),
  ]
  for (const f of extraFields) {
    if (!f.column.trim()) continue
    const colName = f.column.trim()
    const colExpr = colName.includes(' ') ? `"${colName}"` : colName
    let valExpr
    if (f.type === 'null')         valExpr = 'null'
    else if (f.type === 'boolean') valExpr = f.value === 'true' ? 'true' : 'false'
    else if (f.type === 'raw')     valExpr = f.value || 'null'
    else                           valExpr = `'${(f.value || '').replace(/'/g, "''")}'`
    sets.push(`${colExpr} = ${valExpr}`)
  }
  return `UPDATE public.customer\nSET ${sets.join(',\n    ')}\nWHERE id = ${row.id};`
}

// ─── Shared grid layout constant (header + rows must match exactly) ─────────────
const CUST_GRID = '30px 42px minmax(160px,1fr) 88px 50px 74px minmax(60px,80px) 234px'

// ─── Serialise customers array back to CSV text ───────────────────────────────
const CSV_HEADERS = [
  'id', 'customer_ref', 'name', 'created_at', 'internal_name',
  'order_approval_customer_ref', 'credential_mode', 'environment',
  'customer_config', 'third_party', 'broadline',
  'is_sftp_po_approval_customer', 'is_esysco',
]
function escapeCsvCell(val) {
  const s = val == null ? '' : String(val)
  return (s.includes(',') || s.includes('"') || s.includes('\n'))
    ? `"${s.replace(/"/g, '""')}"` : s
}
function serializeCSV(rows) {
  const header = CSV_HEADERS.join(',')
  const body = rows.map(r => CSV_HEADERS.map(h => escapeCsvCell(r[h])).join(',')).join('\n')
  return `${header}\n${body}`
}

// ─── Copy button ──────────────────────────────────────────────────────────────
function CopyBtn({ sql, label, accent = 'neutral', small = false }) {
  const [done, setDone] = useState(false)
  const copy = e => {
    e.stopPropagation()
    navigator.clipboard?.writeText(sql).then(() => {
      setDone(true); setTimeout(() => setDone(false), 1800)
    })
  }
  const palettes = {
    insert:  { bg: C.infoBg,   border: C.infoBorder,   color: C.info   },
    update:  { bg: C.purpleBg, border: C.purpleBorder, color: C.purple },
    neutral: { bg: '#f8fafc',  border: C.border,        color: C.sub    },
  }
  const s = palettes[accent] || palettes.neutral
  return (
    <button
      onClick={copy}
      style={{
        padding: small ? '3px 8px' : '4px 10px',
        border: `1px solid ${done ? C.successBorder : s.border}`,
        borderRadius: 5, cursor: 'pointer', fontWeight: 700,
        fontSize: small ? 10 : 11,
        background: done ? C.successBg : s.bg,
        color: done ? C.success : s.color,
        whiteSpace: 'nowrap', transition: 'all .15s',
      }}
    >
      {done ? '✓ Copied' : label}
    </button>
  )
}

// ─── Inline SQL mini-preview ──────────────────────────────────────────────────
function SqlMini({ sql }) {
  const hl = sql
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\b(INSERT INTO|UPDATE|SET|VALUES|WHERE|public)\b/g, m => `<span style="color:#a78bfa;font-weight:700">${m}</span>`)
    .replace(/\b(nextval|now)\b/g, m => `<span style="color:#6ee7b7">${m}</span>`)
    .replace(/::[a-z_]+/g, m => `<span style="color:#fbbf24">${m}</span>`)
    .replace(/'([^']*)'/g, (_, v) => `'<span style="color:#fcd34d">${v}</span>'`)
    .replace(/\b(true|false|null)\b/g, m => `<span style="color:#fb923c;font-weight:700">${m}</span>`)
  return (
    <pre
      dangerouslySetInnerHTML={{ __html: hl }}
      style={{
        background: '#1e293b', color: '#e2e8f0',
        padding: '10px 14px', borderRadius: 7,
        fontSize: 11, lineHeight: 1.6,
        fontFamily: 'ui-monospace, Cascadia Code, Consolas, monospace',
        margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all',
        maxHeight: 150, overflow: 'auto',
      }}
    />
  )
}

// ─── Customer Row ─────────────────────────────────────────────────────────────
function CustomerRow({ row: initRow, onSave, index }) {
  const [editing, setEditing]               = useState(false)
  const [row, setRow]                       = useState({ ...initRow })
  const [rowExtraFields, setRowExtraFields] = useState([])
  const [rowDb,          setRowDb]          = useState('dev')

  const set = (k, v) => setRow(r => ({ ...r, [k]: v }))

  const currentRow    = editing ? row : initRow
  const insertSqlDev  = buildInsertFromRow(currentRow, editing ? rowExtraFields : [], 'dev')
  const updateSqlDev  = buildUpdateFromRow(currentRow, editing ? rowExtraFields : [], 'dev')
  const insertSqlProd = buildInsertFromRow(currentRow, editing ? rowExtraFields : [], 'prod')
  const updateSqlProd = buildUpdateFromRow(currentRow, editing ? rowExtraFields : [], 'prod')
  const insertSql     = rowDb === 'prod' ? insertSqlProd : insertSqlDev
  const updateSql     = rowDb === 'prod' ? updateSqlProd : updateSqlDev

  const save = () => { onSave(row); setEditing(false) }
  const cancel = () => { setRow({ ...initRow }); setRowExtraFields([]); setEditing(false) }

  const modeIs = mode => (editing ? row : initRow).credential_mode === mode
  const envIs  = env  => (editing ? row : initRow).environment === env

  return (
    <div style={{ border: `1px solid ${editing ? C.purpleBorder : C.border}`, borderRadius: 8, marginBottom: 6, overflow: 'hidden', background: editing ? '#faf5ff' : C.card, transition: 'border .15s, background .15s' }}>

      {/* ── Compact summary row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: CUST_GRID, gap: 8, padding: '10px 12px', alignItems: 'center' }}>

        {/* # index */}
        <div style={{ fontFamily: 'ui-monospace, Consolas, monospace', fontWeight: 700, fontSize: 11, color: C.border, textAlign: 'right' }}>{index + 1}</div>

        {/* ID */}
        <div style={{ fontFamily: 'ui-monospace, Consolas, monospace', fontWeight: 800, fontSize: 12, color: C.muted }}>{initRow.id}</div>

        {/* Name + internal_name */}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {editing ? row.name : initRow.name}
          </div>
          <div style={{ fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 10, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {editing ? row.internal_name : initRow.internal_name}
          </div>
        </div>

        {/* Cred mode */}
        <span style={{
          display: 'inline-block', padding: '2px 6px', borderRadius: 4,
          fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap',
          background: modeIs('PARTNER_BASED') ? C.purpleBg : C.tealBg,
          color: modeIs('PARTNER_BASED') ? C.purple : C.teal,
          border: `1px solid ${modeIs('PARTNER_BASED') ? C.purpleBorder : C.tealBorder}`,
        }}>
          {modeIs('PARTNER_BASED') ? 'PARTNER' : 'USER'}
        </span>

        {/* Broadline */}
        <span style={{ display: 'inline-block', padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: C.infoBg, color: C.info, border: `1px solid ${C.infoBorder}` }}>
          {initRow.broadline || '–'}
        </span>

        {/* Environment */}
        <span style={{
          display: 'inline-block', padding: '2px 6px', borderRadius: 4,
          fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap',
          background: envIs('Production') ? C.successBg : C.warningBg,
          color: envIs('Production') ? C.success : C.warning,
          border: `1px solid ${envIs('Production') ? C.successBorder : C.warningBorder}`,
        }}>
          {initRow.environment || '–'}
        </span>

        {/* Third party */}
        <div style={{ fontSize: 11, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={initRow.third_party}>
          {initRow.third_party || <em style={{ color: C.border }}>–</em>}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 5, alignItems: 'center', justifyContent: 'flex-end', flexShrink: 0 }}>
          {/* DEV / PROD toggle pill */}
          <div style={{ display: 'flex', border: `1px solid ${C.border}`, borderRadius: 5, overflow: 'hidden', flexShrink: 0 }}>
            {['dev', 'prod'].map(db => (
              <button
                key={db}
                onClick={e => { e.stopPropagation(); setRowDb(db) }}
                style={{
                  padding: '3px 8px', border: 'none', cursor: 'pointer',
                  fontWeight: 800, fontSize: 10,
                  background: rowDb === db ? (db === 'prod' ? '#b45309' : C.primary) : '#f8fafc',
                  color: rowDb === db ? '#fff' : C.muted,
                  letterSpacing: 0.3,
                }}
              >
                {db.toUpperCase()}
              </button>
            ))}
          </div>
          <CopyBtn sql={insertSql} label="⧉ INSERT" accent="insert" />
          <CopyBtn sql={updateSql} label="⧉ UPDATE" accent="update" />
          <button
            onClick={e => { e.stopPropagation(); setEditing(ex => !ex) }}
            style={{
              padding: '4px 10px',
              border: `1px solid ${editing ? C.warningBorder : C.border}`,
              borderRadius: 5, cursor: 'pointer', fontWeight: 700, fontSize: 11,
              background: editing ? C.warningBg : '#f8fafc',
              color: editing ? C.warning : C.sub, whiteSpace: 'nowrap',
            }}
          >
            {editing ? '✕ Cancel' : '✏ Edit'}
          </button>
        </div>
      </div>

      {/* ── Edit pane ── */}
      {editing && (
        <div style={{ borderTop: `1px solid ${C.purpleBorder}`, padding: '16px 16px 14px' }}>

          {/* Fields grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 14 }}>
            <div>
              <Label>Customer Name</Label>
              <input value={row.name} onChange={e => set('name', e.target.value)} style={inputStyle({ fontSize: 12 })} />
            </div>
            <div>
              <Label>Internal Name</Label>
              <input value={row.internal_name} onChange={e => set('internal_name', e.target.value)} style={inputStyle({ fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 12, color: C.teal })} />
            </div>
            <div>
              <Label>Third Party</Label>
              <input value={row.third_party} onChange={e => set('third_party', e.target.value)} style={inputStyle({ fontSize: 12 })} />
            </div>
            <div>
              <Label>Customer Ref</Label>
              <input value={row.customer_ref} onChange={e => set('customer_ref', e.target.value.toUpperCase().slice(0, 15))} style={inputStyle({ fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 12, color: C.teal, letterSpacing: 1 })} maxLength={15} />
            </div>
            <div>
              <Label>Order Approval Ref</Label>
              <input value={row.order_approval_customer_ref} onChange={e => set('order_approval_customer_ref', e.target.value.toUpperCase().slice(0, 15))} style={inputStyle({ fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 12, color: C.teal, letterSpacing: 1 })} maxLength={15} />
            </div>
            <div>
              <Label>Credential Mode</Label>
              <select value={row.credential_mode} onChange={e => set('credential_mode', e.target.value)} style={selectStyle()}>
                <option value="USER_BASED">USER_BASED</option>
                <option value="PARTNER_BASED">PARTNER_BASED</option>
              </select>
            </div>
            <div>
              <Label>Environment</Label>
              <select value={row.environment} onChange={e => set('environment', e.target.value)} style={selectStyle()}>
                <option value="Production">Production</option>
                <option value="Test">Test</option>
              </select>
            </div>
            <div>
              <Label>Broadline</Label>
              <select value={row.broadline} onChange={e => set('broadline', e.target.value)} style={selectStyle()}>
                <option value="">— (none)</option>
                <option value="USBL">USBL</option>
                <option value="CABL">CABL</option>
              </select>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <Label style={{ marginBottom: 0 }}>Customer Config JSON</Label>
                {(!row.customer_config || row.customer_config === 'null') ? (
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 8px', borderRadius: 4, background: C.warningBg, color: C.warning, border: `1px solid ${C.warningBorder}` }}>
                    ⊘ null
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => set('customer_config', '')}
                    title="Clear to SQL null"
                    style={{ padding: '1px 8px', borderRadius: 4, border: `1px solid ${C.border}`, cursor: 'pointer', fontSize: 10, fontWeight: 700, background: '#f8fafc', color: C.muted }}
                  >
                    ✕ set null
                  </button>
                )}
              </div>
              <input
                value={row.customer_config}
                onChange={e => set('customer_config', e.target.value)}
                style={inputStyle({
                  fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 11,
                  color: (!row.customer_config || row.customer_config === 'null') ? C.muted : '#fbbf24',
                  fontStyle: (!row.customer_config || row.customer_config === 'null') ? 'italic' : 'normal',
                })}
                placeholder={(!row.customer_config || row.customer_config === 'null') ? '— SQL null — type to override —' : '{"commonCredentials":{...}}'}
              />
            </div>
          </div>

          {/* Toggles */}
          <div style={{ display: 'flex', gap: 24, marginBottom: 14 }}>
            <Toggle value={row.is_sftp_po_approval_customer === 'true'} onChange={v => set('is_sftp_po_approval_customer', String(v))} label="is_sftp_po_approval_customer" />
            <Toggle value={row.is_esysco === 'true'} onChange={v => set('is_esysco', String(v))} label="is_esysco" />
          </div>

          {/* Live SQL preview — 2×2 grid: DEV/PROD × INSERT/UPDATE */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.4 }}>Live SQL Preview</span>
              <span style={{ fontSize: 10, color: C.muted }}>— DEV &amp; PROD queries</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {/* DEV INSERT */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: C.info, textTransform: 'uppercase', letterSpacing: 0.4 }}>DEV — INSERT</span>
                  <CopyBtn sql={insertSqlDev} label="⧉ Copy" accent="insert" small />
                </div>
                <SqlMini sql={insertSqlDev} />
              </div>
              {/* DEV UPDATE */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: C.purple, textTransform: 'uppercase', letterSpacing: 0.4 }}>DEV — UPDATE</span>
                  <CopyBtn sql={updateSqlDev} label="⧉ Copy" accent="update" small />
                </div>
                <SqlMini sql={updateSqlDev} />
              </div>
              {/* PROD INSERT */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#b45309', textTransform: 'uppercase', letterSpacing: 0.4 }}>PROD — INSERT</span>
                  <CopyBtn sql={insertSqlProd} label="⧉ Copy" accent="insert" small />
                </div>
                <SqlMini sql={insertSqlProd} />
              </div>
              {/* PROD UPDATE */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#b45309', textTransform: 'uppercase', letterSpacing: 0.4 }}>PROD — UPDATE</span>
                  <CopyBtn sql={updateSqlProd} label="⧉ Copy" accent="update" small />
                </div>
                <SqlMini sql={updateSqlProd} />
              </div>
            </div>
          </div>

          {/* ── Per-row Extra Fields ── */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: C.info, textTransform: 'uppercase', letterSpacing: 0.4 }}>➕ Extra Fields for this row</span>
              <span style={{ fontSize: 10, color: C.muted }}>Appended to both INSERT & UPDATE SQL</span>
            </div>
            {rowExtraFields.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 140px 32px', gap: 8, marginBottom: 6, padding: '0 2px' }}>
                  {['Column name', 'Value', 'Type', ''].map((h, i) => (
                    <div key={i} style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.4 }}>{h}</div>
                  ))}
                </div>
                {rowExtraFields.map((f, idx) => {
                  const ti = VALUE_TYPES.find(x => x.value === f.type) || VALUE_TYPES[0]
                  const isNull = f.type === 'null'
                  const isBool = f.type === 'boolean'
                  const updField = (id, key, val) => setRowExtraFields(ef => ef.map(x => x.id === id ? { ...x, [key]: val } : x))
                  const remField = id => setRowExtraFields(ef => ef.filter(x => x.id !== id))
                  return (
                    <div key={f.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 140px 32px', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                      <input value={f.column} onChange={e => updField(f.id, 'column', e.target.value)} placeholder="column_name"
                        style={{ ...inputStyle({ padding: '6px 10px' }), fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 12, color: C.teal,
                          background: f.column ? C.card : '#fffbeb', border: `1px solid ${f.column ? C.border : C.warningBorder}` }} />
                      {isNull ? (
                        <div style={{ ...inputStyle({ padding: '6px 10px' }), fontSize: 12, color: C.muted, fontStyle: 'italic', background: '#f8fafc', cursor: 'not-allowed' }}>null</div>
                      ) : isBool ? (
                        <select value={f.value} onChange={e => updField(f.id, 'value', e.target.value)}
                          style={{ ...selectStyle(), padding: '6px 28px 6px 10px', fontSize: 12, fontFamily: 'ui-monospace, Consolas, monospace', color: '#fb923c', fontWeight: 700 }}>
                          <option value="true">true</option><option value="false">false</option>
                        </select>
                      ) : (
                        <input value={f.value} onChange={e => updField(f.id, 'value', e.target.value)}
                          placeholder={f.type === 'raw' ? `e.g. now()` : `value`}
                          style={{ ...inputStyle({ padding: '6px 10px' }), fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 12, color: ti.color, background: '#1e293b' }} />
                      )}
                      <select value={f.type} onChange={e => updField(f.id, 'type', e.target.value)}
                        style={{ ...selectStyle(), padding: '6px 26px 6px 8px', fontSize: 11, fontWeight: 700, color: ti.color, background: '#1e293b', border: '1px solid #334155' }}>
                        {VALUE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                      <button onClick={() => remField(f.id)}
                        style={{ width: 32, height: 32, border: `1px solid ${C.errorBorder}`, borderRadius: 6, background: C.errorBg, color: C.error, cursor: 'pointer', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                    </div>
                  )
                })}
              </div>
            )}
            {rowExtraFields.length === 0 && (
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 8, padding: '4px 0' }}>No extra fields. Click below to add columns to this row's SQL.</div>
            )}
            <button
              onClick={() => setRowExtraFields(ef => [...ef, newField()])}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', border: `1.5px dashed ${C.infoBorder}`, borderRadius: 6, background: C.infoBg, color: C.info, cursor: 'pointer', fontWeight: 700, fontSize: 11 }}
            >+ Add Field</button>
          </div>

          {/* Save / Cancel */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={save}
              style={{ padding: '7px 18px', border: `1px solid ${C.successBorder}`, borderRadius: 7, background: C.successBg, color: C.success, cursor: 'pointer', fontWeight: 700, fontSize: 12 }}
            >
              ✓ Save Changes
            </button>
            <button
              onClick={cancel}
              style={{ padding: '7px 14px', border: `1px solid ${C.border}`, borderRadius: 7, background: '#f8fafc', color: C.muted, cursor: 'pointer', fontWeight: 700, fontSize: 12 }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Onboarded Customers Panel ────────────────────────────────────────────────
function OnboardedCustomersPanel() {
  const [expanded,    setExpanded]    = useState(false)
  const [customers,   setCustomers]   = useState(() => parseCSV(initialCsvRaw))
  const [search,      setSearch]      = useState('')
  const [uploadMsg,   setUploadMsg]   = useState('')   // '' | 'loaded' | 'error'

  const handleUpload = f => {
    if (!f) return
    if (!f.name.endsWith('.csv')) { setUploadMsg('error'); setTimeout(() => setUploadMsg(''), 2500); return }
    f.text().then(text => {
      const parsed = parseCSV(text)
      if (!parsed.length) { setUploadMsg('error'); setTimeout(() => setUploadMsg(''), 2500); return }
      setCustomers(parsed)
      setUploadMsg('loaded')
      setTimeout(() => setUploadMsg(''), 3000)
    }).catch(() => { setUploadMsg('error'); setTimeout(() => setUploadMsg(''), 2500) })
  }

  const handleDownload = () => {
    const csv = serializeCSV(customers)
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })),
      download: 'customers.csv',
    })
    a.click(); URL.revokeObjectURL(a.href)
  }

  const handleSave = (id, updatedRow) =>
    setCustomers(prev => prev.map(r => r.id === id ? { ...updatedRow } : r))

  const filtered = useMemo(() => {
    if (!search.trim()) return customers
    const q = search.toLowerCase()
    return customers.filter(c =>
      (c.name || '').toLowerCase().includes(q) ||
      (c.internal_name || '').toLowerCase().includes(q) ||
      (c.id || '').toString().includes(q)
    )
  }, [customers, search])

  const uploadBtnStyle = {
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '6px 12px',
    border: `1px solid ${uploadMsg === 'loaded' ? C.successBorder : uploadMsg === 'error' ? C.errorBorder : C.border}`,
    borderRadius: 7, cursor: 'pointer', fontWeight: 700, fontSize: 11,
    background: uploadMsg === 'loaded' ? C.successBg : uploadMsg === 'error' ? C.errorBg : '#f8fafc',
    color: uploadMsg === 'loaded' ? C.success : uploadMsg === 'error' ? C.error : C.sub,
    whiteSpace: 'nowrap',
  }

  return (
    <div style={{ marginTop: 20 }}>

      {/* ── Panel header (always visible) ── */}
      <div style={{
        background: C.card, border: `1px solid ${C.border}`,
        borderRadius: expanded ? '10px 10px 0 0' : 10,
        padding: '12px 16px', boxShadow: '0 1px 3px rgba(0,0,0,.05)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        transition: 'border-radius .15s',
      }}>
        {/* Left — title */}
        <div
          onClick={() => setExpanded(ex => !ex)}
          style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, cursor: 'pointer', userSelect: 'none' }}
        >
          <span style={{ fontSize: 18 }}>🗂</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: C.text, display: 'flex', alignItems: 'center', gap: 8 }}>
              Onboarded Customers
              <span style={{ padding: '1px 8px', borderRadius: 10, background: C.infoBg, color: C.info, border: `1px solid ${C.infoBorder}`, fontSize: 11, fontWeight: 700 }}>
                {customers.length}
              </span>
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>
              {expanded ? 'Click to collapse' : 'Click to expand — view, edit & copy SQL for each customer'}
            </div>
          </div>
        </div>

        {/* Right — actions */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Upload CSV */}
          <label style={uploadBtnStyle} onClick={e => e.stopPropagation()}>
            <input type="file" accept=".csv" style={{ display: 'none' }} onChange={e => { handleUpload(e.target.files?.[0]); e.target.value = '' }} />
            {uploadMsg === 'loaded' ? '✓ Loaded' : uploadMsg === 'error' ? '✗ Invalid CSV' : '↑ Upload CSV'}
          </label>

          {/* Download CSV */}
          <button
            onClick={e => { e.stopPropagation(); handleDownload() }}
            title="Download current data as customers.csv"
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', border: `1px solid ${C.successBorder}`, borderRadius: 7, cursor: 'pointer', fontWeight: 700, fontSize: 11, background: C.successBg, color: C.success, whiteSpace: 'nowrap' }}
          >
            ↓ customers.csv
          </button>

          {/* Chevron */}
          <span
            onClick={() => setExpanded(ex => !ex)}
            style={{ fontSize: 18, color: C.muted, cursor: 'pointer', userSelect: 'none', display: 'inline-block', transition: 'transform .2s', transform: expanded ? 'rotate(180deg)' : 'none', paddingLeft: 4 }}
          >
            ▾
          </span>
        </div>
      </div>

      {/* ── Panel body ── */}
      {expanded && (
        <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderTop: 'none', borderRadius: '0 0 10px 10px', padding: 16, boxShadow: '0 2px 6px rgba(0,0,0,.04)' }}>

          {/* Upload tip */}
          {uploadMsg === 'loaded' && (
            <div style={{ background: C.successBg, border: `1px solid ${C.successBorder}`, borderRadius: 7, padding: '8px 14px', marginBottom: 12, fontSize: 12, color: C.success, fontWeight: 600 }}>
              ✓ CSV loaded successfully — {customers.length} customers. Click <strong>↓ customers.csv</strong> to save to disk.
            </div>
          )}

          {/* Search + count bar */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: 420 }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: C.muted, pointerEvents: 'none' }}>🔍</span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or internal name…"
                style={{ ...inputStyle({ paddingLeft: 34, paddingRight: search ? 30 : 11, fontSize: 12 }) }}
              />
              {search && (
                <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: C.muted, padding: '0 2px', lineHeight: 1 }}>×</button>
              )}
            </div>
            <span style={{ fontSize: 11, color: C.muted, whiteSpace: 'nowrap' }}>
              {search
                ? `${filtered.length} of ${customers.length} match`
                : `Showing all ${customers.length} customers`}
            </span>
          </div>

          {/* Column headers */}
          <div style={{ display: 'grid', gridTemplateColumns: CUST_GRID, gap: 8, padding: '5px 12px', marginBottom: 4, borderBottom: `1px solid ${C.border}`, paddingBottom: 8 }}>
            {['#', 'ID', 'Name / Internal Key', 'Mode', 'BL', 'Env', '3rd Party', 'Actions'].map((h, i) => (
              <div key={h} style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.4, textAlign: i === 0 ? 'right' : i === 7 ? 'right' : 'left' }}>{h}</div>
            ))}
          </div>

          {/* Rows */}
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '28px 0', color: C.muted, fontSize: 13 }}>
              {search ? `No customers match "${search}"` : 'No customers loaded.'}
            </div>
          ) : (
            filtered.map((row, idx) => (
              <CustomerRow
                key={row.id || row.internal_name}
                row={row}
                index={idx}
                onSave={updatedRow => handleSave(row.id, updatedRow)}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SqlSection() {
  const [environment,      setEnvironment]      = useState('Production')
  const [broadline,        setBroadline]        = useState('USBL')
  const [customerRef,      setCustomerRef]      = useState(generateRef)
  const [orderApprovalRef, setOrderApprovalRef] = useState(generateRef)
  const [name,             setName]             = useState('')
  const [internalName,     setInternalName]     = useState('')
  const [thirdParty,       setThirdParty]       = useState('')
  const [credentialMode,   setCredentialMode]   = useState('USER_BASED')
  const [credIdentity,     setCredIdentity]     = useState('')
  const [credSharedSecret, setCredSharedSecret] = useState('')
  const [isSftpPoApproval,      setIsSftpPoApproval]      = useState(false)
  const [isEsysco,              setIsEsysco]              = useState(true)
  const [extraFields,           setExtraFields]           = useState([])
  const [nullCustomerRef,       setNullCustomerRef]       = useState(false)
  const [nullOrderApprovalRef,  setNullOrderApprovalRef]  = useState(false)

  const regenRef   = useCallback(() => setCustomerRef(generateRef()),      [])
  const regenOrder = useCallback(() => setOrderApprovalRef(generateRef()), [])

  const sqlParams = { customerRef, nullCustomerRef, name, internalName, orderApprovalRef, nullOrderApprovalRef, credentialMode, environment, credIdentity, credSharedSecret, thirdParty, broadline, isSftpPoApproval, isEsysco, extraFields }
  const sqlDev  = buildSql({ ...sqlParams, dbTarget: 'dev' })
  const sqlProd = buildSql({ ...sqlParams, dbTarget: 'prod' })

  // Auto-derive internal_name from name if empty
  const handleNameChange = v => {
    setName(v)
    if (!internalName || internalName === deriveName(name)) {
      setInternalName(deriveName(v))
    }
  }
  const deriveName = v => v.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')

  return (
    <div>
      {/* Header card */}
      <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, padding: 20, marginBottom: 20, boxShadow: '0 1px 4px rgba(0,0,0,.05)' }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700 }}>Generate Customer INSERT Query</h2>
        <p style={{ margin: 0, fontSize: 12, color: C.muted }}>
          Fill in the fields below to generate a PostgreSQL <code>INSERT INTO public.customer</code> statement.
          <code>customer_ref</code> and <code>order_approval_customer_ref</code> are auto-generated 15-char keys — click ↺ to regenerate.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* ── Left column — Identity & env ── */}
        <div>
          <SCard title="Environment & Broadline" icon="🌐" accent="info">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Environment" required>
                <select value={environment} onChange={e => setEnvironment(e.target.value)} style={selectStyle()}>
                  <option value="Production">Production</option>
                  <option value="Test">Test</option>
                </select>
              </Field>
              <Field label="Broadline" required>
                <select value={broadline} onChange={e => setBroadline(e.target.value)} style={selectStyle()}>
                  <option value="USBL">USBL</option>
                  <option value="CABL">CABL</option>
                </select>
              </Field>
            </div>
          </SCard>

          <SCard title="Customer Details" icon="🏢" accent="purple">
            <Field label="Customer Name" required hint='Stored in the "name" column'>
              <input
                value={name}
                onChange={e => handleNameChange(e.target.value)}
                placeholder="e.g. YMCA Shop"
                style={inputStyle()}
              />
            </Field>
            <Field label="Internal Name" required hint="Snake_case identifier, auto-derived from name">
              <input
                value={internalName}
                onChange={e => setInternalName(e.target.value)}
                placeholder="e.g. ymca_shop"
                style={inputStyle({ fontFamily: 'ui-monospace, Consolas, monospace', color: C.teal })}
              />
            </Field>
            <Field label="Third Party" required hint="e.g. SpendBridge, Euna Procurement formerly EqualLevel">
              <input
                value={thirdParty}
                onChange={e => setThirdParty(e.target.value)}
                placeholder="e.g. SpendBridge"
                style={inputStyle()}
              />
            </Field>
          </SCard>

          <SCard title="Flags" icon="🚩" accent="warn">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Toggle value={isSftpPoApproval} onChange={setIsSftpPoApproval} label="is_sftp_po_approval_customer" />
              <Toggle value={isEsysco}         onChange={setIsEsysco}          label="is_esysco" />
            </div>
          </SCard>
        </div>

        {/* ── Right column — Refs & credentials ── */}
        <div>
          <SCard title="Reference Keys" icon="🔑" accent="success">
            <div style={{ background: C.successBg, border: `1px solid ${C.successBorder}`, borderRadius: 7, padding: '8px 12px', marginBottom: 14, fontSize: 11, color: '#14532d', lineHeight: 1.6 }}>
              Keys are <strong>15-character uppercase alphanumeric</strong> (A–Z, 0–9), randomly generated.
              Click <strong>↺</strong> to get a new value. You can also edit manually — counter shows char count.
            </div>
            {/* customer_ref */}
            <div style={{ marginBottom: 4 }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: nullCustomerRef ? C.error : C.sub, cursor: 'pointer', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={nullCustomerRef}
                  onChange={e => setNullCustomerRef(e.target.checked)}
                  style={{ accentColor: C.error, cursor: 'pointer' }}
                />
                Set <code style={{ fontFamily: 'ui-monospace, Consolas, monospace' }}>customer_ref</code> to <code style={{ color: C.error }}>NULL</code>
              </label>
            </div>
            {nullCustomerRef ? (
              <div style={{ marginBottom: 16, padding: '9px 12px', borderRadius: 7, border: `1px dashed ${C.error}`, background: '#fef2f2', fontSize: 12, color: C.error, fontWeight: 700, fontFamily: 'ui-monospace, Consolas, monospace' }}>
                NULL — customer_ref will be null in the generated SQL
              </div>
            ) : (
              <RefInput
                label="customer_ref"
                value={customerRef}
                onRegenerate={regenRef}
                onChange={setCustomerRef}
                hint="Primary customer reference key"
              />
            )}

            {/* order_approval_customer_ref */}
            <div style={{ marginBottom: 4 }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: nullOrderApprovalRef ? C.error : C.sub, cursor: 'pointer', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={nullOrderApprovalRef}
                  onChange={e => setNullOrderApprovalRef(e.target.checked)}
                  style={{ accentColor: C.error, cursor: 'pointer' }}
                />
                Set <code style={{ fontFamily: 'ui-monospace, Consolas, monospace' }}>order_approval_customer_ref</code> to <code style={{ color: C.error }}>NULL</code>
              </label>
            </div>
            {nullOrderApprovalRef ? (
              <div style={{ marginBottom: 16, padding: '9px 12px', borderRadius: 7, border: `1px dashed ${C.error}`, background: '#fef2f2', fontSize: 12, color: C.error, fontWeight: 700, fontFamily: 'ui-monospace, Consolas, monospace' }}>
                NULL — order_approval_customer_ref will be null in the generated SQL
              </div>
            ) : (
              <RefInput
                label="order_approval_customer_ref"
                value={orderApprovalRef}
                onRegenerate={regenOrder}
                onChange={setOrderApprovalRef}
                hint="Order approval reference key"
              />
            )}
          </SCard>

          <SCard title="Credential Mode" icon="🔐" accent="purple">
            <Field label="Credential Mode" required>
              <select value={credentialMode} onChange={e => setCredentialMode(e.target.value)} style={selectStyle()}>
                <option value="USER_BASED">USER_BASED</option>
                <option value="PARTNER_BASED">PARTNER_BASED</option>
              </select>
            </Field>

            {credentialMode === 'USER_BASED' && (
              <div style={{ background: C.infoBg, border: `1px solid ${C.infoBorder}`, borderRadius: 7, padding: '8px 12px', fontSize: 11, color: C.info }}>
                <strong>USER_BASED</strong> — <code>customer_config</code> will be set to <code>null</code>.
              </div>
            )}

            {credentialMode === 'PARTNER_BASED' && (
              <div>
                <div style={{ background: C.purpleBg, border: `1px solid ${C.purpleBorder}`, borderRadius: 7, padding: '8px 12px', marginBottom: 12, fontSize: 11, color: C.purple, lineHeight: 1.6 }}>
                  <strong>PARTNER_BASED</strong> — provide <code>commonCredentials</code> to build the <code>customer_config</code> JSON.
                </div>
                <Field label="Identity" required hint="Identity value for commonCredentials">
                  <input
                    value={credIdentity}
                    onChange={e => setCredIdentity(e.target.value)}
                    placeholder="e.g. elymcaprod"
                    style={inputStyle({ fontFamily: 'ui-monospace, Consolas, monospace', color: C.teal })}
                  />
                </Field>
                <Field label="Shared Secret" required hint="Encrypted shared secret string">
                  <input
                    value={credSharedSecret}
                    onChange={e => setCredSharedSecret(e.target.value)}
                    placeholder="e.g. Jb4Taq67dvV9iKLWwvcBrg=="
                    style={inputStyle({ fontFamily: 'ui-monospace, Consolas, monospace', color: C.teal })}
                  />
                </Field>
                {(credIdentity || credSharedSecret) && (
                  <div style={{ background: '#1e293b', borderRadius: 7, padding: '8px 12px', fontSize: 11, fontFamily: 'ui-monospace, Consolas, monospace', color: '#6ee7b7', lineHeight: 1.8 }}>
                    {JSON.stringify({ commonCredentials: { identity: credIdentity, sharedSecret: credSharedSecret } }, null, 2)}
                  </div>
                )}
              </div>
            )}
          </SCard>
        </div>
      </div>

      {/* ── Extra Fields — full width ── */}
      <ExtraFieldsCard fields={extraFields} onChange={setExtraFields} />

      {/* ── SQL Preview — DEV + PROD side-by-side ── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.sub }}>Generated SQL</span>
          <span style={{ fontSize: 11, color: C.muted }}>Both DEV and PROD queries from the same input</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <SqlPreview sql={sqlDev}  label="DEV"  dbTarget="dev" />
          <SqlPreview sql={sqlProd} label="PROD" dbTarget="prod" />
        </div>
      </div>

      {/* ── Onboarded Customers ── */}
      <OnboardedCustomersPanel />
    </div>
  )
}

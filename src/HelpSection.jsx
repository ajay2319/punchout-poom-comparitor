import React, { useState } from 'react'

// ─── Sysco brand colour ──────────────────────────────────────────────────────
const BRAND = '#008cd2'
const BRAND_DARK = '#006fa8'
const BRAND_BG = '#e6f4fb'
const BRAND_BORDER = '#b3d9f0'

const C = {
  bg: '#f1f5f9', card: '#ffffff', border: '#e2e8f0',
  success: '#16a34a', successBg: '#dcfce7', successBorder: '#86efac',
  error:   '#dc2626', errorBg:   '#fee2e2', errorBorder:   '#fca5a5',
  warning: '#b45309', warningBg: '#fef3c7', warningBorder: '#fde68a',
  info:    '#0369a1', infoBg:    '#e0f2fe', infoBorder:    '#7dd3fc',
  purple:  '#7c3aed', purpleBg:  '#f5f3ff', purpleBorder:  '#c4b5fd',
  muted: '#6b7280', text: '#1e293b', sub: '#475569',
}

// ─── Feature badge ───────────────────────────────────────────────────────────
function Tag({ color = BRAND, bg = BRAND_BG, border = BRAND_BORDER, children }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '2px 10px',
      borderRadius: 20, fontSize: 11, fontWeight: 700,
      background: bg, color, border: `1px solid ${border}`,
      whiteSpace: 'nowrap', letterSpacing: 0.3,
    }}>{children}</span>
  )
}

// ─── Section heading ─────────────────────────────────────────────────────────
function SectionHeading({ icon, title, sub }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: sub ? 5 : 0 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.text }}>{title}</h2>
      </div>
      {sub && <p style={{ margin: 0, fontSize: 13, color: C.muted, paddingLeft: 30 }}>{sub}</p>}
    </div>
  )
}

// ─── Step card ───────────────────────────────────────────────────────────────
function Step({ num, title, children, color = BRAND }) {
  return (
    <div style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%', background: color, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 800, fontSize: 14, flexShrink: 0, marginTop: 1,
      }}>{num}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 5 }}>{title}</div>
        <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.7 }}>{children}</div>
      </div>
    </div>
  )
}

// ─── Accordion item ──────────────────────────────────────────────────────────
function AccordionItem({ question, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 9, overflow: 'hidden', marginBottom: 8 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', textAlign: 'left', padding: '13px 16px',
          background: open ? BRAND_BG : '#f8fafc',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
        <span style={{ fontWeight: 700, fontSize: 13, color: open ? BRAND : C.text }}>{question}</span>
        <span style={{ color: open ? BRAND : C.muted, fontSize: 16, flexShrink: 0, transition: 'transform .2s', transform: open ? 'rotate(90deg)' : 'none' }}>▶</span>
      </button>
      {open && (
        <div style={{ padding: '14px 16px', fontSize: 13, color: C.sub, lineHeight: 1.75, borderTop: `1px solid ${BRAND_BORDER}`, background: '#fafcfe' }}>
          {children}
        </div>
      )}
    </div>
  )
}

// ─── Feature card ────────────────────────────────────────────────────────────
function FeatureCard({ icon, title, description, tags = [] }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`, borderRadius: 10,
      padding: '16px 18px', boxShadow: '0 1px 4px rgba(0,0,0,.05)',
      display: 'flex', flexDirection: 'column', gap: 8,
      transition: 'box-shadow .2s, border-color .2s',
    }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 4px 16px rgba(0,140,210,.12)`; e.currentTarget.style.borderColor = BRAND_BORDER }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,.05)'; e.currentTarget.style.borderColor = C.border }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        <span style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{title}</span>
      </div>
      <p style={{ margin: 0, fontSize: 13, color: C.sub, lineHeight: 1.6 }}>{description}</p>
      {tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 2 }}>
          {tags.map(t => <Tag key={t}>{t}</Tag>)}
        </div>
      )}
    </div>
  )
}

// ─── Callout box ─────────────────────────────────────────────────────────────
function Callout({ type = 'info', icon, children }) {
  const styles = {
    info:    { bg: BRAND_BG,     border: BRAND_BORDER, color: BRAND_DARK, ico: 'ℹ️' },
    tip:     { bg: C.successBg,  border: C.successBorder, color: C.success, ico: '💡' },
    warning: { bg: C.warningBg,  border: C.warningBorder, color: C.warning, ico: '⚠️' },
    note:    { bg: '#f5f3ff',    border: C.purpleBorder, color: C.purple, ico: '📝' },
  }
  const s = styles[type]
  return (
    <div style={{
      display: 'flex', gap: 10, padding: '12px 14px', borderRadius: 8,
      background: s.bg, border: `1px solid ${s.border}`, marginBottom: 12, alignItems: 'flex-start',
    }}>
      <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{icon || s.ico}</span>
      <div style={{ fontSize: 13, color: s.color, lineHeight: 1.65 }}>{children}</div>
    </div>
  )
}

// ─── Mini table ──────────────────────────────────────────────────────────────
function MiniTable({ headers, rows }) {
  return (
    <div style={{ overflowX: 'auto', borderRadius: 8, border: `1px solid ${C.border}`, marginBottom: 12 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr>
            {headers.map(h => (
              <th key={h} style={{ padding: '8px 12px', background: BRAND_BG, color: BRAND_DARK, fontWeight: 700, textAlign: 'left', borderBottom: `1px solid ${BRAND_BORDER}`, whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? C.card : '#f8fafc' }}>
              {row.map((cell, j) => (
                <td key={j} style={{ padding: '7px 12px', borderBottom: `1px solid ${C.border}`, color: C.sub, verticalAlign: 'top' }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Code snippet ────────────────────────────────────────────────────────────
function CodeSnip({ children }) {
  return (
    <code style={{
      display: 'inline', background: '#1e293b', color: '#6ee7b7',
      padding: '1px 7px', borderRadius: 4, fontSize: 11.5,
      fontFamily: 'ui-monospace, Cascadia Code, Consolas, monospace',
    }}>{children}</code>
  )
}

// ─── Tab bar (reused internally) ─────────────────────────────────────────────
function TabBar({ tabs, active, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 4, borderBottom: `2px solid ${C.border}`, marginBottom: 20, flexWrap: 'wrap' }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)} style={{
          padding: '9px 18px', border: 'none', cursor: 'pointer',
          fontWeight: active === t.id ? 700 : 500,
          color: active === t.id ? BRAND : C.muted,
          background: 'transparent',
          borderBottom: `2px solid ${active === t.id ? BRAND : 'transparent'}`,
          marginBottom: -2, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6,
          transition: 'color .15s',
        }}>
          {t.icon && <span style={{ fontSize: 15 }}>{t.icon}</span>}
          {t.label}
        </button>
      ))}
    </div>
  )
}

// ─── Version badge ───────────────────────────────────────────────────────────
function VersionBadge({ version, label }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
      color: '#f8fafc', borderRadius: 8, padding: '6px 14px', fontSize: 12,
    }}>
      <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: 1 }}>Version</span>
      <span style={{ fontWeight: 800, fontFamily: 'monospace', color: BRAND }}>{version}</span>
      {label && <span style={{ fontSize: 11, color: '#94a3b8' }}>· {label}</span>}
    </div>
  )
}

// ─── Severity legend ─────────────────────────────────────────────────────────
function SeverityLegend() {
  const items = [
    { color: '#dc2626', bg: '#fee2e2', label: 'High', desc: 'Critical mismatches — UOM or quantity differences that directly affect order accuracy.' },
    { color: '#b45309', bg: '#fef3c7', label: 'Warning', desc: 'Important differences — pricing or catch weight flag that need review.' },
    { color: '#0369a1', bg: '#e0f2fe', label: 'Medium', desc: 'Informational diffs — average weight, case pack, classification.' },
    { color: C.muted, bg: '#f8fafc', label: 'Low', desc: 'Minor differences — description text, flags.' },
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
      {items.map(i => (
        <div key={i.label} style={{ background: i.bg, border: `1px solid ${i.color}44`, borderRadius: 8, padding: '10px 14px' }}>
          <div style={{ fontWeight: 800, color: i.color, fontSize: 13, marginBottom: 4 }}>{i.label}</div>
          <div style={{ fontSize: 12, color: C.sub, lineHeight: 1.5 }}>{i.desc}</div>
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main HelpSection
// ─────────────────────────────────────────────────────────────────────────────
export default function HelpSection() {
  const [activeTab, setActiveTab] = useState('overview')

  const tabs = [
    { id: 'overview',    label: 'Overview',           icon: '🏠' },
    { id: 'compare',     label: 'Compare Values',     icon: '⚖️' },
    { id: 'generate',    label: 'Generate Template',  icon: '📄' },
    { id: 'sql',         label: 'Generate SQL',       icon: '🗄️' },
    { id: 'features',    label: 'All Features',       icon: '✨' },
    { id: 'faq',         label: 'FAQ',                icon: '❓' },
  ]

  return (
    <div style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>
      {/* Hero banner */}
      <div style={{
        background: `linear-gradient(135deg, #0f172a 0%, ${BRAND_DARK} 60%, ${BRAND} 100%)`,
        borderRadius: 14, padding: '32px 36px', marginBottom: 24,
        boxShadow: '0 4px 24px rgba(0,140,210,.2)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative circles */}
        <div style={{ position: 'absolute', right: -40, top: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,.04)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', right: 60, bottom: -60, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,.04)', pointerEvents: 'none' }} />
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: BRAND, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>PunchOut POOM Generator · cXML Comparator</div>
            <h1 style={{ margin: '0 0 10px', fontSize: 28, fontWeight: 900, color: '#f8fafc', letterSpacing: -0.5, lineHeight: 1.2 }}>
              Documentation &amp; Help Center
            </h1>
            <p style={{ margin: '0 0 20px', fontSize: 14, color: '#94a3b8', maxWidth: 520, lineHeight: 1.7 }}>
              Complete guide to the PunchOut POOM Generator tool, covering the Compare Values, Generate POOM Template, and Generate SQL workflows.
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <VersionBadge version="2.0" label="Current Release" />
              {/* <Tag color="#f8fafc" bg="rgba(255,255,255,.1)" border="rgba(255,255,255,.2)">React + Vite</Tag> */}
              <Tag color="#f8fafc" bg="rgba(255,255,255,.1)" border="rgba(255,255,255,.2)">cXML / Handlebars</Tag>
              <Tag color="#f8fafc" bg="rgba(255,255,255,.1)" border="rgba(255,255,255,.2)">POOM Generator</Tag>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignSelf: 'flex-start' }}>
            {[
              { n: '3', label: 'Core Modules' },
              { n: '15+', label: 'Field-level Checks' },
              { n: '4', label: 'Severity Levels' },
            ].map(s => (
              <div key={s.label} style={{ background: 'rgba(255,255,255,.08)', borderRadius: 8, padding: '10px 18px', textAlign: 'center', border: '1px solid rgba(255,255,255,.1)' }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: BRAND, lineHeight: 1 }}>{s.n}</div>
                <div style={{ fontSize: 11, color: '#ffffff', marginTop: 3 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick-nav cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 28 }}>
        {[
          { id: 'compare',  icon: '⚖️', title: 'Compare Values',    color: BRAND,     desc: 'Validate cXML vs template & shop data' },
          { id: 'generate', icon: '📄', title: 'Generate Template', color: C.purple,  desc: 'Auto-build POOM Handlebars template' },
          { id: 'sql',      icon: '🗄️', title: 'Generate SQL',      color: C.success, desc: 'Create INSERT statements for onboarding' },
          { id: 'faq',      icon: '❓', title: 'FAQ',               color: C.warning, desc: 'Common questions & answers' },
        ].map(q => (
          <button
            key={q.id}
            onClick={() => setActiveTab(q.id)}
            style={{
              background: C.card, border: `1px solid ${C.border}`, borderRadius: 10,
              padding: '16px', cursor: 'pointer', textAlign: 'left',
              boxShadow: '0 1px 4px rgba(0,0,0,.05)', transition: 'all .2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = q.color; e.currentTarget.style.boxShadow = `0 4px 16px ${q.color}22` }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,.05)' }}
          >
            <div style={{ fontSize: 22, marginBottom: 8 }}>{q.icon}</div>
            <div style={{ fontWeight: 700, fontSize: 14, color: q.color, marginBottom: 4 }}>{q.title}</div>
            <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>{q.desc}</div>
          </button>
        ))}
      </div>

      {/* Tab navigation */}
      <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} />

      {/* ── OVERVIEW ─────────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div>
          <SectionHeading icon="🏠" title="What is the cXML Comparator?" sub="Your all-in-one tool for PunchOut customer onboarding validation and template generation." />

          <Callout type="info">
            <strong>Purpose:</strong> The PunchOut POOM Generator helps validate PunchOut customer cXML order messages, detect data discrepancies, generate POOM Handlebars templates, and produce SQL onboarding scripts — all in one browser-based interface. The customer XML and shop JSON files are captured directly from <strong>TradeCentric PunchOut sessions</strong>.
          </Callout>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14, marginBottom: 24 }}>
            <FeatureCard icon="⚖️" title="Compare Values"
              description="Upload Template XML, Customer Specific XML, and optional Shop JSON to get a complete report of template compliance, missing fields, and value-level discrepancies."
              tags={['XML Validation', 'Catch Weight', 'Field Diffs']} />
            <FeatureCard icon="📄" title="Generate POOM Template"
              description="Feed a customer XML to auto-generate a Handlebars-based POOM template with conditional catch-weight blocks, variable path suggestions, and cross-reference against shop JSON."
              tags={['Handlebars', 'Auto-Generate', 'CW Conditionals']} />
            <FeatureCard icon="🗄️" title="Generate SQL"
              description="Build INSERT statements for the POM database from a PunchOut customer CSV or manual entry — including credentials, pricing tiers, and onboarding parameters."
              tags={['SQL INSERT', 'CSV Import', 'Ref Key']} />
          </div>

          <SectionHeading icon="🗂️" title="Application Modules" sub="Three independent sections accessible via the top navigation bar." />
          <MiniTable
            headers={['Module', 'Location', 'Primary Inputs', 'Primary Outputs']}
            rows={[
              ['Compare Values', 'Top nav → ⚖ Compare Values', 'Template XML, Customer XML, Shop JSON (opt.)', 'Validation report, value diffs, CW logics'],
              ['Generate Template', 'Top nav → 📄 Generate POOM Template', 'Customer XML, Shop JSON (opt.)', 'Updated Handlebars POOM template (.xml)'],
              ['Generate SQL', 'Top nav → 🗄 Generate SQL', 'Customer CSV or manual form', 'SQL INSERT statement'],
            ]}
          />

          <SectionHeading icon="📦" title="Key Concepts" />
          <AccordionItem question="What is cXML?" defaultOpen>
            cXML (Commerce eXtensible Markup Language) is an XML-based standard for B2B e-commerce transactions. PunchOut customers send a <strong>PunchOutOrderMessage</strong> in cXML format to communicate cart contents from their procurement system back to the ordering platform.
          </AccordionItem>
          <AccordionItem question="What is a POOM Template?">
            A <strong>POOM (PunchOut Order Output Message)</strong> template is a Handlebars XML file that tells the POOM Generator how to map fields from the PunchOut customer's cXML order into the internal data model. Variables like <CodeSnip>{'{{supplierPartID}}'}</CodeSnip> and blocks like <CodeSnip>{'{{#each items}}'}</CodeSnip> are standard Handlebars constructs.
          </AccordionItem>
          <AccordionItem question="What is Catch Weight?">
            Catch weight items are products (usually proteins/seafood) where the ordered unit is by weight (lbs) but the POOM system defaults to cases (CS). When a <CodeSnip>catchWeightFlag</CodeSnip> is <CodeSnip>Yes</CodeSnip>, special Extrinsic fields and conversion logic must be present in the template.
          </AccordionItem>
          <AccordionItem question="What is Shop JSON?">
            The <strong>Shop JSON</strong> (<CodeSnip>shop.json</CodeSnip>) is the source-of-truth data file from the shop system containing product details, prices, UOMs, and quantities for a given PunchOut order. It is captured alongside the customer XML during a <strong>TradeCentric PunchOut session</strong>. The comparator uses it to detect mismatches against the PunchOut customer's XML.
          </AccordionItem>
        </div>
      )}

      {/* ── COMPARE VALUES ───────────────────────────────────────────────── */}
      {activeTab === 'compare' && (
        <div>
          <SectionHeading icon="⚖️" title="Compare Values" sub="Validate a PunchOut customer's cXML order against your template and the shop data." />

          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 14 }}>How to use — step by step</h3>
            <Step num={1} title="Upload Template XML" color={BRAND}>
              Click <strong>Browse / Drop</strong> in the <em>Template XML</em> upload zone (or drag-and-drop the file). This should be a Handlebars-formatted file like <CodeSnip>aramark_shop.xml</CodeSnip> containing <CodeSnip>{'{{...}}'}</CodeSnip> variables.
            </Step>
            <Step num={2} title="Upload Customer Specific XML" color={BRAND}>
              Upload the actual PunchOut customer order XML (e.g. <CodeSnip>customer_specific.xml</CodeSnip>). This is the filled-in cXML PunchOutOrderMessage captured from a <strong>TradeCentric session</strong> — it contains the real order data sent by the customer's procurement system.
            </Step>
            <Step num={3} title="Upload Shop JSON (optional but recommended)" color={BRAND}>
              Upload <CodeSnip>shop.json</CodeSnip> from the shop system. This file is also sourced from the <strong>TradeCentric session</strong> and contains the source product data (prices, UOMs, quantities) that the PunchOut session was built from. Without it, only template-structure checks run; with it, field-level value comparisons are available.
            </Step>
            <Step num={4} title="Run Comparison" color={BRAND}>
              Click <strong>Run Comparison</strong>. The tool will parse both files, compare structure, check Extrinsics, validate credentials, and compute value diffs.
            </Step>
            <Step num={5} title="Review the Report" color={BRAND}>
              Use the <strong>Summary Bar</strong> for a quick overview, then drill into each tab: <em>Items</em>, <em>Header &amp; Envelope</em>, <em>Value Diffs</em>, and <em>CW &amp; Transform Logics</em>.
            </Step>
          </div>

          <Callout type="tip">
            You can also <strong>download the updated POOM template</strong> directly from the Compare section if a template was generated. Look for the <em>Updated POOM Template</em> panel after running the comparison.
          </Callout>

          <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 12 }}>Report Sections</h3>
          <MiniTable
            headers={['Tab', 'What it shows']}
            rows={[
              ['Summary Bar', 'Total items, header issues, template issues, value diffs at a glance.'],
              ['Items', 'Per-item accordion cards with Template Check, Value Diffs, and Full Field Table sub-tabs.'],
              ['Header & Envelope', 'Validates cXML envelope attributes, credential domains & identities, UserAgent, operationAllowed, BuyerCookie and total.'],
              ['Value Diffs (shop.json ↔ XML)', 'All items that have at least one field mismatch between shop.json and the customer XML, grouped by severity.'],
              ['⚡ CW & Transform Logics', 'Catch-weight conversion rules and transform logic flags triggered by the uploaded data.'],
            ]}
          />

          <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 12 }}>Severity Levels</h3>
          <SeverityLegend />

          <div style={{ marginTop: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 12 }}>Item Card — Inner Tabs</h3>
            <MiniTable
              headers={['Inner Tab', 'Details']}
              rows={[
                ['Template Check', 'Lists missing/extra Extrinsics, missing ItemDetail children, and validates attributes like UOM and operationAllowed.'],
                ['Value Diffs (shop.json vs XML)', 'Field-by-field comparison with severity badges for each mismatch (UOM, price, quantity, catch-weight flag, etc.).'],
                ['Full Field Table', 'Complete table of all JSON and XML field values — toggle between "diffs only" and "show all fields".'],
              ]}
            />
          </div>

          <Callout type="warning">
            Items matched by index position (when <CodeSnip>supplierPartID</CodeSnip> isn't found in shop.json) are flagged with a blue <strong>idx match</strong> badge — treat these diffs with extra care.
          </Callout>
        </div>
      )}

      {/* ── GENERATE TEMPLATE ────────────────────────────────────────────── */}
      {activeTab === 'generate' && (
        <div>
          <SectionHeading icon="📄" title="Generate POOM Template" sub="Automatically build a Handlebars XML template from a customer's cXML order file." />

          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 14 }}>How to use — step by step</h3>
            <Step num={1} title="Upload Customer XML" color={C.purple}>
              In the <strong>Generate POOM Template</strong> section, upload the PunchOut customer's cXML file (e.g. <CodeSnip>customer_specific.xml</CodeSnip>) captured from a <strong>TradeCentric session</strong>. The tool analyses all elements, Extrinsics, and item fields.
            </Step>
            <Step num={2} title="Upload Shop JSON (optional)" color={C.purple}>
              Providing the <CodeSnip>shop.json</CodeSnip> from the TradeCentric session allows the generator to cross-reference fields and suggest variable paths more accurately, especially for pricing and UOM mapping.
            </Step>
            <Step num={3} title="Review Auto-Analysis" color={C.purple}>
              The tool displays a structured analysis: customer info, Extrinsics found, POM fields, UOM mapping, and catch-weight candidates.
            </Step>
            <Step num={4} title="Select Fields to Include" color={C.purple}>
              Use the checkboxes to pick which Extrinsics, POM root fields, and catch-weight conditionals should appear in the generated template.
            </Step>
            <Step num={5} title="Generate & Download" color={C.purple}>
              Click <strong>Generate Template</strong>. Preview the Handlebars XML with syntax highlighting, then copy or download the file.
            </Step>
          </div>

          <Callout type="note">
            <strong>Variable colours in the preview:</strong><br/>
            <span style={{ color: '#fbbf24', fontWeight: 700 }}>Gold</span> — new variables detected from the customer XML (verify before use)<br/>
            <span style={{ color: '#6ee7b7', fontWeight: 700 }}>Green</span> — existing / well-known variables<br/>
            <span style={{ color: '#a78bfa', fontWeight: 700 }}>Purple</span> — block helpers ({'{{#each / #if}}'})<br/>
            <span style={{ color: '#93c5fd', fontWeight: 700 }}>Blue</span> — XML element tags
          </Callout>

          <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 12 }}>Analysis Panels</h3>
          <MiniTable
            headers={['Panel', 'Description']}
            rows={[
              ['Customer Info', 'Sender identity, buyer cookie, domain credentials extracted from the XML header.'],
              ['Extrinsics', 'All <Extrinsic name="…"> elements found. Flags catch-weight-only fields automatically.'],
              ['POM Fields', 'Root-level and ItemDetail child elements detected in the order.'],
              ['UOM Mapping', 'Unit-of-measure values from both XML and shop JSON, identifies mismatch patterns.'],
              ['Catch Weight Logics', 'Triggered CW transform rules with severity, expected values, and recommendations.'],
              ['Variable Suggestions', 'Suggested Handlebars variable paths for every detected field.'],
            ]}
          />
        </div>
      )}

      {/* ── GENERATE SQL ─────────────────────────────────────────────────── */}
      {activeTab === 'sql' && (
        <div>
          <SectionHeading icon="🗄️" title="Generate SQL" sub="Create database INSERT statements for PunchOut customer onboarding." />

          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 14 }}>How to use — step by step</h3>
            <Step num={1} title="Choose Input Method" color={C.success}>
              Either <strong>import a customer CSV</strong> file (pre-loaded with <CodeSnip>customers.csv</CodeSnip> sample data) or fill in the <strong>manual form</strong> fields directly.
            </Step>
            <Step num={2} title="Select / Configure a Customer Row" color={C.success}>
              When using CSV import, click a row in the customer table to auto-populate all form fields. Edit any field before generating.
            </Step>
            <Step num={3} title="Set the Reference Key" color={C.success}>
              The <strong>Reference Key</strong> is a 15-character uppercase alphanumeric identifier. Use the regenerate <CodeSnip>↺</CodeSnip> button for a new random key or type one manually.
            </Step>
            <Step num={4} title="Configure Options" color={C.success}>
              Toggle options like <em>Include extended fields</em>, <em>Pricing tier</em>, and <em>Deployment mode</em>. These affect which columns and values appear in the generated SQL.
            </Step>
            <Step num={5} title="Generate & Copy SQL" color={C.success}>
              Click <strong>Generate SQL</strong> to produce the INSERT statement. Use the <em>Copy</em> button or <em>Download</em> to save the output.
            </Step>
          </div>

          <Callout type="info">
            The tool pre-loads the <CodeSnip>customers.csv</CodeSnip> sample from the <CodeSnip>sample/</CodeSnip> folder. You can replace it by uploading your own CSV file — the column headers must match the expected schema.
          </Callout>

          <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 12 }}>CSV Column Reference</h3>
          <MiniTable
            headers={['Column', 'Required', 'Description']}
            rows={[
              ['customerName', 'Yes', 'Full name of the customer / account.'],
              ['domain', 'Yes', 'Credential domain used in the cXML header (e.g. NetworkID).'],
              ['identity', 'Yes', 'Credential identity value.'],
              ['sharedSecret', 'No', 'Shared secret / password for the credential.'],
              ['deploymentMode', 'No', 'production or test (defaults to production).'],
              ['pricingTier', 'No', 'Pricing tier identifier for the SQL record.'],
            ]}
          />

          <Callout type="warning">
            Always review generated SQL before running it in production. Verify the reference key is unique and that credential values are correct.
          </Callout>
        </div>
      )}

      {/* ── ALL FEATURES ─────────────────────────────────────────────────── */}
      {activeTab === 'features' && (
        <div>
          <SectionHeading icon="✨" title="All Features" sub="Complete feature set of the current version." />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginBottom: 28 }}>
            <FeatureCard icon="📂" title="Drag-and-Drop File Upload"
              description="Upload XML and JSON files by drag-and-drop or file browser. Zones turn green on successful load."
              tags={['.xml', '.json', '.csv']} />
            <FeatureCard icon="🔍" title="Template Compliance Check"
              description="Validates customer XML against the Handlebars template — flags missing Extrinsics, extra elements, and wrong attribute values."
              tags={['Extrinsics', 'ItemDetail', 'Attributes']} />
            <FeatureCard icon="⚖️" title="Field-Level Value Diff"
              description="Compares every meaningful field between shop.json and customer XML, grouped into severity levels."
              tags={['High / Warning / Medium / Low']} />
            <FeatureCard icon="⚡" title="Catch Weight Detection"
              description="Automatically identifies catch-weight items (CW flag = Yes), checks UOM consistency, and generates transform logic suggestions."
              tags={['CW Flag', 'UOM Check', 'Logics']} />
            <FeatureCard icon="🛡️" title="Header & Credential Validation"
              description="Checks cXML envelope attributes, credential domain/identity pairs, UserAgent, deploymentMode, and operationAllowed."
              tags={['Envelope', 'Credentials', 'UserAgent']} />
            <FeatureCard icon="🧩" title="Cross-Item Extrinsic Analysis"
              description="Detects Extrinsics that appear in some items but are missing from others, distinguishing normal from catch-weight–only fields."
              tags={['Universe Check', 'CW-Only']} />
            <FeatureCard icon="🛠️" title="Auto POOM Template Generator"
              description="One-click generation of a Handlebars POOM template from customer XML, with field selection and conditional catch-weight blocks."
              tags={['Handlebars', 'Download .xml']} />
            <FeatureCard icon="🎨" title="Syntax-Highlighted XML Preview"
              description="Dark-mode code view with colour-coded Handlebars variables, block helpers, XML tags, and attributes."
              tags={['Format / Raw toggle', 'Copy']} />
            <FeatureCard icon="💾" title="Download & Copy Outputs"
              description="Download generated templates, SQL scripts, and reports — or copy to clipboard with a single click."
              tags={['Template .xml', 'SQL .sql']} />
            <FeatureCard icon="🗄️" title="SQL Statement Generator"
              description="Builds INSERT SQL for POM onboarding from a customer CSV or manual form with reference key generation."
              tags={['15-char Ref Key', 'CSV import']} />
            <FeatureCard icon="📊" title="Summary Statistics"
              description="At-a-glance count of total items, header issues, template issues, and value diffs with high-severity call-out."
              tags={['Summary Bar']} />
            <FeatureCard icon="🔽" title="Filter & Focus"
              description="Filter the items list to show only those with issues — cuts through noise when validating large orders."
              tags={['Issues only filter']} />
          </div>

          <SectionHeading icon="🗺️" title="Supported File Formats" />
          <MiniTable
            headers={['Format', 'Extension', 'Used in', 'Notes']}
            rows={[
              ['cXML Template', '.xml', 'Compare, Generate', 'Handlebars-formatted POOM template (aramark style)'],
              ['cXML Order', '.xml', 'Compare, Generate', 'Customer-submitted PunchOutOrderMessage'],
              ['Shop JSON', '.json', 'Compare, Generate', 'Captured from a TradeCentric PunchOut session — contains shop product/order source data'],
              ['Customer CSV', '.csv', 'Generate SQL', 'Onboarding data — must match expected column headers'],
            ]}
          />

          <SectionHeading icon="🏷️" title="Badge & Alert Colour Reference" />
          <MiniTable
            headers={['Badge', 'Colour', 'Meaning']}
            rows={[
              ['✓ OK (green)', 'Green', 'No issues detected for this item or check.'],
              ['N template issues (red)', 'Red', 'Missing Extrinsics or ItemDetail children.'],
              ['N value diffs (yellow)', 'Yellow/Orange', 'Field-level mismatches between shop.json and XML.'],
              ['idx match (blue)', 'Blue', 'Item matched by index position, not supplierPartID.'],
              ['CW only (grey)', 'Grey', 'Expected missing — catch-weight-only field on non-CW item.'],
              ['extra (purple)', 'Purple', 'Element present in customer XML but not in template.'],
            ]}
          />
        </div>
      )}

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      {activeTab === 'faq' && (
        <div>
          <SectionHeading icon="❓" title="Frequently Asked Questions" sub="Common questions about using the PunchOut POOM Generator." />

          <AccordionItem question="Where do I get the Customer Specific XML and shop.json files?" defaultOpen>
            Both files are captured from a <strong>TradeCentric PunchOut session</strong>. When a PunchOut customer completes a checkout in their procurement system, TradeCentric records the session — the <CodeSnip>customer_specific.xml</CodeSnip> is the cXML PunchOutOrderMessage sent back by the customer, and <CodeSnip>shop.json</CodeSnip> is the corresponding shop data used during that session. Retrieve both from the TradeCentric session logs or debug tools before uploading here.
          </AccordionItem>
          <AccordionItem question="Do I need a backend server to run this tool?">
            No. The tool is entirely browser-based — it runs as a Vite + React single-page app (SPA). All file processing happens locally in your browser. No data is sent to any external server.
          </AccordionItem>
          <AccordionItem question="Why is the shop.json comparison optional?">
            The template-structure check (missing Extrinsics, attributes, header validation) works with just the two XML files. Shop JSON is only needed for value-level field comparisons. You can still get useful template compliance results without it.
          </AccordionItem>
          <AccordionItem question="What does 'idx match' mean on an item card?">
            When the tool can't find a matching <CodeSnip>supplierPartID</CodeSnip> in shop.json, it falls back to matching by position (index) in the list. This can happen when the customer's XML has a different part number than what's in shop.json. Check manually to confirm the items are the same product.
          </AccordionItem>
          <AccordionItem question="How does the Catch Weight detection work?">
            The tool checks the <CodeSnip>catchWeightFlag</CodeSnip> Extrinsic on each item. If it's <CodeSnip>Yes</CodeSnip>, it validates that all catch-weight-required Extrinsics are present (<CodeSnip>averageWeightPerCase</CodeSnip>, <CodeSnip>unitPriceInOrderedUOM</CodeSnip>, etc.) and that UOM values are consistent with weight ordering. It also flags UOM mismatches as High severity.
          </AccordionItem>
          <AccordionItem question="Can I compare two plain XML files (no Handlebars template)?">
            The Compare section is designed primarily for Handlebars template vs. customer XML. However, you can upload any well-formed XML as the "template" and the structure check will still run — but variables won't be substituted since there are none.
          </AccordionItem>
          <AccordionItem question="The generated template has gold-coloured variables — what should I do?">
            Gold / amber variables (<CodeSnip>{'{{@root.fieldName}}'}</CodeSnip>) indicate fields that the tool detected in your customer XML but could not confidently map to a known Handlebars variable. You should <strong>manually verify</strong> each gold variable against your shop JSON schema before using the template in production.
          </AccordionItem>
          <AccordionItem question="How do I handle multiple customers with the same order structure?">
            You can re-run the tool for each customer by uploading their specific XML. The Template generator section also lets you adjust which Extrinsics and fields to include per customer, so you can tailor templates individually.
          </AccordionItem>
          <AccordionItem question="How is the 15-character reference key in SQL generation used?">
            The reference key is a unique identifier stored in the POM database to correlate PunchOut customer onboarding records. It's alphanumeric and uppercase (e.g. <CodeSnip>A1B2C3D4E5F6G7H</CodeSnip>). You can use the <CodeSnip>↺</CodeSnip> button to regenerate a random one or type your own — it must be exactly 15 characters.
          </AccordionItem>
          <AccordionItem question="Can I upload my own CSV instead of the sample customers.csv?">
            Yes. In the Generate SQL section, click the CSV upload zone and select your file. Make sure your CSV has the expected column headers (customerName, domain, identity, etc.). The sample <CodeSnip>customers.csv</CodeSnip> in the <CodeSnip>sample/</CodeSnip> folder shows the expected format.
          </AccordionItem>
          <AccordionItem question="What browsers are supported?">
            The tool works on any modern browser: <strong>Chrome, Edge, Firefox, Safari</strong>. For the best experience (copy-to-clipboard, file system API), use <strong>Chrome or Edge</strong>.
          </AccordionItem>
        </div>
      )}

      {/* Footer */}
      <div style={{
        marginTop: 40, paddingTop: 20, borderTop: `1px solid ${C.border}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 10,
      }}>
        <div style={{ fontSize: 12, color: C.muted }}>
          PunchOut POOM Generator · cXML Comparator v2.0 · Internal tooling
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Tag>PunchOut POOM Generator</Tag>
          <Tag color={C.muted} bg="#f1f5f9" border={C.border}>© {new Date().getFullYear()}</Tag>
        </div>
      </div>
    </div>
  )
}

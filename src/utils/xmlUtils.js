// ─── Core XML helpers + POOM template generation ─────────────────────────────

// Extrinsics that ship in the built-in aramark_shop.xml base template
const BASE_TEMPLATE_EXTRINSICS = new Set([
  'splitIndicator','itemExtendedPrice','orderDetailLineNumber','catchWeightFlag',
  'orderedUnitOfMeasure','unitPriceInOrderedUnitOfMeasure','averageWeightPerCase',
  'casePack','caseSize','itemsPerCase','specialOrderItem','marketPriceFlag',
  'orderedQuantity','apply_sessionlink'
])

export function parseXmlString(xmlText){
  const parser = new DOMParser()
  return parser.parseFromString(xmlText, 'application/xml')
}

export function xmlToString(doc){
  const serializer = new XMLSerializer()
  return serializer.serializeToString(doc)
}

/**
 * Re-indent a raw XML block (from XMLSerializer) to a given tab level.
 *
 * XMLSerializer preserves ABSOLUTE whitespace from the source DOM:
 *   <ShipTo>                      ← no leading ws (serialization root)
 *   \t\t\t\t\t<Address>          ← 5 absolute tabs
 *   \t\t\t\t</ShipTo>            ← 4 absolute tabs  ← this tells us origBase = 4
 *
 * Algorithm:
 *   origBase = leading-tab count of the last non-empty line (the closing root tag)
 *   Line 0          → base + opening_tag  (strip any accidental whitespace)
 *   All other lines → base + line.slice(origBase)  (preserves relative indent)
 *
 * This means for baseTabs=4:
 *   \t\t\t\t\t<Address>  → \t\t\t\t + \t<Address>  = 5 tabs ✓
 *   \t\t\t\t</ShipTo>   → \t\t\t\t + </ShipTo>   = 4 tabs ✓ (closing at base level)
 */
function reindentXml(rawXml, baseTabs) {
  const base    = '\t'.repeat(baseTabs)
  const trimmed = rawXml.trim()
  if (!trimmed.includes('\n')) return base + trimmed

  const lines = trimmed.split('\n')
  if (lines.length <= 1) return base + trimmed

  // Find origBase from the last non-empty line (always the closing root tag)
  const lastNonEmpty = [...lines].reverse().find(l => l.trim()) || ''
  const origBase = (lastNonEmpty.match(/^(\t*)/) || ['', ''])[1].length

  return lines.map((l, i) => {
    if (!l.trim()) return ''
    if (i === 0) return base + l.trim()
    // Subtract original base, add new base — preserves all relative nesting
    return base + l.slice(origBase)
  }).filter((l, i, arr) => {
    // Drop consecutive blank lines
    return l !== '' || (i > 0 && arr[i - 1] !== '')
  }).join('\n')
}

/** strip handlebars for template parsing */
function sanitizeTemplateXml(xmlText) {
  return (xmlText || '')
    .replace(/\{\{#[\s\S]*?\}\}/g, '')
    .replace(/\{\{\/[\s\S]*?\}\}/g, '')
    .replace(/\{\{[\s\S]*?\}\}/g, '')
}

/** get expected envelope values from template */
function extractTemplateEnvelope(templateText){
  const clean = sanitizeTemplateXml(templateText)
  const tdoc = parseXmlString(clean)
  const tMessage = tdoc.querySelector('Message')
  const expectedDeploymentMode = tMessage?.getAttribute('deploymentMode') || ''

  const tHeader = tdoc.querySelector('Header')
  const tFromDomain   = tHeader?.querySelector('From > Credential')?.getAttribute('domain') || ''
  const tToDomain     = tHeader?.querySelector('To > Credential')?.getAttribute('domain') || ''
  const tSenderDomain = tHeader?.querySelector('Sender > Credential')?.getAttribute('domain') || ''

  return {
    expectedDeploymentMode,
    expectedDomains: { from: tFromDomain, to: tToDomain, sender: tSenderDomain }
  }
}

/**
 * Build updated XML:
 * - Insert any missing ItemDetail children & Extrinsics (from template expectations).
 * - Enforce <Message deploymentMode="..."> from template if provided.
 * - Enforce <Credential domain="..."> for From/To/Sender if provided in template.
 */
export function buildUpdatedXml(customerXmlText, extrinsicNames, requiredChildren, templateText){
  const parser = new DOMParser()
  const doc = parser.parseFromString(customerXmlText, 'application/xml')

  // 1) Item-level insertions (existing behavior)
  const items = Array.from(doc.querySelectorAll('Message > PunchOutOrderMessage > ItemIn'))
  items.forEach(item => {
    let detail = item.querySelector('ItemDetail')
    if(!detail){ detail = doc.createElement('ItemDetail'); item.appendChild(detail) }

    const present = new Set(Array.from(detail.children).map(ch=>ch.tagName))
    requiredChildren.forEach(name => {
      if(!present.has(name)){
        if(name==='UnitPrice'){
          const unitPrice = doc.createElement('UnitPrice')
          const money = doc.createElement('Money')
          money.setAttribute('currency','USD')
          unitPrice.appendChild(money)
          detail.appendChild(unitPrice)
        }else if(name==='Description'){
          const desc = doc.createElement('Description')
          desc.setAttribute('xml:lang','EN')
          const short = doc.createElement('ShortName')
          desc.appendChild(short)
          detail.appendChild(desc)
        }else{
          detail.appendChild(doc.createElement(name))
        }
      }
    })
    const presentExtrinsics = new Set(Array.from(detail.querySelectorAll('Extrinsic')).map(e=>e.getAttribute('name')||''))
    extrinsicNames.forEach(name => {
      if(!presentExtrinsics.has(name)){
        const ex = doc.createElement('Extrinsic')
        ex.setAttribute('name', name)
        detail.appendChild(ex)
      }
    })
  })

  // 2) Envelope: preserve the customer XML's own values — do NOT overwrite with template values.
  // The customer XML is the source of truth for domain, identity, deploymentMode, etc.

  const serializer = new XMLSerializer()
  return serializer.serializeToString(doc)
}

// ─── Analyze customer XML structure ──────────────────────────────────────────
/**
 * Extract structural information from a customer-specific cXML file.
 * Used to drive the Generate POOM Template section.
 * @param {string} xmlText  - raw customer_specific.xml text
 * @param {string} tplText  - optional: uploaded base template (to detect extras against)
 */
export function analyzeCustomerXml(xmlText, tplText = '') {
  const doc = parseXmlString(xmlText)

  // cXML root attrs
  const cxml = doc.querySelector('cXML')
  const version  = cxml?.getAttribute('version')  || ''
  const xmlLang  = cxml?.getAttribute('xml:lang') || ''
  const payloadID= cxml?.getAttribute('payloadID')|| ''

  // Message
  const deploymentMode = doc.querySelector('Message')?.getAttribute('deploymentMode') || ''

  // Header credentials
  const credentials = {}
  for (const part of ['From','To','Sender']) {
    const cred = doc.querySelector(`Header > ${part} > Credential`)
    const ident = doc.querySelector(`Header > ${part} > Credential > Identity`)
    credentials[part.toLowerCase()] = {
      domain:   cred?.getAttribute('domain') || '',
      identity: ident?.textContent?.trim()   || ''
    }
  }
  const userAgent    = doc.querySelector('Header > Sender > UserAgent')?.textContent?.trim() || ''
  const buyerCookie  = doc.querySelector('BuyerCookie')?.textContent?.trim() || ''

  // PunchOutOrderMessageHeader
  const pomHdr           = doc.querySelector('PunchOutOrderMessageHeader')
  const operationAllowed = pomHdr?.getAttribute('operationAllowed') || ''
  const totalMoney       = pomHdr?.querySelector('Total > Money')
  const totalValue       = totalMoney?.textContent?.trim()    || ''
  const totalCurrency    = totalMoney?.getAttribute('currency') || ''

  // Extra POM header fields (anything other than Total)
  // Also capture the raw serialized XML of each extra child so the template
  // generator can reproduce the full structure (not just the tag name).
  const pomExtraFields = []
  const pomExtraFieldsXml = {}
  if (pomHdr) {
    const _ser = typeof XMLSerializer !== 'undefined' ? new XMLSerializer() : null
    Array.from(pomHdr.children).forEach(c => {
      if (c.tagName !== 'Total') {
        if (!pomExtraFields.includes(c.tagName)) pomExtraFields.push(c.tagName)
        if (_ser && !pomExtraFieldsXml[c.tagName]) {
          // Strip spurious xmlns attributes added by XMLSerializer
          pomExtraFieldsXml[c.tagName] = _ser.serializeToString(c).replace(/\s+xmlns(?::[^=]+)?="[^"]*"/g, '')
        }
      }
    })
  }

  // Collect all Extrinsic names used across all items
  const items       = Array.from(doc.querySelectorAll('Message > PunchOutOrderMessage > ItemIn'))
  const allExtrinsics = new Set()
  items.forEach(item => {
    Array.from(item.querySelectorAll('ItemDetail > Extrinsic')).forEach(e => {
      const n = e.getAttribute('name'); if (n) allExtrinsics.add(n)
    })
  })

  // Determine the "base" extrinsic set — either from uploaded template or hardcoded
  let baseExtrinsics = BASE_TEMPLATE_EXTRINSICS
  if (tplText) {
    const fromTpl = new Set(Array.from(tplText.matchAll(/<Extrinsic\s+name="([^"]+)"/g)).map(m => m[1]))
    if (fromTpl.size > 0) baseExtrinsics = fromTpl
  }

  const extraExtrinsics = [...allExtrinsics].filter(n => !baseExtrinsics.has(n))

  // ── Per-item Extrinsic presence matrix ──────────────────────────────────────
  // True if at least one ItemIn has a non-empty lineNumber attribute
  const hasLineNumbers = items.some(item => (item.getAttribute('lineNumber') || '') !== '')

  const itemMatrix = items.map(item => {
    const rawLN      = item.getAttribute('lineNumber') ?? ''
    const lineNumber = rawLN !== '' ? parseInt(rawLN, 10) : ''
    const quantity       = item.getAttribute('quantity') || ''
    const supplierPartID = item.querySelector('SupplierPartID')?.textContent?.trim()  || ''
    const shortName      = item.querySelector('ShortName')?.textContent?.trim()       || ''
    const xmlUom         = item.querySelector('ItemDetail > UnitOfMeasure')?.textContent?.trim() || ''
    const unitPrice      = item.querySelector('ItemDetail > UnitPrice > Money')?.textContent?.trim() || ''
    const extMap = {}
    Array.from(item.querySelectorAll('ItemDetail > Extrinsic')).forEach(e => {
      const n = e.getAttribute('name'); if (n) extMap[n] = e.textContent?.trim() ?? ''
    })
    const cwFlag = extMap['catchWeightFlag'] ?? ''
    return { lineNumber, quantity, supplierPartID, shortName, catchWeightFlag: cwFlag, xmlUom, unitPrice, extMap, present: new Set(Object.keys(extMap)) }
  })

  // Universe = union of every Extrinsic seen, preserving the ORDER they appear
  // in the item that has the most fields (typically the CW item).
  // A simple flatMap+Set would append CW-only fields (orderedUnitOfMeasure, etc.)
  // at the END, breaking positional order. Instead we do a position-aware merge:
  // scan each item's field list in order and insert any new names right after their
  // preceding neighbour — this keeps relative CW-field positions intact.
  function mergeOrdered(lists) {
    const result = []
    const seen   = new Set()
    for (const list of lists) {
      let afterIdx = -1
      for (const name of list) {
        if (seen.has(name)) { afterIdx = result.indexOf(name); continue }
        result.splice(afterIdx + 1, 0, name)
        seen.add(name)
        afterIdx = result.indexOf(name)
      }
    }
    return result
  }
  // Process non-CW items first (establishes base positions), then CW items
  const sortedForMerge = [...itemMatrix].sort((a, b) => {
    const aIsCW = a.catchWeightFlag?.toLowerCase() === 'yes' ? 1 : 0
    const bIsCW = b.catchWeightFlag?.toLowerCase() === 'yes' ? 1 : 0
    return aIsCW - bIsCW
  })
  const extrinsicUniverse = mergeOrdered(sortedForMerge.map(m => [...m.present]))

  // Catch-weight-only: present WITH value in ALL Yes items, absent/empty in ALL No items
  const cwYesItems = itemMatrix.filter(m => m.catchWeightFlag?.toLowerCase() === 'yes')
  const cwNoItems  = itemMatrix.filter(m => m.catchWeightFlag?.toLowerCase() !== 'yes')
  const catchWeightOnlyExtrinsics = cwYesItems.length > 0
    ? extrinsicUniverse.filter(name => {
        if (name === 'catchWeightFlag') return false
        const allYesHaveValue = cwYesItems.length > 0 && cwYesItems.every(m => m.present.has(name) && m.extMap[name] !== '')
        const noNoHasValue    = cwNoItems.every(m => !m.present.has(name) || m.extMap[name] === '')
        return allYesHaveValue && noNoHasValue
      })
    : []

  // Inconsistently present: missing from 1+ items, NOT catch-weight-only
  const inconsistentExtrinsics = extrinsicUniverse.filter(name => {
    if (catchWeightOnlyExtrinsics.includes(name)) return false
    return itemMatrix.some(m => !m.present.has(name))
  })

  // ── Classify each Extrinsic's value pattern across all items ────────────────
  //   'always_valued'   → every item has a non-empty value  → plain <Extrinsic/>
  //   'sometimes_valued'→ mixed empty/valued                → {{#if field}}<Extrinsic/>{{/if}}
  //   'always_empty'    → every occurrence is empty         → remove from template
  //   'cw_only'         → valued only when catchWeightFlag=Yes → {{#if (eq cwFlag "Yes")}}
  const extrinsicPatterns = {}
  for (const name of extrinsicUniverse) {
    if (name === 'catchWeightFlag') { extrinsicPatterns[name] = 'always_valued'; continue }
    if (catchWeightOnlyExtrinsics.includes(name)) { extrinsicPatterns[name] = 'cw_only'; continue }
    const itemsWithField = itemMatrix.filter(m => m.present.has(name))
    const valuedItems    = itemsWithField.filter(m => (m.extMap[name] ?? '') !== '')
    if (valuedItems.length === 0)                         extrinsicPatterns[name] = 'always_empty'
    else if (valuedItems.length === itemMatrix.length)    extrinsicPatterns[name] = 'always_valued'
    else                                                  extrinsicPatterns[name] = 'sometimes_valued'
  }

  // Build clean itemMatrix (no Set/extMap in output)
  // extValues captures ALL extrinsic fields so generateCatchWeightLogics
  // can do a full field-by-field comparison against shop.json
  const itemMatrixOut = itemMatrix.map(({ extMap, present, ...rest }) => ({
    ...rest,
    extValues: Object.fromEntries(
      Object.entries(extMap).map(([k, v]) => [k, v ?? ''])
    ),
    presentExtrinsics:   [...present],
    missingFromUniverse: extrinsicUniverse.filter(n => !present.has(n))
  }))

  // ── Detect phantom/hardcoded metadata items ───────────────────────────────
  // Pattern: empty lineNumber attribute + empty SupplierPartAuxiliaryID + price == 0
  // These are non-product items some customers append after the real order items
  // (e.g. site header rows, requested delivery date rows). They are injected as
  // literal hardcoded blocks in the generated template after the {{/each}} loop.
  const phantomItems = items.map((item, idx) => {
    const rawLN  = item.getAttribute('lineNumber') ?? ''
    if (rawLN !== '') return null   // has a real lineNumber — not a phantom item
    const auxID = item.querySelector('SupplierPartAuxiliaryID')?.textContent?.trim() ?? ''
    if (auxID !== '') return null   // has an auxiliary ID — not a phantom item
    const price = item.querySelector('ItemDetail > UnitPrice > Money')?.textContent?.trim() ?? ''
    if (parseFloat(price || '0') !== 0) return null   // non-zero price — not phantom
    // Capture all data verbatim for hardcoding in the template
    const supplierPartID = item.querySelector('SupplierPartID')?.textContent?.trim() || ''
    const quantity       = item.getAttribute('quantity') || '1'
    const uom            = item.querySelector('ItemDetail > UnitOfMeasure')?.textContent?.trim() || 'EA'
    const classEl        = item.querySelector('Classification')
    const classificationDomain = classEl?.getAttribute('domain') || 'UNSPSC'
    const classificationValue  = classEl?.textContent?.trim() || '50000000'
    // Description: get text content, stripping ShortName child if present
    const descEl   = item.querySelector('ItemDetail > Description')
    const descText = descEl ? (() => {
      const sn = descEl.querySelector('ShortName')
      if (sn) sn.parentNode.removeChild(sn)
      return descEl.textContent?.trim() || ''
    })() : ''
    const extrinsics = []
    Array.from(item.querySelectorAll('ItemDetail > Extrinsic')).forEach(e => {
      const n = e.getAttribute('name'); const v = e.textContent?.trim() ?? ''
      if (n) extrinsics.push({ name: n, value: v })
    })
    return { supplierPartID, quantity, uom, classificationDomain, classificationValue, descText, price: price || '0', extrinsics, originalIndex: idx }
  }).filter(Boolean)

  // Capture the raw <Header> block verbatim so generatePoomTemplate can inject it directly
  const headerMatch = xmlText.match(/<Header>[\s\S]*?<\/Header>/)
  const rawHeader   = headerMatch ? headerMatch[0] : ''

  // Detect Shipping > Description with SupplierPartAuxiliaryID/index pattern.
  // e.g. <Description xml:lang="EN">HM69271cab9b1aa/0|HM69271cab9b1aa/1|...</Description>
  let shippingDescriptionPrefix = null
  const shippingDescMatch = xmlText.match(
    /<Shipping>[\s\S]*?<Description[^>]*>([^<]+)<\/Description>[\s\S]*?<\/Shipping>/
  )
  if (shippingDescMatch) {
    const descContent = shippingDescMatch[1].trim()
    // Must follow PREFIX/0|PREFIX/1|... — PREFIX is the SupplierPartAuxiliaryID
    const prefixMatch = descContent.match(/^([^\/|\s]+)\/0(\|[^\/|\s]+\/\d+)+/)
    if (prefixMatch) shippingDescriptionPrefix = prefixMatch[1]
  }

  return {
    version, xmlLang, payloadID, deploymentMode,
    credentials, userAgent, buyerCookie,
    operationAllowed, totalValue, totalCurrency,
    pomExtraFields,
    pomExtraFieldsXml,
    rawHeader,
    hasLineNumbers,
    shippingDescriptionPrefix,
    itemCount: items.length,
    phantomItems,
    allExtrinsics:  [...allExtrinsics],
    baseExtrinsics: [...baseExtrinsics],
    extraExtrinsics,
    itemMatrix:               itemMatrixOut,
    extrinsicUniverse,
    catchWeightOnlyExtrinsics,
    inconsistentExtrinsics,
    extrinsicPatterns
  }
}

// ─── XML pretty-formatter ────────────────────────────────────────────────────
/**
 * Pretty-print an XML / Handlebars-template string.
 * Handlebars tokens ({{...}}) are protected from XML-formatting rules.
 */
export function formatXml(xmlText) {
  const INDENT = '\t'
  // 1. Protect Handlebars tokens so they are not torn apart by > < splitting
  const hbsTokens = []
  let s = xmlText.replace(/\{\{[\s\S]*?\}\}/g, m => {
    hbsTokens.push(m)
    return `\x00HBS${hbsTokens.length - 1}\x00`
  })

  // 2. Ensure each tag / text node is on its own line
  s = s
    .replace(/>\s*</g, '>\n<')         // split adjacent tags
    .replace(/>\s+/g,  '>\n')           // trailing whitespace after closing >
    .replace(/\s+</g,  '\n<')           // leading whitespace before opening <

  // 3. Re-indent
  const lines = s.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  let depth = 0
  const out = []
  for (const line of lines) {
    const isClose   = /^<\//.test(line)                         // </tag>
    const isSelf    = /\/>$/.test(line)                          // <tag .../>
    const isDecl    = /^<[!?]/.test(line)                        // <!…>, <?…>, <!--
    const hasClose  = !isClose && /<\/[^>]+>$/.test(line)       // <tag>text</tag>

    if (isClose) depth = Math.max(0, depth - 1)
    out.push(INDENT.repeat(depth) + line)
    if (!isClose && !isSelf && !hasClose && !isDecl && /^<[^\/]/.test(line)) depth++
  }

  // 4. Restore Handlebars tokens
  return out.join('\n').replace(/\x00HBS(\d+)\x00/g, (_, i) => hbsTokens[+i])
}

// ─── Extract item-level field names from shop.json ──────────────────────────
/**
 * Parse shop.json and return a Set of field names that live inside items[].
 * These can be accessed directly as {{fieldName}} inside {{#each ShopOrderDetails.items}}.
 */
export function getShopItemFields(shopJsonText) {
  try {
    const data = JSON.parse(shopJsonText)
    const first = (data.items || [])[0]
    if (!first) return new Set()
    return new Set(Object.keys(first))
  } catch { return new Set() }
}

/**
 * Parse shop.json and return a Set of root-level field names that are NOT inside items[].
 * These require the {{@root.ShopOrderDetails.fieldName}} prefix inside {{#each}} loops.
 */
export function getShopRootFields(shopJsonText) {
  try {
    const data = JSON.parse(shopJsonText)
    return new Set(Object.keys(data).filter(k => k !== 'items'))
  } catch { return new Set() }
}

// ─── Suggest Handlebars variable paths for new/extra fields ──────────────────
/**
 * For each extra Extrinsic name, suggest the correct Handlebars path.
 * Three-tier resolution using shop.json structure:
 *  1. In shop.json items[]        → {{fieldName}}                          (direct, inside #each)
 *  2. In shop.json root-level     → {{@root.ShopOrderDetails.fieldName}}   (@root escape needed)
 *  3. Not found in shop.json      → {{ExtrinsicName}}                      (direct placeholder)
 *
 * @param {string[]} extraExtrinsics
 * @param {Set<string>} shopItemFields  - keys from shop.json items[0]
 * @param {Set<string>} shopRootFields  - root-level keys of shop.json (excluding 'items')
 */
export function suggestVariablePaths(extraExtrinsics = [], shopItemFields = new Set(), shopRootFields = new Set()) {
  const map = {}
  extraExtrinsics.forEach(name => {
    const camel = name.charAt(0).toLowerCase() + name.slice(1)
    if (shopItemFields.has(name) || shopItemFields.has(camel)) {
      // Tier 1: lives inside items[] — direct access
      map[name] = `{{${camel}}}`
    } else if (shopRootFields.has(name) || shopRootFields.has(camel)) {
      // Tier 2: root-level of shop.json — needs @root prefix
      map[name] = `{{@root.ShopOrderDetails.${camel}}}`
    } else {
      // Tier 3: not in shop.json at all — use Extrinsic name as a direct placeholder
      map[name] = `{{${name}}}`
    }
  })
  return map
}

// ─── Cross-reference shop.json vs customer XML analysis ──────────────────────
/**
 * Compare shop.json items against the XML analysis to detect:
 * - UOM mismatches (weight-unit vs case-unit → catch-weight signal)
 * - unitPriceInOrderedUnitOfMeasure differences
 * - catchWeightFlag mismatches
 * - item ordering differences
 *
 * Returns alignment rows + suggested catch-weight Extrinsics.
 */
export function crossReferenceShopJson(shopJsonText, xmlAnalysis) {
  let shopData
  try { shopData = JSON.parse(shopJsonText) } catch { return null }

  const shopItems = shopData.items || []
  const xmlItems  = (xmlAnalysis.itemMatrix || [])

  const WEIGHT_UOMS = new Set(['LB','LBS','KG','KGS','OZ','POUND','POUNDS'])
  const isWeight    = uom => WEIGHT_UOMS.has((uom || '').toUpperCase().trim())
  const numEq       = (a, b) => Math.abs(parseFloat(a) - parseFloat(b)) < 0.00001

  const cwSignalExtrinsics = new Set()
  let hasOrderMismatch = false

  const itemAlignment = xmlItems.map((xmlItem, idx) => {
    // Positional (index) match — same supplierId can repeat across items,
    // so ID-based find() would always return the first occurrence (wrong item).
    // Both arrays are in the same order, so index matching is correct.
    const shopItem = shopItems[idx] || null

    if (!shopItem) {
      return {
        lineNumber: xmlItem.lineNumber, supplierPartID: xmlItem.supplierPartID,
        shortName: xmlItem.shortName, shopFound: false, matchedById: false, inOrder: true, diffs: []
      }
    }

    const diffs = []

    // ── quantity (<ItemIn quantity="..."> vs shop.json quantity) ─────────────
    const xmlQty  = String(xmlItem.quantity || '').trim()
    const shopQty = String(shopItem.quantity || '').trim()
    if (xmlQty && shopQty && !numEq(xmlQty, shopQty)) {
      const cwSignal = xmlItem.catchWeightFlag?.toLowerCase() === 'yes'
      diffs.push({ field: 'quantity', shopVal: shopQty, xmlVal: xmlQty, isCWSignal: cwSignal,
        note: cwSignal ? 'CW item: XML quantity is likely weight (lbs), shop.json quantity is case count' : 'Quantity differs' })
    }

    // ── UOM (item-level UnitOfMeasure in XML vs shop.json uom) ──────────────
    const shopUom = shopItem.uom || ''
    const xmlUom  = xmlItem.xmlUom || ''
    if (shopUom && xmlUom && shopUom.toUpperCase() !== xmlUom.toUpperCase()) {
      const cwSignal = isWeight(shopUom) !== isWeight(xmlUom)
      diffs.push({ field: 'UnitOfMeasure', shopVal: shopUom, xmlVal: xmlUom, isCWSignal: cwSignal,
        note: cwSignal ? 'Weight vs non-weight UOM — catch-weight logic likely needed' : 'UOM mismatch' })
      if (cwSignal) { cwSignalExtrinsics.add('unitPriceInOrderedUnitOfMeasure'); cwSignalExtrinsics.add('averageWeightPerCase') }
    }

    // ── orderedUnitOfMeasure ─────────────────────────────────────────────────
    const shopOUM = shopItem.orderedUnitOfMeasure || ''
    const xmlOUM  = xmlItem.extValues?.orderedUnitOfMeasure || ''
    if (shopOUM && xmlOUM && shopOUM.toUpperCase() !== xmlOUM.toUpperCase()) {
      const cwSignal = isWeight(shopOUM) !== isWeight(xmlOUM)
      diffs.push({ field: 'orderedUnitOfMeasure', shopVal: shopOUM, xmlVal: xmlOUM, isCWSignal: cwSignal,
        note: cwSignal ? 'Weight vs non-weight orderedUOM — catch-weight logic likely needed' : 'orderedUOM mismatch' })
      if (cwSignal) cwSignalExtrinsics.add('unitPriceInOrderedUnitOfMeasure')
    }

    // ── unitPriceInOrderedUnitOfMeasure ──────────────────────────────────────
    const shopPOU = String(shopItem.unitPriceInOrderedUnitOfMeasure || '')
    const xmlPOU  = String(xmlItem.extValues?.unitPriceInOrderedUnitOfMeasure || '')
    if (shopPOU && xmlPOU && !numEq(shopPOU, xmlPOU)) {
      diffs.push({ field: 'unitPriceInOrderedUnitOfMeasure', shopVal: shopPOU, xmlVal: xmlPOU, isCWSignal: true,
        note: 'Price per ordered UOM differs — possible catch-weight pricing adjustment' })
      cwSignalExtrinsics.add('unitPriceInOrderedUnitOfMeasure')
    }

    // ── catchWeightFlag ──────────────────────────────────────────────────────
    const shopCWF = String(shopItem.catchWeightFlag || '')
    const xmlCWF  = String(xmlItem.catchWeightFlag || '')
    if (shopCWF && xmlCWF && shopCWF.toLowerCase() !== xmlCWF.toLowerCase()) {
      diffs.push({ field: 'catchWeightFlag', shopVal: shopCWF, xmlVal: xmlCWF, isCWSignal: true,
        note: 'catchWeightFlag mismatch between shop.json and XML' })
    }

    // ── averageWeightPerCase ─────────────────────────────────────────────────
    const shopAWC = String(shopItem.averageWeightPerCase || '')
    const xmlAWC  = String(xmlItem.extValues?.averageWeightPerCase || '')
    if (shopAWC && xmlAWC && !numEq(shopAWC, xmlAWC)) {
      diffs.push({ field: 'averageWeightPerCase', shopVal: shopAWC, xmlVal: xmlAWC, isCWSignal: false,
        note: 'Average weight per case differs' })
    }

    return {
      lineNumber: xmlItem.lineNumber,
      supplierPartID: xmlItem.supplierPartID,
      shortName: xmlItem.shortName,
      catchWeightFlag: xmlItem.catchWeightFlag,
      shopFound: true,
      matchedById: true,
      inOrder: true,
      diffs,
    }
  })

  // Shop items beyond the XML item count (extra items in shop.json)
  const extraShopItems = shopItems
    .slice(xmlItems.length)
    .map(s => ({ supplierId: s.supplierId, name: s.name }))

  return {
    itemAlignment,
    hasOrderMismatch,
    suggestedCatchWeightExtrinsics: [...cwSignalExtrinsics],
    hasCWSignals: cwSignalExtrinsics.size > 0,
    extraShopItems,
    shopItemCount:  shopItems.length,
    xmlItemCount:   xmlItems.length,
  }
}

// ─── Generate catch-weight logic method stubs from analysis data ─────────────
/**
 * Inspect analysis + shop.json to produce concrete JS method snippets that
 * need to be implemented in the customer's POOM handler.
 *
 * @param {object} analysis     - result of analyzeCustomerXml()
 * @param {string} shopJsonText - raw shop.json text (may be empty)
 * @param {string} customerXml  - raw customer_specific.xml text (used for pattern detection)
 * @returns {Array<{id,methodName,category,description,triggered,affectedItems,code,warnings,poomChanges}>}
 */
export function generateCatchWeightLogics(analysis, shopJsonText = '', customerXml = '') {
  const logics = []

  let shopData = null
  try { shopData = JSON.parse(shopJsonText) } catch {}
  const shopItems = shopData?.items || []

  // Require shop.json — without it we cannot perform meaningful comparison
  if (!shopItems.length) {
    return [{ id: 'noShopJson', _requiresShopJson: true }]
  }

  const xmlItems = analysis?.itemMatrix || []

  const WEIGHT_UNITS = new Set(['LB', 'LBS', 'OZ', 'KG', 'KGS', 'GRAM', 'GRAMS', 'POUND', 'POUNDS'])
  const isWeight = uom => WEIGHT_UNITS.has((uom || '').toUpperCase().trim())

  // Numeric field comparison (prices, weights, quantities)
  const isNumericField = name => /price|weight|quantity|cases|pack|size/i.test(name)
  const valsMatch = (a, b, field) => {
    const sa = String(a ?? '').trim(), sb = String(b ?? '').trim()
    if (!sa || !sb) return true // either side absent → skip
    if (isNumericField(field)) {
      const fa = parseFloat(sa), fb = parseFloat(sb)
      return !isNaN(fa) && !isNaN(fb) ? Math.abs(fa - fb) < 0.0001 : sa.toLowerCase() === sb.toLowerCase()
    }
    return sa.toLowerCase() === sb.toLowerCase()
  }

  // Match shop.json item by index — same supplierId can repeat across items,
  // so ID-based find() would always return the first occurrence (wrong item).
  // Both arrays are in the same order, so index matching is correct.
  const findShopItem = (idx) => shopItems[idx] || null

  // ── Canonical mapping: XML Extrinsic name → shop.json field name ────────────
  // Every field that can appear in both places is listed here for systematic comparison.
  const EXT_TO_SHOP = {
    catchWeightFlag:                 'catchWeightFlag',
    orderedUnitOfMeasure:            'orderedUnitOfMeasure',
    unitPriceInOrderedUnitOfMeasure: 'unitPriceInOrderedUnitOfMeasure',
    averageWeightPerCase:            'averageWeightPerCase',
    casePack:                        'casePack',
    caseSize:                        'caseSize',
    itemsPerCase:                    'itemsPerCase',
    numberOfCases:                   'numberOfCases',
    marketPriceFlag:                 'marketPriceFlag',
    specialOrderItem:                'specialOrderItem',
    itemExtendedPrice:               'itemExtendedPrice',
    orderedQuantity:                 'orderedQuantity',
    splitIndicator:                  'splitIndicator',
  }

  // ── Per-item full comparison matrix: shop.json vs XML ─────────────────────
  const itemComparisons = xmlItems.map((xmlItem, idx) => {
    const shopItem = findShopItem(idx)
    const shopUom  = (shopItem?.uom || '').toUpperCase().trim()
    const xmlUom   = (xmlItem.xmlUom || '').toUpperCase().trim()
    const cwExplicit = xmlItem.catchWeightFlag?.toLowerCase() === 'yes'
    // Implicit CW: weight-vs-non-weight UOM mismatch even without catchWeightFlag=Yes
    // e.g. shop.json uom=LB (weight) but customer XML uom=CA (case)
    const cwImplicit = !cwExplicit && !!shopItem && shopUom && xmlUom &&
      shopUom !== xmlUom && (isWeight(shopUom) !== isWeight(xmlUom))

    const diffs = []
    if (shopItem) {
      // 0. Item-level quantity attribute (<ItemIn quantity="...">) vs shop.json quantity
      const xmlQty  = String(xmlItem.quantity || '').trim()
      const shopQty = String(shopItem.quantity || '').trim()
      if (xmlQty && shopQty && !valsMatch(xmlQty, shopQty, 'quantity')) {
        diffs.push({ field: '_itemQuantity', shopVal: shopQty, xmlVal: xmlQty, isCW: cwExplicit || cwImplicit })
      }
      // 0b. UnitPrice element (<ItemDetail><UnitPrice><Money>) vs shop.json unitPrice
      const xmlUP  = String(xmlItem.unitPrice  || '').trim()
      const shopUP = String(shopItem.unitPrice  || '').trim()
      if (xmlUP && shopUP && !valsMatch(xmlUP, shopUP, 'unitPrice')) {
        diffs.push({ field: '_unitPrice', shopVal: shopUP, xmlVal: xmlUP, isCW: cwExplicit || cwImplicit })
      }
      // 1. Item-level UnitOfMeasure (XML element, not an Extrinsic)
      if (shopUom && xmlUom && shopUom !== xmlUom) {
        diffs.push({ field: 'UnitOfMeasure', shopVal: shopUom, xmlVal: xmlUom, isCW: cwExplicit || cwImplicit })
      }
      // 2. All mapped Extrinsic fields
      const extValues = xmlItem.extValues || {}
      for (const [extName, shopField] of Object.entries(EXT_TO_SHOP)) {
        const xmlVal  = String(extValues[extName] ?? '').trim()
        const shopVal = String(shopItem[shopField] ?? '').trim()
        if (!xmlVal || !shopVal) continue
        if (!valsMatch(xmlVal, shopVal, extName)) {
          diffs.push({ field: extName, shopVal, xmlVal, isCW: cwExplicit || extName === 'catchWeightFlag' })
        }
      }
      // 3. Any extra Extrinsic that also exists as a shop.json key (customer-specific fields)
      for (const extName of (xmlItem.presentExtrinsics || [])) {
        if (extName in EXT_TO_SHOP) continue    // already compared above
        if (!(extName in shopItem)) continue    // not in shop.json → nothing to compare
        const xmlVal  = String((extValues[extName]) ?? '').trim()
        const shopVal = String(shopItem[extName] ?? '').trim()
        if (!xmlVal || !shopVal) continue
        if (!valsMatch(xmlVal, shopVal, extName)) {
          diffs.push({ field: extName, shopVal, xmlVal, isCW: cwExplicit })
        }
      }
    }
    return { xmlItem, shopItem, diffs, cwExplicit, cwImplicit }
  })

  const cwAllItems = itemComparisons.filter(c => c.cwExplicit || c.cwImplicit)
  const nonCwItems = itemComparisons.filter(c => !c.cwExplicit && !c.cwImplicit)

  // ── 1. updateCatchWeightUOM — explicit + implicit CW items with UOM mismatch ─
  const cwUomMap = new Map()
  cwAllItems.forEach(({ xmlItem, diffs, cwExplicit, cwImplicit }) => {
    const d = diffs.find(x => x.field === 'UnitOfMeasure')
    if (!d) return
    const key = `${d.shopVal}→${d.xmlVal}`
    if (!cwUomMap.has(key)) cwUomMap.set(key, { items: [], hasImplicit: false })
    cwUomMap.get(key).items.push({
      supplierPartID: xmlItem.supplierPartID, shortName: xmlItem.shortName,
      cwFlag: cwExplicit ? 'Yes' : '(implicit)', shopVal: d.shopVal, xmlVal: d.xmlVal,
    })
    if (cwImplicit) cwUomMap.get(key).hasImplicit = true
  })
  cwUomMap.forEach(({ items, hasImplicit }, key) => {
    const [from, to] = key.split('→')
    logics.push({
      id: `cwUom_${from}_${to}`,
      methodName: 'updateCatchWeightUOM',
      category: 'uom',
      description: `shop.json UOM is \`${from}\` but customer XML expects \`${to}\` for ${hasImplicit ? 'explicit + implicit' : 'explicit'} catch-weight items.${hasImplicit ? ' (Implicit: weight vs non-weight UOM detected even without catchWeightFlag=Yes)' : ''}`,
      triggered: true,
      affectedItems: items,
      code:
`/**
 * Update UOM for catch weight items (${from} → ${to})
 */
updateCatchWeightUOM(dataModel) {
    dataModel[CXML_SUBSTITUTION_CONST.SHOP_ORDER_DETAILS].items.forEach(item => {
        if (item.catchWeightFlag === 'Yes' && item.uom === '${from}') {
            item.uom = '${to}';
        }
    });
}`,
      warnings: hasImplicit
        ? [`⚠ Some items are flagged as implicit catch-weight (${from} is a weight unit but XML expects ${to}) with no catchWeightFlag=Yes in the XML. Verify catchWeightFlag in shop.json for these items.`]
        : [],
      poomChanges: [],
    })
  })

  // ── 2. updateUOM — non-CW items with UOM mismatch ─────────────────────────
  const uomMap = new Map()
  nonCwItems.forEach(({ xmlItem, diffs }) => {
    const d = diffs.find(x => x.field === 'UnitOfMeasure')
    if (!d) return
    const key = `${d.shopVal}→${d.xmlVal}`
    if (!uomMap.has(key)) uomMap.set(key, [])
    uomMap.get(key).push({
      supplierPartID: xmlItem.supplierPartID, shortName: xmlItem.shortName,
      cwFlag: xmlItem.catchWeightFlag, shopVal: d.shopVal, xmlVal: d.xmlVal,
    })
  })
  uomMap.forEach((items, key) => {
    const [from, to] = key.split('→')
    logics.push({
      id: `uom_${from}_${to}`,
      methodName: 'updateUOM',
      category: 'uom',
      description: `General UOM conversion: shop.json has \`${from}\`, customer XML expects \`${to}\` (non-catch-weight items).`,
      triggered: true,
      affectedItems: items,
      code:
`/**
 * Update UOM for all items (${from} → ${to})
 */
updateUOM(dataModel) {
    dataModel[CXML_SUBSTITUTION_CONST.SHOP_ORDER_DETAILS].items.forEach(item => {
        if (item.uom === '${from}') {
            item.uom = '${to}';
        }
    });
}`,
      warnings: [],
      poomChanges: [],
    })
  })

  // ── 3. Extrinsic field mismatches for CW items (advisory per-field) ─────────
  // Fields that have dedicated logics elsewhere are skipped here
  // _itemQuantity is a synthetic comparison field (quantity attr), not an Extrinsic
  const SKIP_IN_ADVISORY = new Set(['catchWeightFlag', 'unitPriceInOrderedUnitOfMeasure',
    'orderedUnitOfMeasure', 'averageWeightPerCase', 'numberOfCases', '_itemQuantity', '_unitPrice'])
  const cwExtDiffs = new Map()
  cwAllItems.forEach(({ xmlItem, diffs, cwExplicit }) => {
    diffs.filter(d => d.field !== 'UnitOfMeasure' && !SKIP_IN_ADVISORY.has(d.field)).forEach(d => {
      if (!cwExtDiffs.has(d.field)) cwExtDiffs.set(d.field, [])
      cwExtDiffs.get(d.field).push({
        supplierPartID: xmlItem.supplierPartID, shortName: xmlItem.shortName,
        cwFlag: cwExplicit ? 'Yes' : '(implicit)', shopVal: d.shopVal, xmlVal: d.xmlVal,
      })
    })
  })
  cwExtDiffs.forEach((items, field) => {
    logics.push({
      id: `cwFieldDiff_${field}`,
      methodName: `update_${field}`,
      category: 'advisory',
      description: `Extrinsic \`${field}\` differs between shop.json and XML for ${items.length} catch-weight item(s). Verify whether a runtime transformation is needed.`,
      triggered: true,
      affectedItems: items,
      code:
`// Extrinsic field mismatch: ${field}
// shop.json value differs from customer XML value.
// Add a transformation if the runtime value needs adjustment:
dataModel[CXML_SUBSTITUTION_CONST.SHOP_ORDER_DETAILS].items.forEach(item => {
    if (item.catchWeightFlag === 'Yes') {
        // item.${field} = <corrected value>;
    }
});`,
      warnings: [`⚠ \`${field}\` differs between shop.json and XML — confirm which value should be submitted in the cXML`],
      poomChanges: [],
    })
  })

  // ── 4. Non-CW items with extrinsic field mismatches (advisory) ─────────────
  const nonCwExtDiffs = new Map()
  nonCwItems.forEach(({ xmlItem, diffs }) => {
    diffs.filter(d => d.field !== 'UnitOfMeasure' && !SKIP_IN_ADVISORY.has(d.field)).forEach(d => {
      if (!nonCwExtDiffs.has(d.field)) nonCwExtDiffs.set(d.field, [])
      nonCwExtDiffs.get(d.field).push({
        supplierPartID: xmlItem.supplierPartID, shortName: xmlItem.shortName,
        cwFlag: xmlItem.catchWeightFlag || 'No', shopVal: d.shopVal, xmlVal: d.xmlVal,
      })
    })
  })
  nonCwExtDiffs.forEach((items, field) => {
    logics.push({
      id: `nonCwFieldDiff_${field}`,
      methodName: `/* advisory — ${field} */`,
      category: 'advisory',
      description: `Extrinsic \`${field}\` differs between shop.json and XML for ${items.length} non-CW item(s). Verify if a transformation is needed.`,
      triggered: true,
      affectedItems: items,
      code:
`// Non-CW item mismatch: ${field}
// shop.json value differs from customer XML Extrinsic value.
// Add a transformation if needed:
// item.${field} = <corrected value>;`,
      warnings: [`⚠ shop.json and XML have different \`${field}\` values for non-catch-weight items`],
      poomChanges: [],
    })
  })

  // ── 5. updateQuantityForCatchWeightItems ────────────────────────────────────
  // Trigger only when XML <ItemIn quantity> ≠ shop.json quantity for CW items.
  // If both values are the same (including decimals like 41.90 vs 41.90), skip entirely.
  const cwQtyNeedsFix = cwAllItems.filter(({ diffs }) =>
    diffs.some(d => d.field === '_itemQuantity')
  )
  if (cwQtyNeedsFix.length > 0) {
    logics.push({
      id: 'updateQtyForCW',
      methodName: 'updateQuantityForCatchWeightItems',
      category: 'quantity',
      description: `CW=Yes items: XML \`quantity\` attribute differs from shop.json \`quantity\`. Set quantity = shop.json quantity at runtime.`,
      triggered: true,
      affectedItems: cwQtyNeedsFix.map(({ xmlItem, diffs }) => {
        const d = diffs.find(x => x.field === '_itemQuantity')
        return {
          supplierPartID: xmlItem.supplierPartID, shortName: xmlItem.shortName,
          cwFlag: xmlItem.catchWeightFlag, shopVal: d?.shopVal ?? '', xmlVal: d?.xmlVal ?? '',
        }
      }),
      code:
`/**
 * Update quantity for catch weight items
 * @param {*} dataModel
 */
updateQuantityForCatchWeightItems(dataModel) {
    dataModel[CXML_SUBSTITUTION_CONST.SHOP_ORDER_DETAILS].items.forEach(item => {
        if (item.catchWeightFlag === 'Yes' && item.uom !== 'EA') {
            item.quantity = item.numberOfCases;
        }
    });
}`,
      warnings: [],
      poomChanges: [],
    })
  }

  // ── 5b. updateQuantity — non-CW items with quantity mismatch ────────────────
  const nonCwQtyNeedsFix = nonCwItems.filter(({ diffs }) =>
    diffs.some(d => d.field === '_itemQuantity')
  )
  if (nonCwQtyNeedsFix.length > 0) {
    logics.push({
      id: 'updateQtyForNonCW',
      methodName: 'updateQuantity',
      category: 'quantity',
      description: `Non-CW items: XML \`quantity\` attribute differs from shop.json \`quantity\`. Verify the correct quantity source and apply at runtime.`,
      triggered: true,
      affectedItems: nonCwQtyNeedsFix.map(({ xmlItem, diffs }) => {
        const d = diffs.find(x => x.field === '_itemQuantity')
        return {
          supplierPartID: xmlItem.supplierPartID, shortName: xmlItem.shortName,
          cwFlag: xmlItem.catchWeightFlag || 'No', shopVal: d?.shopVal ?? '', xmlVal: d?.xmlVal ?? '',
        }
      }),
      code:
`/**
 * Update quantity for non-catch-weight items where XML quantity ≠ shop.json quantity
 * @param {*} dataModel
 */
updateQuantity(dataModel) {
    dataModel[CXML_SUBSTITUTION_CONST.SHOP_ORDER_DETAILS].items.forEach(item => {
        if (item.catchWeightFlag !== 'Yes') {
            // XML sent a different quantity than shop.json.
            // Confirm the correct source — shop.json quantity is the authoritative value.
            // item.quantity = item.quantity; // already from shop.json — verify mapping
        }
    });
}`,
      warnings: ['⚠ Verify whether the XML quantity or the shop.json quantity is authoritative for non-CW items'],
      poomChanges: [],
    })
  }

  // ── 6. updateUnitPriceForCatchWeightItems ───────────────────────────────────
  // Trigger only when the XML Extrinsic `unitPriceInOrderedUnitOfMeasure` ≠ shop.json value.
  // Uses the diffs array (single source of truth for XML vs shop.json mismatches).
  const cwPriceNeedsFix = cwAllItems.filter(({ diffs, cwExplicit }) =>
    cwExplicit && diffs.some(d => d.field === 'unitPriceInOrderedUnitOfMeasure')
  )
  if (cwPriceNeedsFix.length > 0) {
    logics.push({
      id: 'updateUnitPriceForCW',
      methodName: 'updateUnitPriceForCatchWeightItems',
      category: 'price',
      description: `CW=Yes items: \`unitPriceInOrderedUnitOfMeasure\` differs between shop.json and XML. Copy unitPrice → unitPriceInOrderedUnitOfMeasure at runtime to match what the customer XML expects.`,
      triggered: true,
      affectedItems: cwPriceNeedsFix.map(({ xmlItem, diffs }) => {
        const d = diffs.find(x => x.field === 'unitPriceInOrderedUnitOfMeasure')
        return {
          supplierPartID: xmlItem.supplierPartID, shortName: xmlItem.shortName, cwFlag: xmlItem.catchWeightFlag,
          shopVal: d?.shopVal ?? '', xmlVal: d?.xmlVal ?? '',
        }
      }),
      code:
`/**
 * Update unit price for catch weight items
 * @param {*} dataModel
 */
updateUnitPriceForCatchWeightItems(dataModel) {
    dataModel[CXML_SUBSTITUTION_CONST.SHOP_ORDER_DETAILS].items.forEach(item => {
        if (item.catchWeightFlag === 'Yes') {
            item.unitPriceInOrderedUnitOfMeasure = item.unitPrice;
        }
    });
}`,
      warnings: [],
      poomChanges: [],
    })
  }

  // ── 6b. adjustUnitPrice — CW items: direct UnitPrice element mismatch ────────
  // Triggered when <UnitPrice><Money> in XML ≠ shop.json unitPrice for CW items.
  // Distinct from logic 6 which handles the unitPriceInOrderedUnitOfMeasure Extrinsic.
  const cwDirectPriceNeedsFix = cwAllItems.filter(({ diffs }) =>
    diffs.some(d => d.field === '_unitPrice')
  )
  if (cwDirectPriceNeedsFix.length > 0) {
    logics.push({
      id: 'adjustUnitPriceCW',
      methodName: 'adjustUnitPriceForCatchWeightItems',
      category: 'price',
      description: `CW items: \`UnitPrice\` (XML ItemDetail element) differs from \`unitPrice\` in shop.json. For catch-weight items the XML price is often per-lb while shop.json stores per-case — verify and apply the correct conversion.`,
      triggered: true,
      affectedItems: cwDirectPriceNeedsFix.map(({ xmlItem, diffs }) => {
        const d = diffs.find(x => x.field === '_unitPrice')
        return {
          supplierPartID: xmlItem.supplierPartID, shortName: xmlItem.shortName,
          cwFlag: xmlItem.catchWeightFlag, shopVal: d?.shopVal ?? '', xmlVal: d?.xmlVal ?? '',
        }
      }),
      code:
`/**
 * Adjust UnitPrice for catch weight items.
 * shop.json unitPrice and customer XML <UnitPrice><Money> differ.
 * Common cause: XML price is per-lb (weight) while shop.json is per-case, or vice versa.
 * @param {*} dataModel
 */
adjustUnitPriceForCatchWeightItems(dataModel) {
    dataModel[CXML_SUBSTITUTION_CONST.SHOP_ORDER_DETAILS].items.forEach(item => {
        if (item.catchWeightFlag === 'Yes') {
            // Option A: use unitPriceInOrderedUnitOfMeasure (per-weight unit price)
            // item.unitPrice = item.unitPriceInOrderedUnitOfMeasure;
            // Option B: derive from extended price / number of cases
            // item.unitPrice = item.itemExtendedPrice / item.numberOfCases;
            // Option C: accept the shop.json unitPrice as-is (already in dataModel)
        }
    });
}`,
      warnings: [
        '⚠ Confirm whether XML UnitPrice is per-lb (weight) or per-case (CS)',
        '⚠ For CW items, UnitPrice in the POOM may need to map to unitPriceInOrderedUnitOfMeasure',
      ],
      poomChanges: [
        'Verify <UnitPrice><Money> in POOM template — for CW items it may need to reference unitPriceInOrderedUnitOfMeasure instead of unitPrice',
      ],
    })
  }

  // ── 6c. updateUnitPrice — non-CW items: direct UnitPrice element mismatch ───
  // Triggered when <UnitPrice><Money> in XML ≠ shop.json unitPrice for non-CW items.
  const nonCwDirectPriceNeedsFix = nonCwItems.filter(({ diffs }) =>
    diffs.some(d => d.field === '_unitPrice')
  )
  if (nonCwDirectPriceNeedsFix.length > 0) {
    logics.push({
      id: 'updateUnitPriceNonCW',
      methodName: 'updateUnitPrice',
      category: 'price',
      description: `Non-CW items: \`UnitPrice\` (XML ItemDetail element) differs from \`unitPrice\` in shop.json. Ensure the correct price is submitted at runtime.`,
      triggered: true,
      affectedItems: nonCwDirectPriceNeedsFix.map(({ xmlItem, diffs }) => {
        const d = diffs.find(x => x.field === '_unitPrice')
        return {
          supplierPartID: xmlItem.supplierPartID, shortName: xmlItem.shortName,
          cwFlag: xmlItem.catchWeightFlag || 'No', shopVal: d?.shopVal ?? '', xmlVal: d?.xmlVal ?? '',
        }
      }),
      code:
`/**
 * Update UnitPrice for non-catch-weight items.
 * shop.json unitPrice differs from the value in customer XML <UnitPrice><Money>.
 * @param {*} dataModel
 */
updateUnitPrice(dataModel) {
    dataModel[CXML_SUBSTITUTION_CONST.SHOP_ORDER_DETAILS].items.forEach(item => {
        if (item.catchWeightFlag !== 'Yes') {
            // item.unitPrice is the shop.json value at this point.
            // If the XML sends a different price, determine the correct field mapping:
            // item.unitPrice = <correct source field>;
            // Common fix: ensure no rounding or currency formatting differences.
        }
    });
}`,
      warnings: [
        '⚠ Verify which field in shop.json should be the submitted UnitPrice value',
        '⚠ Check for rounding or decimal formatting differences between shop.json and XML',
      ],
      poomChanges: [],
    })
  }

  // ── 7. updateCatchWeightQuantityIfEA ───────────────────────────────────────
  // Only trigger when CW=Yes items have shop.json UOM=EA AND there is an actual
  // quantity or UOM difference — if XML and shop.json are identical, skip entirely.
  const cwEaItems = cwAllItems.filter(({ shopItem: si, cwExplicit, diffs }) =>
    cwExplicit && si &&
    (si.uom || '').toUpperCase() === 'EA' &&
    diffs.some(d => d.field === '_itemQuantity' || d.field === 'UnitOfMeasure')
  )
  if (cwEaItems.length > 0) {
    logics.push({
      id: 'updateCWQtyIfEA',
      methodName: 'updateCatchWeightQuantityIfEA',
      category: 'quantity',
      description: `CW=Yes items with shop.json UOM=EA: quantity = floor(itemExtendedPrice / unitPriceInOrderedUnitOfMeasure).`,
      triggered: true,
      affectedItems: cwEaItems.map(({ xmlItem }) => ({
        supplierPartID: xmlItem.supplierPartID, shortName: xmlItem.shortName,
        cwFlag: xmlItem.catchWeightFlag, shopVal: 'EA', xmlVal: xmlItem.xmlUom,
      })),
      code:
`/**
 * Update quantity for catch weight items if UOM is EA
 * @param {*} dataModel
 */
updateCatchWeightQuantityIfEA(dataModel) {
    dataModel[CXML_SUBSTITUTION_CONST.SHOP_ORDER_DETAILS].items.forEach(item => {
        if (item.catchWeightFlag === 'Yes' && item.uom === 'EA') {
            item.quantity = Math.floor(
                item.itemExtendedPrice / item.unitPriceInOrderedUnitOfMeasure
            );
        }
    });
}`,
      warnings: [],
      poomChanges: [],
    })
  }

  // ── 8. setShippingDescription ───────────────────────────────────────────────
  const shippingDescPrefix = analysis?.shippingDescriptionPrefix || null
  if (shippingDescPrefix) {
    logics.push({
      id: 'setShippingDescription',
      methodName: 'setShippingDescription',
      category: 'shipping',
      description: `ShippingDescription pattern detected — SupplierPartAuxiliaryID prefix: \`${shippingDescPrefix}\`. Build the value as \`${shippingDescPrefix}/0|${shippingDescPrefix}/1|…\` using the number of line items.`,
      triggered: true,
      affectedItems: [],
      code:
`/**
 * Set shipping description to the data model.
 * Format: {SupplierPartAuxiliaryID}/0|{SupplierPartAuxiliaryID}/1|...|{SupplierPartAuxiliaryID}/{n-1}
 * @param {*} dataModel
 * @returns
 */
setShippingDescription(dataModel) {
    const supplierPartAuxiliaryId =
        dataModel[CXML_SUBSTITUTION_CONST.SUPPLIER_PART_AUXILIARY_ID];
    const numLineItems =
        dataModel[CXML_SUBSTITUTION_CONST.SHOP_ORDER_DETAILS].items.length;
    const shippingDescription = Array.from(
        { length: numLineItems },
        (_, index) => \`\${supplierPartAuxiliaryId}/\${index}\`
    ).join('|');
    dataModel[CXML_SUBSTITUTION_CONST.SHIPPING_DESCRIPTION] = shippingDescription;
    return dataModel;
}`,
      warnings: [
        '⚠ Add SHIPPING_DESCRIPTION constant to CXML_SUBSTITUTION_CONST',
        '⚠ Add SUPPLIER_PART_AUXILIARY_ID constant to CXML_SUBSTITUTION_CONST if not already present',
      ],
      poomChanges: [
        'The POOM template Shipping block is updated with <Description xml:lang="EN">{{ShippingDescription}}</Description>',
        'Ensure your data binding maps SHIPPING_DESCRIPTION → ShippingDescription in the template context',
      ],
    })
  }

  // ── 9. updateOrderedQuantity ────────────────────────────────────────────────
  // Only trigger when CW=Yes items have a non-empty orderedQuantity Extrinsic value
  // in the customer XML (e.g. <Extrinsic name="orderedQuantity">2</Extrinsic>).
  // Self-closing / empty (<Extrinsic name="orderedQuantity"/>) → does NOT trigger.
  const cwItemsNeedOrderedQty = itemComparisons
    .filter(c => c.cwExplicit)
    .filter(({ xmlItem }) => {
      const val = (xmlItem.extValues?.orderedQuantity ?? '').toString().trim()
      return val !== ''
    })
  if (cwItemsNeedOrderedQty.length > 0) {
    logics.push({
      id: 'updateOrderedQuantity',
      methodName: 'updateOrderedQuantity',
      category: 'quantity',
      description: `${cwItemsNeedOrderedQty.length} CW=Yes item(s) have an empty \`orderedQuantity\` Extrinsic in the customer XML. Set orderedQuantity = Math.round(quantity) at runtime.`,
      triggered: true,
      affectedItems: cwItemsNeedOrderedQty.map(({ xmlItem }) => ({
        supplierPartID: xmlItem.supplierPartID, shortName: xmlItem.shortName, cwFlag: xmlItem.catchWeightFlag,
      })),
      code:
`/**
 * Update ordered quantity
 * @param {*} dataModel
 */
updateOrderedQuantity(dataModel) {
    dataModel[CXML_SUBSTITUTION_CONST.SHOP_ORDER_DETAILS].items.forEach(item => {
        if (!item?.orderedQuantity ||
            item.orderedQuantity === null ||
            item.orderedQuantity === undefined ||
            item.orderedQuantity === '') {
            item.orderedQuantity = Math.round(item.quantity);
        } else {
            item.orderedQuantity = Math.round(item.orderedQuantity);
        }
    });
}`,
      warnings: [],
      poomChanges: [],
    })
  }

  // ── Final sentinel: nothing at all triggered after full comparison ──────────
  if (logics.filter(l => l.triggered).length === 0) {
    return [{ id: 'noCatchWeights', _noCatchWeights: true, xmlItemCount: xmlItems.length }]
  }

  return logics
}

// ─── Generate POOM template from base + analysis ─────────────────────────────
/**
 * Take the base Handlebars template and inject extra fields discovered in the
 * customer XML.  Returns the modified template string (still Handlebars).
 *
 * @param {string}   baseTemplate
 * @param {object}   analysis           - result of analyzeCustomerXml()
 * @param {string[]} includeExtrinsics  - which extra Extrinsic names to add (default: all extras)
 * @param {string[]} includePomFields   - which extra POM header tags to add (default: all extras)
 * @param {object}   variablePaths      - { [name]: '{{hbsExpression}}' } overrides per extrinsic
 */
export function generatePoomTemplate(baseTemplate, analysis, {
  includeExtrinsics       = null,
  includePomFields        = null,
  variablePaths           = {},
  catchWeightConditionals = []
} = {}) {
  let tpl = baseTemplate

  // ── 0. Patch known scalar values from customer XML into the base template ───
  // Replace the entire <Header> block verbatim from the customer XML.
  // This copies domains, Identity values, SharedSecret, UserAgent — everything — exactly
  // as they appear in the customer file (single source of truth, no guessing).
  if (analysis.rawHeader) {
    tpl = tpl.replace(/<Header>[\s\S]*?<\/Header>/, analysis.rawHeader)
  }

  // ── 0a. Replace literal Identity values with HBS expressions ────────────
  // The base template (aramark_shop.xml) convention:
  //   From   Identity → {{cXML.Header.To.Credential.Identity}}
  //   To     Identity → {{cXML.Header.Sender.Credential.Identity}}
  //   Sender Identity → {{cXML.Header.To.Credential.Identity}}
  // Only replace when there is an actual literal value (not already an HBS token).
  const IDENTITY_HBS = {
    From:   '{{cXML.Header.To.Credential.Identity}}',
    To:     '{{cXML.Header.Sender.Credential.Identity}}',
    Sender: '{{cXML.Header.To.Credential.Identity}}',
  }
  for (const [part, hbs] of Object.entries(IDENTITY_HBS)) {
    const literalVal = analysis.credentials?.[part.toLowerCase()]?.identity
    if (literalVal) {
      // Replace <Identity>LITERAL_VALUE</Identity> inside the matching <Part>…</Part> block
      tpl = tpl.replace(
        new RegExp(`(<${part}>[\\s\\S]*?<Identity>)${literalVal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(<\/Identity>)`),
        `$1${hbs}$2`
      )
    }
  }
  // deploymentMode lives on <Message>, outside <Header>.
  // Rule: "test" → promote to "production"; empty stays empty; anything else kept verbatim.
  const rawMode = analysis.deploymentMode ?? ''
  const resolvedMode = rawMode.toLowerCase() === 'test' ? 'production' : rawMode
  tpl = tpl.replace(/(deploymentMode=)"[^"]*"/, `$1"${resolvedMode}"`)
  // operationAllowed lives on <PunchOutOrderMessageHeader> — same policy.
  tpl = tpl.replace(/(operationAllowed=)"[^"]*"/, `$1"${analysis.operationAllowed ?? ''}"`)  
  // lineNumber: use {{increment @index}} only when customer XML has numbered lines.
  // If all ItemIn had lineNumber="" keep it empty in the template too.
  if (!analysis.hasLineNumbers) {
    tpl = tpl.replace(/(lineNumber=)"[^"]*"/, '$1""')
  }
  // If hasLineNumbers, base template already has {{increment @index}} — leave it.

  // ── 1. PunchOutOrderMessageHeader extra fields ──────────────────────────
  const pomToAdd = (includePomFields ?? analysis.pomExtraFields).filter(Boolean)
  if (pomToAdd.length > 0) {
    const pomLines = pomToAdd.map(tag => {
      // ── Use the actual structure from the customer XML if available ──
      const rawFromCustomer = analysis?.pomExtraFieldsXml?.[tag]
      if (rawFromCustomer) {
        return reindentXml(rawFromCustomer, 4)
      }
      // ── Fallback hardcoded blocks (used when no customer XML structure captured) ──
      if (tag === 'Shipping') {
        const descLine = analysis?.shippingDescriptionPrefix
          ? '\n\t\t\t\t\t<Description xml:lang="EN">{{ShippingDescription}}</Description>'
          : ''
        return `\t\t\t\t<Shipping>\n\t\t\t\t\t<Money currency="USD"/>${descLine}\n\t\t\t\t</Shipping>`
      }
      if (tag === 'ShipTo')
        return [
          '\t\t\t\t<ShipTo>',
          '\t\t\t\t\t<Address>',
          '\t\t\t\t\t\t<Name xml:lang="en"/>',
          '\t\t\t\t\t\t<PostalAddress>',
          '\t\t\t\t\t\t\t<DeliverTo/>\n\t\t\t\t\t\t\t<Street/>\n\t\t\t\t\t\t\t<City/>\n\t\t\t\t\t\t\t<State/>\n\t\t\t\t\t\t\t<PostalCode/>',
          '\t\t\t\t\t\t\t<Country isoCountryCode=""/>',
          '\t\t\t\t\t\t</PostalAddress>',
          '\t\t\t\t\t</Address>',
          '\t\t\t\t</ShipTo>'
        ].join('\n')
      if (tag === 'Tax')
        return '\t\t\t\t<Tax>\n\t\t\t\t\t<Money currency="USD">0.00</Money>\n\t\t\t\t\t<Description xml:lang="en"><![CDATA[]]></Description>\n\t\t\t\t</Tax>'
      return `\t\t\t\t<${tag}/>`
    }).join('\n')

    // Match the exact 3-tab indent used in aramark_shop.xml
    tpl = tpl.replace(/(\t{3}<\/PunchOutOrderMessageHeader>)/, `${pomLines}\n$1`)
    // Fallback: any-whitespace match if tabs differ
    if (!tpl.includes(pomLines)) {
      tpl = tpl.replace(/[ \t]*<\/PunchOutOrderMessageHeader>/, `${pomLines}\n\t\t\t</PunchOutOrderMessageHeader>`)
    }
  }

  // ── 2. Rebuild the entire Extrinsics block from customer XML value patterns ──
  //
  // Pattern rules (driven by analysis.extrinsicPatterns from customer_specific):
  //   always_empty    → self-closing <Extrinsic name="field"/> kept in template
  //   cw_only         → wrapped in {{#if (eq catchWeightFlag "Yes")}}
  //   sometimes_valued→ {{#if field}}<Extrinsic...>{{field}}</Extrinsic>{{else}}<Extrinsic name="field"/>{{/if}}
  //   always_valued   → plain <Extrinsic name="field">{{field}}</Extrinsic>
  //
  // Ordering follows extrinsicUniverse (the order found in customer_specific items).

  const I5 = '\t\t\t\t\t'

  // Canonical Handlebars variable for every base-template Extrinsic field
  const KNOWN_VARS = {
    splitIndicator:                  '{{splitIndicator}}',
    itemExtendedPrice:               '{{itemExtendedPrice}}',
    orderDetailLineNumber:           '{{orderDetailLineNumber}}',
    catchWeightFlag:                 '{{catchWeightFlag}}',
    orderedUnitOfMeasure:            '{{orderedUnitOfMeasure}}',
    unitPriceInOrderedUnitOfMeasure: '{{unitPriceInOrderedUnitOfMeasure}}',
    averageWeightPerCase:            '{{averageWeightPerCase}}',
    casePack:                        '{{casePack}}',
    caseSize:                        '{{caseSize}}',
    itemsPerCase:                    '{{itemsPerCase}}',
    specialOrderItem:                '{{specialOrderItem}}',
    marketPriceFlag:                 '{{marketPriceFlag}}',
    orderedQuantity:                 '{{orderedQuantity}}',
    apply_sessionlink:               '1',   // hardcoded literal
  }

  const extToInclude = new Set((includeExtrinsics ?? analysis.extraExtrinsics).filter(Boolean))
  const patterns     = analysis.extrinsicPatterns || {}
  const baseSet      = new Set(analysis.baseExtrinsics || [])

  const builtLines = []
  for (const name of (analysis.extrinsicUniverse || [])) {
    // Extra (non-base) fields: only include if user selected them
    if (!baseSet.has(name) && !extToInclude.has(name)) continue

    const pat    = patterns[name] ?? 'sometimes_valued'

    const camel  = name.charAt(0).toLowerCase() + name.slice(1)
    const hbsVal = variablePaths[name] ?? KNOWN_VARS[name] ?? `{{@root.ShopOrderDetails.${camel}}}`
    const tag    = `${I5}<Extrinsic name="${name}">${hbsVal}</Extrinsic>`
    const self   = `${I5}<Extrinsic name="${name}"/>`

    // CW-only (auto-detected) OR user manually put it in catchWeightConditionals
    if (pat === 'cw_only' || catchWeightConditionals.includes(name)) {
      builtLines.push(`${I5}{{#if (eq catchWeightFlag "Yes")}}\n${tag}\n${I5}{{/if}}`)
      continue
    }

    // 'always_valued' → plain tag (value guaranteed every time)
    if (pat === 'always_valued') {
      builtLines.push(tag)
      continue
    }

    // 'always_empty' and 'sometimes_valued' both get the full if/else guard:
    //   {{#if field}}<Extrinsic>{{field}}</Extrinsic>{{else}}<Extrinsic/>{{/if}}
    // This handles the case where a value is empty/absent in the sample
    // but may be populated at runtime.
    const cond = hbsVal.replace(/^\{\{+/, '').replace(/\}\}+$/, '')
    builtLines.push(`${I5}{{#if ${cond}}}\n${tag}\n${I5}{{else}}\n${self}\n${I5}{{/if}}`)
  }

  // Replace the Extrinsics section in the template:
  // match from <ManufacturerPartID/> through </ItemDetail> and rebuild
  const rebuilt = `<ManufacturerPartID/>\n${builtLines.join('\n')}\n\t\t\t\t</ItemDetail>`
  if (/<ManufacturerPartID\/>[ \t\n\r][\s\S]*?<\/ItemDetail>/.test(tpl)) {
    tpl = tpl.replace(/<ManufacturerPartID\/>[ \t\n\r][\s\S]*?<\/ItemDetail>/, rebuilt)
  } else {
    // Fallback: just replace the closing tag
    tpl = tpl.replace(/[ \t]*<\/ItemDetail>/, `${builtLines.join('\n')}\n\t\t\t\t</ItemDetail>`)
  }

  // ── §10. Hardcoded phantom / metadata items ──────────────────────────────
  // Some customers append non-product items after the regular item loop.
  // These have: empty lineNumber, empty SupplierPartAuxiliaryID, price = 0.
  // They are injected verbatim as hardcoded <ItemIn> blocks AFTER {{/each}}.
  const phantomItems = analysis?.phantomItems ?? []
  if (phantomItems.length > 0) {
    const I3 = '\t\t\t', I4 = '\t\t\t\t', I5p = '\t\t\t\t\t', I6 = '\t\t\t\t\t\t'
    const phantomBlocks = phantomItems.map((pi, pIdx) => {
      const sp  = pi.supplierPartID ? `${I5p}<SupplierPartID>${pi.supplierPartID}</SupplierPartID>` : `${I5p}<SupplierPartID/>`
      const extLines = pi.extrinsics.map(({ name, value }) =>
        value ? `${I5p}<Extrinsic name="${name}">${value}</Extrinsic>` : `${I5p}<Extrinsic name="${name}"/>`
      ).join('\n')
      return [
        `${I3}<!-- ── Hardcoded metadata item ${pIdx + 1} of ${phantomItems.length} (phantom — no shop.json match needed) ── -->`,
        `${I3}<ItemIn lineNumber="" quantity="${pi.quantity}">`,
        `${I4}<ItemID>`,
        sp,
        `${I5p}<SupplierPartAuxiliaryID/>`,
        `${I4}</ItemID>`,
        `${I4}<ItemDetail>`,
        `${I5p}<UnitPrice>`,
        `${I6}<Money currency="USD">${pi.price}</Money>`,
        `${I5p}</UnitPrice>`,
        `${I5p}<Description xml:lang="EN">${pi.descText}</Description>`,
        `${I5p}<UnitOfMeasure>${pi.uom}</UnitOfMeasure>`,
        `${I5p}<Classification domain="${pi.classificationDomain}">${pi.classificationValue}</Classification>`,
        `${I5p}<ManufacturerPartID/>`,
        extLines,
        `${I4}</ItemDetail>`,
        `${I3}</ItemIn>`
      ].join('\n')
    }).join('\n')
    // Insert after {{/each}}, before </PunchOutOrderMessage>
    tpl = tpl.replace(
      /(\{\{\/each\}\})([\s\S]*?<\/PunchOutOrderMessage>)/,
      `$1\n${phantomBlocks}\n$2`
    )
  }

  return tpl
}
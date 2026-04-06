// Full JSON vs XML comparison — every field, all mismatches become catch weight issues
import { parseXmlString } from './xmlUtils'

const WEIGHT_UNITS = new Set(['LB', 'LBS', 'OZ', 'KG', 'G', 'GRAM', 'GRAMS'])

function norm(v) { return String(v ?? '').replace(/\s+/g, ' ').trim() }

function getDescText(detail) {
  const el = detail?.querySelector('Description')
  if (!el) return ''
  return Array.from(el.childNodes)
    .filter(n => n.nodeType === 3)
    .map(n => n.textContent)
    .join('').replace(/\s+/g, ' ').trim()
}

function extrinsicVal(detail, name) {
  return norm(detail?.querySelector(`Extrinsic[name="${name}"]`)?.textContent)
}

// Every JSON field that maps to a cXML value
const FIELD_MAP = [
  { jsonKey: 'quantity',    label: 'Quantity',              group: 'Item',       xmlGet: (item)    => norm(item.getAttribute('quantity')) },
  { jsonKey: 'uom',         label: 'UnitOfMeasure',         group: 'ItemDetail', xmlGet: (i, d)    => norm(d?.querySelector('UnitOfMeasure')?.textContent) },
  { jsonKey: 'unitPrice',   label: 'UnitPrice',             group: 'ItemDetail', xmlGet: (i, d)    => norm(d?.querySelector('UnitPrice > Money')?.textContent) },
  { jsonKey: 'cmim',        label: 'Classification (CMIM)', group: 'ItemDetail', xmlGet: (i, d)    => norm(d?.querySelector('Classification')?.textContent) },
  { jsonKey: 'description', label: 'Description',           group: 'ItemDetail', xmlGet: (i, d)    => norm(getDescText(d)) },
  { jsonKey: 'name',        label: 'ShortName',             group: 'ItemDetail', xmlGet: (i, d)    => norm(d?.querySelector('Description > ShortName')?.textContent) },
  { jsonKey: 'splitIndicator',                  label: 'splitIndicator',                  group: 'Extrinsics', xmlGet: (i, d) => extrinsicVal(d, 'splitIndicator') },
  { jsonKey: 'itemExtendedPrice',               label: 'itemExtendedPrice',               group: 'Extrinsics', xmlGet: (i, d) => extrinsicVal(d, 'itemExtendedPrice') },
  { jsonKey: 'orderDetailLineNumber',           label: 'orderDetailLineNumber',           group: 'Extrinsics', xmlGet: (i, d) => extrinsicVal(d, 'orderDetailLineNumber') },
  { jsonKey: 'catchWeightFlag',                 label: 'catchWeightFlag',                 group: 'Extrinsics', xmlGet: (i, d) => extrinsicVal(d, 'catchWeightFlag') },
  { jsonKey: 'orderedUnitOfMeasure',            label: 'orderedUnitOfMeasure',            group: 'Extrinsics', xmlGet: (i, d) => extrinsicVal(d, 'orderedUnitOfMeasure') },
  { jsonKey: 'unitPriceInOrderedUnitOfMeasure', label: 'unitPriceInOrderedUOM',           group: 'Extrinsics', xmlGet: (i, d) => extrinsicVal(d, 'unitPriceInOrderedUnitOfMeasure') },
  { jsonKey: 'averageWeightPerCase',            label: 'averageWeightPerCase',            group: 'Extrinsics', xmlGet: (i, d) => extrinsicVal(d, 'averageWeightPerCase') },
  { jsonKey: 'casePack',                        label: 'casePack',                        group: 'Extrinsics', xmlGet: (i, d) => extrinsicVal(d, 'casePack') },
  { jsonKey: 'caseSize',                        label: 'caseSize',                        group: 'Extrinsics', xmlGet: (i, d) => extrinsicVal(d, 'caseSize') },
  { jsonKey: 'itemsPerCase',                    label: 'itemsPerCase',                    group: 'Extrinsics', xmlGet: (i, d) => extrinsicVal(d, 'itemsPerCase') },
  { jsonKey: 'specialOrderItem',                label: 'specialOrderItem',                group: 'Extrinsics', xmlGet: (i, d) => extrinsicVal(d, 'specialOrderItem') },
  { jsonKey: 'marketPriceFlag',                 label: 'marketPriceFlag',                 group: 'Extrinsics', xmlGet: (i, d) => extrinsicVal(d, 'marketPriceFlag') },
]

/**
 * Classify a mismatched field into a concrete catch-weight type + severity.
 * The catch-weight concept is broad: ANY mismatch between shop.json and the
 * customer XML is a discrepancy that needs attention.
 */
function classify(d) {
  const key = d.jsonKey
  const jv  = d.jsonValue.toUpperCase()
  const xv  = d.xmlValue.toUpperCase()

  if (key === 'uom' || key === 'orderedUnitOfMeasure') {
    const xmlIsWeight  = WEIGHT_UNITS.has(xv)
    const shopIsWeight = WEIGHT_UNITS.has(jv)
    if (xmlIsWeight && !shopIsWeight) {
      // The customer XML has a weight unit (LB/OZ) while shop has case — classic catch weight
      return { type: 'UOMWeightInXML', severity: 'high' }
    }
    if (shopIsWeight && !xmlIsWeight) {
      // Shop JSON has weight unit while XML has case/other
      return { type: 'UOMWeightInShop', severity: 'high' }
    }
    return { type: key === 'orderedUnitOfMeasure' ? 'OrderedUOMDiff' : 'UOMMismatch', severity: 'high' }
  }

  if (key === 'unitPriceInOrderedUnitOfMeasure') return { type: 'PricingUOMDiff',      severity: 'high'    }
  if (key === 'unitPrice')                        return { type: 'UnitPriceDiff',       severity: 'high'    }
  if (key === 'itemExtendedPrice')                return { type: 'ExtendedPriceDiff',   severity: 'high'    }
  if (key === 'quantity')                         return { type: 'QuantityDiff',        severity: 'high'    }
  if (key === 'catchWeightFlag')                  return { type: 'CatchWeightFlagDiff', severity: 'warning' }
  if (key === 'splitIndicator')                   return { type: 'SplitIndicatorDiff',  severity: 'warning' }
  if (key === 'cmim')                             return { type: 'ClassificationDiff',  severity: 'medium'  }
  if (key === 'averageWeightPerCase')             return { type: 'AvgWeightDiff',       severity: 'medium'  }
  if (key === 'casePack' || key === 'itemsPerCase') return { type: 'CasePackDiff',      severity: 'medium'  }
  if (key === 'caseSize')                         return { type: 'CaseSizeDiff',        severity: 'medium'  }
  if (key === 'description' || key === 'name')    return { type: 'DescriptionDiff',     severity: 'low'     }
  if (key === 'marketPriceFlag')                  return { type: 'MarketPriceFlagDiff', severity: 'low'     }
  if (key === 'specialOrderItem')                 return { type: 'SpecialOrderDiff',    severity: 'low'     }
  return { type: 'ValueMismatch', severity: 'medium' }
}

export function compareJsonAndXml(shopJsonText, customerXmlText) {
  let shop
  try { shop = JSON.parse(shopJsonText) } catch { shop = { items: [] } }

  const shopItems  = shop.items || []
  const bySupplier = new Map(shopItems.map(it => [String(it.supplierId), it]))

  const doc      = parseXmlString(customerXmlText)
  const xmlItems = Array.from(doc.querySelectorAll('Message > PunchOutOrderMessage > ItemIn'))

  const results = xmlItems.map((item, idx) => {
    const supplierPartID = norm(item.querySelector('ItemID > SupplierPartID')?.textContent)
    const detail         = item.querySelector('ItemDetail')

    // Match by supplierId first; fall back to same sequential index
    const jsonItem       = bySupplier.get(supplierPartID) ?? shopItems[idx] ?? null
    const matchedByIndex = !bySupplier.has(supplierPartID) && !!shopItems[idx]

    // Full field-by-field comparison (used in "JSON vs XML" table tab)
    const fieldDiffs = FIELD_MAP.map(f => {
      const jsonVal = norm(jsonItem?.[f.jsonKey] ?? '')
      const xmlVal  = norm(f.xmlGet(item, detail))
      return {
        label: f.label, group: f.group, jsonKey: f.jsonKey,
        jsonValue: jsonVal, xmlValue: xmlVal,
        isMatch: jsonVal === xmlVal, bothEmpty: !jsonVal && !xmlVal
      }
    })

    // Catch weights = every mismatched field, classified by type/severity
    const catchWeights = fieldDiffs
      .filter(d => !d.isMatch && !d.bothEmpty)
      .map(d => ({ ...d, ...classify(d) }))

    const jsonUOM = norm(jsonItem?.uom || '')
    const xmlUOM  = norm(detail?.querySelector('UnitOfMeasure')?.textContent || '')

    return {
      supplierPartID,
      lineNumber:    item.getAttribute('lineNumber') || '',
      shortName:     norm(detail?.querySelector('Description > ShortName')?.textContent),
      jsonUOM, xmlUOM,
      fieldDiffs,
      catchWeights,
      hasJsonItem:   !!jsonItem,
      matchedByIndex
    }
  })

  return { items: results }
}

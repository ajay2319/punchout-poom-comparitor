// Full XML vs Template comparison — checks structure, attributes, missing/extra fields
import { parseXmlString } from './xmlUtils'

/** Remove Handlebars so template can be parsed as XML */
function sanitizeTemplateXml(xmlText) {
  return (xmlText || '')
    .replace(/\{{{[\s\S]*?}}}/g, '')    // triple-brace first
    .replace(/\{\{#[\s\S]*?\}\}/g, '')   // {{#if}}, {{#each}}
    .replace(/\{\{\/[\s\S]*?\}\}/g, '')  // {{/if}}, {{/each}}
    .replace(/\{\{[\s\S]*?\}\}/g, '')    // {{...}}
}

/**
 * Extract required structure and attribute expectations from template XML.
 * Returns: requiredExtrinsics, requiredChildren, envelope expectations.
 */
function analyzeTemplate(templateText) {
  const clean = sanitizeTemplateXml(templateText)
  const tDoc = parseXmlString(clean)

  // cXML root attributes
  const tCxml = tDoc.querySelector('cXML')
  const expectedVersion  = tCxml?.getAttribute('version') || ''
  const expectedXmlLang  = tCxml?.getAttribute('xml:lang') || ''

  // Message
  const tMsg = tDoc.querySelector('Message')
  const expectedDeploymentMode = tMsg?.getAttribute('deploymentMode') || ''

  // Header credentials
  const tHdr = tDoc.querySelector('Header')
  const credExpected = {}
  for (const part of ['From', 'To', 'Sender']) {
    const cred = tHdr?.querySelector(`${part} > Credential`)
    credExpected[part.toLowerCase()] = {
      domain: cred?.getAttribute('domain') || '',
      identityPresent: !!tHdr?.querySelector(`${part} > Credential > Identity`)
    }
  }
  const expectedUserAgent = tHdr?.querySelector('Sender > UserAgent')?.textContent?.trim() || ''

  // PunchOutOrderMessageHeader
  const tPomHdr = tDoc.querySelector('PunchOutOrderMessageHeader')
  const expectedOpAllowed = tPomHdr?.getAttribute('operationAllowed') || ''
  const tPomHdrChildren = tPomHdr ? Array.from(tPomHdr.children).map(c => c.tagName) : []

  // ItemDetail required children — from the #each block
  const itemBlock =
    (templateText.match(/\{\{#each\s+ShopOrderDetails\.items\}\}([\s\S]*?)\{\{\/each\}\}/) || [null, templateText])[1] || templateText
  const cleanBlock = sanitizeTemplateXml(itemBlock)
  const iDetailBlock = (cleanBlock.match(/<ItemDetail>([\s\S]*?)<\/ItemDetail>/) || [null, ''])[1]
  let requiredChildren = []
  if (iDetailBlock) {
    const tags = Array.from(iDetailBlock.matchAll(/<([A-Za-z]+)[\s>]/g)).map(m => m[1])
    const skip = new Set(['Extrinsic', 'Money', 'ShortName'])
    requiredChildren = [...new Set(tags.filter(t => !skip.has(t)))]
  }
  if (requiredChildren.length === 0) {
    requiredChildren = ['UnitPrice', 'Description', 'UnitOfMeasure', 'Classification', 'ManufacturerPartID']
  }

  // Required extrinsics
  const requiredExtrinsics = Array.from(templateText.matchAll(/<Extrinsic\s+name="([^"]+)"/g)).map(m => m[1])

  // Expected attribute checks per item (hardcoded in template)
  const descLang     = 'EN'   // <Description xml:lang="EN">
  const moneyCurrency= 'USD'  // <Money currency="USD">

  return {
    requiredExtrinsics,
    requiredChildren,
    envelope: { expectedVersion, expectedXmlLang, expectedDeploymentMode },
    header: { credExpected, expectedUserAgent },
    punchOutHeader: { expectedOpAllowed, tPomHdrChildren },
    itemAttrExpected: { descLang, moneyCurrency }
  }
}

/**
 * Full comparison: template structure vs customer XML data.
 */
export function compareXmlAgainstTemplate(templateText, customerXmlText) {
  const tpl = analyzeTemplate(templateText)
  const doc = parseXmlString(customerXmlText)

  // ---- Envelope (cXML root) ----
  const cCxml = doc.querySelector('cXML')
  const envelopeChecks = [
    { field: 'version',   expected: tpl.envelope.expectedVersion,  actual: cCxml?.getAttribute('version')    || '', ok: !tpl.envelope.expectedVersion  || (cCxml?.getAttribute('version')    || '') === tpl.envelope.expectedVersion  },
    { field: 'xml:lang',  expected: tpl.envelope.expectedXmlLang,  actual: cCxml?.getAttribute('xml:lang')   || '', ok: !tpl.envelope.expectedXmlLang  || (cCxml?.getAttribute('xml:lang')   || '') === tpl.envelope.expectedXmlLang  },
    { field: 'payloadID', expected: '(dynamic)', actual: cCxml?.getAttribute('payloadID') || '', ok: true },
    { field: 'timestamp', expected: '(dynamic)', actual: cCxml?.getAttribute('timestamp') || '', ok: true },
  ]

  // ---- Message ----
  const cMsg = doc.querySelector('Message')
  const actualDeploymentMode = cMsg?.getAttribute('deploymentMode') || ''
  const deploymentModeOk = !tpl.envelope.expectedDeploymentMode || actualDeploymentMode === tpl.envelope.expectedDeploymentMode

  // ---- Header credentials ----
  const cHdr = doc.querySelector('Header')
  const credChecks = ['from', 'to', 'sender'].map(key => {
    const part = key.charAt(0).toUpperCase() + key.slice(1)
    const cCred = cHdr?.querySelector(`${part} > Credential`)
    const cIdent = cHdr?.querySelector(`${part} > Credential > Identity`)
    const expected = tpl.header.credExpected[key]
    return {
      part,
      domain: {
        expected: expected.domain,
        actual: cCred?.getAttribute('domain') || '',
        ok: !expected.domain || (cCred?.getAttribute('domain') || '') === expected.domain
      },
      identity: {
        value: cIdent?.textContent?.trim() || '',
        present: !!cIdent
      }
    }
  })

  const actualUserAgent = cHdr?.querySelector('Sender > UserAgent')?.textContent?.trim() || ''

  // ---- PunchOutOrderMessageHeader ----
  const cPomHdr = doc.querySelector('PunchOutOrderMessageHeader')
  const actualOpAllowed = cPomHdr?.getAttribute('operationAllowed') || ''
  const cPomHdrChildren = cPomHdr ? Array.from(cPomHdr.children).map(c => c.tagName) : []
  const extraPomFields   = cPomHdrChildren.filter(t => !tpl.punchOutHeader.tPomHdrChildren.includes(t))
  const missingPomFields = tpl.punchOutHeader.tPomHdrChildren.filter(t => !cPomHdrChildren.includes(t))

  const totalMoney = cPomHdr?.querySelector('Total > Money')
  const buyerCookie = (doc.querySelector('PunchOutOrderMessage > BuyerCookie')?.textContent || '').trim()

  // ---- Items ----
  const cItems = Array.from(doc.querySelectorAll('Message > PunchOutOrderMessage > ItemIn'))
  const items = cItems.map((item, idx) => {
    const lineNumber = item.getAttribute('lineNumber') || String(idx + 1)
    const quantity   = item.getAttribute('quantity') || ''
    const supplierPartID         = (item.querySelector('ItemID > SupplierPartID')?.textContent || '').trim()
    const supplierPartAuxiliaryID= (item.querySelector('ItemID > SupplierPartAuxiliaryID')?.textContent || '').trim()
    const detail = item.querySelector('ItemDetail')

    const xmlUOM    = (detail?.querySelector('UnitOfMeasure')?.textContent || '').trim()
    const shortName = (detail?.querySelector('Description > ShortName')?.textContent || '').trim()
    const catchWeightFlag = Array.from(detail?.querySelectorAll('Extrinsic') || [])
      .find(e => e.getAttribute('name') === 'catchWeightFlag')?.textContent?.trim() || ''

    // Present direct children (tags) of ItemDetail (excl Extrinsic)
    const presentChildren = detail
      ? Array.from(detail.children).filter(c => c.tagName !== 'Extrinsic').map(c => c.tagName)
      : []

    // Present extrinsic names
    const presentExtrinsics = detail
      ? Array.from(detail.querySelectorAll('Extrinsic')).map(e => e.getAttribute('name') || '')
      : []

    // Missing vs template
    const missingExtrinsics       = tpl.requiredExtrinsics.filter(n => !presentExtrinsics.includes(n))
    const missingItemDetailChildren = tpl.requiredChildren.filter(n => !presentChildren.includes(n))

    // Extra in customer not in template
    const extraExtrinsics         = presentExtrinsics.filter(n => !tpl.requiredExtrinsics.includes(n))
    const extraItemDetailChildren = presentChildren.filter(n => !tpl.requiredChildren.includes(n))

    // Attribute checks (hardcoded template expectations)
    const actualDescLang  = (detail?.querySelector('Description')?.getAttribute('xml:lang') || '').trim()
    const actualCurrency  = (detail?.querySelector('UnitPrice > Money')?.getAttribute('currency') || '').trim()
    const attrChecks = [
      { attr: 'Description@xml:lang',    expected: tpl.itemAttrExpected.descLang,     actual: actualDescLang,  ok: !actualDescLang  || actualDescLang  === tpl.itemAttrExpected.descLang     },
      { attr: 'UnitPrice/Money@currency', expected: tpl.itemAttrExpected.moneyCurrency, actual: actualCurrency,  ok: !actualCurrency  || actualCurrency  === tpl.itemAttrExpected.moneyCurrency },
    ]

    return {
      lineNumber,
      quantity,
      supplierPartID,
      supplierPartAuxiliaryID,
      xmlUOM,
      shortName,
      catchWeightFlag,
      missingExtrinsics,
      extraExtrinsics,
      missingItemDetailChildren,
      extraItemDetailChildren,
      attrChecks
    }
  })

  return {
    template: {
      requiredExtrinsics: tpl.requiredExtrinsics,
      requiredChildren: tpl.requiredChildren
    },
    envelope: {
      checks: envelopeChecks,
      deploymentMode: {
        expected: tpl.envelope.expectedDeploymentMode,
        actual: actualDeploymentMode,
        ok: deploymentModeOk
      }
    },
    header: {
      present: !!cHdr,
      credentials: credChecks,
      userAgent: {
        expected: tpl.header.expectedUserAgent || 'notUsed',
        actual: actualUserAgent,
        ok: !tpl.header.expectedUserAgent || actualUserAgent === tpl.header.expectedUserAgent
      }
    },
    punchOutHeader: {
      buyerCookie,
      totalCurrency: totalMoney?.getAttribute('currency') || '',
      totalValue: totalMoney?.textContent?.trim() || '',
      operationAllowed: {
        expected: tpl.punchOutHeader.expectedOpAllowed,
        actual: actualOpAllowed,
        ok: !tpl.punchOutHeader.expectedOpAllowed || actualOpAllowed === tpl.punchOutHeader.expectedOpAllowed
      },
      extraFields: extraPomFields,
      missingFields: missingPomFields
    },
    items
  }
}
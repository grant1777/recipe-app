/* Receipt parsing runs locally; only reviewed stock entries are saved. */
(function (root) {
  "use strict";
  const money = /\$\s*\d[\d,]*\.\d{2}/g;
  const qty = /\b(?:qty|quantity)\s*[:.x-]?\s*(\d+(?:\.\d+)?)\b/i;
  const unavailable = /\b(?:out of stock|unavailable|cancell?ed|removed|refunded|not received|not delivered)\b/i;
  const noise = /^(?:walmart\+?|order\b|receipt\b|thanks?\b|thank you\b|hi\b|hello\b|subtotal\b|total\b|estimated total\b|tax(?:es)?\b|sales tax\b|tip\b|driver tip\b|delivery\b|shipping\b|pickup\b|payment\b|visa\b|mastercard\b|discover\b|amex\b|savings\b|discount\b|fees?\b|bag fee\b|service fee\b|address\b|billing\b|contact\b|help\b|view\b|track\b|reorder\b|return\b|original item\b|substituted for\b|replaced item\b|sold by\b|fulfilled by\b|you saved\b|was\s*\$|now\s*\$)/i;

  function parse(text) {
    const lines = String(text).replace(/\r/g, "").split(/\n/).map(line => line.replace(/\u00a0/g, " ").trim()).filter(Boolean);
    const rows = [];
    let blockedSection = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/^(?:out of stock|unavailable|cancell?ed|removed|refunded)\s*(?:items?)?\s*(?:\(?\d+\)?)?\s*:?$/i.test(line)) {
        blockedSection = true;
        continue;
      }
      if (/^(?:items(?: received| delivered| ordered)?|delivered items|received items|purchased items|substitutions|substituted items)\s*(?:\(?\d+\)?)?\s*:?$/i.test(line)) {
        blockedSection = false;
        continue;
      }
      if (noise.test(line) || /^(?:qty|quantity|price|item|amount)\s*:?$/i.test(line) || !/[a-z]/i.test(line) || /^https?:|^[^\s]+@/i.test(line)) continue;
      const inlineQty = line.match(qty);
      let hasQuantity = Boolean(inlineQty);
      let quantity = inlineQty ? Number(inlineQty[1]) : 1;
      let evidence = inlineQty || line.match(money);
      let status = blockedSection || unavailable.test(line);
      let end = i;
      // A copied email typically puts price and quantity below the product name.
      for (let j = i + 1; j < Math.min(lines.length, i + 7); j++) {
        const next = lines[j];
        if (/^(?:(?:out of stock|unavailable|cancell?ed|removed|refunded)\s+items|items(?: received| delivered| ordered)?|delivered items|received items|purchased items|substitutions|substituted items)\s*(?:\(?\d+\)?)?\s*:?$/i.test(next)) break;
        const foundQty = /^(?:qty|quantity)\b/i.test(next) ? next.match(qty) : null;
        if (foundQty) {
          quantity = Number(foundQty[1]);
          hasQuantity = true;
          evidence = true;
        } else if (/^(?:qty|quantity)\s*:?$/i.test(next) && /^\d+(?:\.\d+)?$/.test(lines[j + 1] || "")) {
          quantity = Number(lines[++j]);
          hasQuantity = true;
          evidence = true;
        } else if (unavailable.test(next)) {
          status = true;
        } else if (/^(?:\$\s*[\d,.]+(?:\s*(?:each|ea|\/\s*(?:lb|oz)))?|\d+(?:\.\d+)?\s*(?:x|@)\s*\$[\d,.]+|(?:price|total price)\s*:?\s*\$[\d,.]+|\$[\d,.]+\s*\$[\d,.]+)$/i.test(next)) {
          evidence = true;
          const multiplier = next.match(/^(\d+(?:\.\d+)?)\s*(?:x|@)/i);
          if (multiplier) {
            quantity = Number(multiplier[1]);
            hasQuantity = true;
          }
        } else if (/^(?:substituted|replacement|substitution|received|delivered)$/i.test(next)) {
          // Status labels are not products.
        } else {
          break;
        }
        end = j;
      }
      if (!evidence) continue;
      let name = line.replace(qty, "").replace(money, "").replace(/\b(?:out of stock|unavailable|cancell?ed|removed|refunded|not received|not delivered)\b/ig, "").replace(/\s*[|\t]\s*/g, " ").replace(/\s+/g, " ").replace(/^[\s:;-]+|[\s:;-]+$/g, "");
      const leadingCount = name.match(/^(\d+(?:\.\d+)?)\s*[x×]\s+(.+)$/i);
      if (leadingCount) {
        quantity = Number(leadingCount[1]);
        hasQuantity = true;
        name = leadingCount[2];
      }
      if (!name || noise.test(name) || !/[a-z]/i.test(name)) continue;
      rows.push({ name, quantity, unit: "package", selected: !status && quantity > 0, warning: status ? "Not received — excluded" : (!hasQuantity ? "Quantity assumed: 1 package" : "") });
      i = end;
    }
    return rows;
  }

  function decodeTransfer(body, encoding) {
    if (/base64/i.test(encoding)) {
      const bytes = Uint8Array.from(atob(body.replace(/\s/g, "")), char => char.charCodeAt(0));
      return new TextDecoder().decode(bytes);
    }
    if (/quoted-printable/i.test(encoding)) {
      const joined = body.replace(/=\r?\n/g, "");
      const bytes = [];
      for (let i = 0; i < joined.length; i++) {
        if (joined[i] === "=" && /^[0-9a-f]{2}$/i.test(joined.slice(i + 1, i + 3))) {
          bytes.push(parseInt(joined.slice(i + 1, i + 3), 16));
          i += 2;
        } else bytes.push(...new TextEncoder().encode(joined[i]));
      }
      return new TextDecoder().decode(new Uint8Array(bytes));
    }
    return body;
  }

  function emailBody(source, depth = 0) {
    if (depth > 6) throw new Error("This email has too many nested parts. Paste its receipt body instead.");
    if (!/^content-type:|^mime-version:|^from:/im.test(source)) return source;
    const boundary = source.match(/boundary\s*=\s*(?:"([^"]+)"|([^\s;]+))/i);
    const parts = boundary ? source.split(`--${boundary[1] || boundary[2]}`) : [source];
    const candidates = [];
    for (const part of parts) {
      const split = part.search(/\r?\n\r?\n/);
      if (split < 0) continue;
      const headers = part.slice(0, split).replace(/\r?\n[ \t]+/g, " ");
      if (/content-disposition:\s*attachment/i.test(headers)) continue;
      if (/content-type:\s*multipart\//i.test(headers) && !boundary) throw new Error("This email is missing its part boundaries. Paste its receipt body instead.");
      if (/content-type:\s*multipart\//i.test(headers) && /boundary\s*=/i.test(headers)) {
        // Gmail may wrap multipart/alternative inside multipart/mixed.
        if (headers.match(/boundary\s*=\s*(?:"([^"]+)"|([^\s;]+))/i)?.[0] !== boundary?.[0]) {
          candidates.push({ type: "text/html", text: emailBody(part.trimStart(), depth + 1) });
        }
        continue;
      }
      const type = headers.match(/content-type:\s*(text\/(?:plain|html))/i)?.[1];
      if (!type) continue;
      const body = part.slice(split).replace(/^\r?\n\r?\n/, "").replace(/\r?\n--\s*$/, "");
      candidates.push({ type, text: decodeTransfer(body, headers.match(/content-transfer-encoding:\s*([^\r\n]+)/i)?.[1] || "") });
    }
    if (!candidates.length) throw new Error("This email has no readable text or HTML receipt. Copy the receipt body and paste it instead.");
    return (candidates.find(part => part.type === "text/html") || candidates[0]).text;
  }

  function toText(source) {
    const body = emailBody(String(source));
    if (!/<(?:html|body|table|div|p|br|span|td)\b/i.test(body)) return body;
    // Strip resource-bearing tags before parsing so receipt images never load.
    const safe = body.replace(/<(script|style|iframe|object|svg)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "").replace(/<(?:img|link|meta|base|source|embed|input)\b[^>]*>/gi, "").replace(/<(?:br|hr)\b[^>]*>|<\/(?:p|div|tr|td|th|li|h[1-6]|table)\s*>/gi, "\n");
    const document = new DOMParser().parseFromString(safe, "text/html");
    return document.body.textContent || "";
  }

  function mergeStock(stock, rows, resolveItem, convert, now) {
    const next = { ...stock };
    for (const row of rows) {
      const name = String(row.name || "").trim();
      const quantity = Number(row.quantity);
      if (!name || !Number.isFinite(quantity) || quantity <= 0 || quantity > 1000000) throw new Error("Every selected item needs a name and an amount greater than zero.");
      const item = resolveItem(name);
      const key = item?.key || "";
      const canonicalName = item?.name || name;
      const id = key || `custom|${canonicalName.toLowerCase()}`;
      const previous = next[id];
      const amount = previous ? convert(quantity, row.unit, previous.unit) : quantity;
      if (amount === null || !Number.isFinite(amount)) throw new Error(`${canonicalName} is already tracked in ${previous?.unit}. Change the receipt amount and unit to match before adding it.`);
      next[id] = { id, key, name: canonicalName, quantity: Math.round(((previous?.quantity || 0) + amount) * 10000) / 10000, unit: previous?.unit || row.unit, note: previous?.note || "Walmart receipt", updatedAt: now };
    }
    return next;
  }

  const api = { parse, toText, emailBody, mergeStock };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.WalmartReceipt = api;
})(globalThis);

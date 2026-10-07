const test = require("node:test");
const assert = require("node:assert/strict");
const receipt = require("../receipt-import.js");

test("extracts quantities and excludes totals and email boilerplate", () => {
  const rows = receipt.parse(`Walmart
Order # 1234567890123
Great Value Milk, 1 gal
Qty 2
$6.00
Bananas
Qty 6
$1.80
Subtotal $7.80
Tax $0.30
Driver tip $2.00
Total $10.10
Visa ending in 1234
View order`);
  assert.deepEqual(rows.map(row => [row.name, row.quantity]), [["Great Value Milk, 1 gal", 2], ["Bananas", 6]]);
});

test("handles inline items without consuming the next product's quantity", () => {
  const rows = receipt.parse("Rice, 32 oz Qty: 2 $3.98\nEggs, 18 count Qty: 1 $4.00\n2 x Yogurt $6.00");
  assert.deepEqual(rows.map(row => [row.name, row.quantity]), [["Rice, 32 oz", 2], ["Eggs, 18 count", 1], ["Yogurt", 2]]);
});

test("unavailable items remain unchecked and later received items are included", () => {
  const rows = receipt.parse("Out of stock items (1)\nBread\nQty 1\n$2.00\nDelivered items (1)\nButter\nQty 1\n$3.00\nMilk\nQty 1\nCancelled\n$4.00");
  assert.deepEqual(rows.map(row => [row.name, row.selected]), [["Bread", false], ["Butter", true], ["Milk", false]]);
});

test("missing quantities are marked for review; package sizes are not purchase counts", () => {
  const rows = receipt.parse("Eggs, 18 count\n$4.00\nRice, 32 oz\nQuantity\n2\n$3.00");
  assert.equal(rows[0].quantity, 1);
  assert.match(rows[0].warning, /assumed/);
  assert.equal(rows[1].quantity, 2);
  assert.equal(rows[1].unit, "package");
  assert.equal(receipt.parse("Rice\nQty 1\n$3.00")[0].warning, "");
  assert.equal(receipt.parse("Thank you for your order\n123 Main Street\nTotal $5.00").length, 0);
});

test("section headings without item counts do not consume the preceding item", () => {
  const rows = receipt.parse("Rice\nQty 1\n$3.00\nOut of stock items\nBread\nQty 1\n$2.00\nReceived items\nMilk\nQty 1\n$4.00");
  assert.deepEqual(rows.map(row => [row.name, row.selected]), [["Rice", true], ["Bread", false], ["Milk", true]]);
});

test("decodes multipart quoted-printable and base64 emails without attachments", () => {
  const email = `MIME-Version: 1.0
Content-Type: multipart/alternative; boundary="receipt-boundary"

--receipt-boundary
Content-Type: text/plain; charset=UTF-8
Content-Transfer-Encoding: quoted-printable

Rice\nQty 2\n=243.00
--receipt-boundary
Content-Type: text/html; charset=UTF-8
Content-Transfer-Encoding: base64

${Buffer.from("<p>Rice</p><p>Qty 2</p><p>$3.00</p>").toString("base64")}
--receipt-boundary--`;
  assert.equal(receipt.emailBody(email).trim(), "<p>Rice</p><p>Qty 2</p><p>$3.00</p>");
  assert.equal(receipt.emailBody("Content-Type: text/plain\nContent-Transfer-Encoding: quoted-printable\n\nCaf=C3=A9 Rice\nQty 2\n=243.00"), "Café Rice\nQty 2\n$3.00");
  assert.throws(() => receipt.emailBody("MIME-Version: 1.0\nContent-Type: application/pdf\n\nnot a receipt"), /no readable/);
  const nested = `MIME-Version: 1.0\nContent-Type: multipart/mixed; boundary="outer"\n\n--outer\n${email}\n--outer\nContent-Type: text/plain\nContent-Disposition: attachment; filename="unrelated.txt"\n\nNot a receipt\n--outer--`;
  assert.equal(receipt.emailBody(nested).trim(), "<p>Rice</p><p>Qty 2</p><p>$3.00</p>");
});

const convert = (amount, from, to) => from === to ? amount : from === "kg" && to === "g" ? amount * 1000 : null;
const resolve = name => name.toLowerCase() === "rice" ? { key: "rice", name: "Rice" } : null;

test("restocks catalog and custom items, converts compatible units, and preserves notes", () => {
  const stock = { rice: { id: "rice", key: "rice", name: "Rice", quantity: 200, unit: "g", note: "Pantry" } };
  const next = receipt.mergeStock(stock, [
    { name: "rice", quantity: 1, unit: "kg" },
    { name: "Apples", quantity: 2, unit: "package" },
    { name: "apples", quantity: 1, unit: "package" }
  ], resolve, convert, "2026-10-07T12:00:00Z");
  assert.equal(next.rice.quantity, 1200);
  assert.equal(next.rice.note, "Pantry");
  assert.equal(next["custom|apples"].quantity, 3);
  assert.equal(stock.rice.quantity, 200);
});

test("rejects incompatible units and invalid amounts without partly changing stock", () => {
  const stock = { rice: { id: "rice", key: "rice", name: "Rice", quantity: 200, unit: "g" } };
  assert.throws(() => receipt.mergeStock(stock, [{ name: "Apples", quantity: 2, unit: "package" }, { name: "Rice", quantity: 1, unit: "package" }], resolve, convert, "now"), /already tracked in g/);
  assert.equal(Object.keys(stock).length, 1);
  for (const amount of [0, -1, NaN, Infinity, 1000001]) {
    assert.throws(() => receipt.mergeStock({}, [{ name: "Rice", quantity: amount, unit: "g" }], resolve, convert, "now"));
  }
});

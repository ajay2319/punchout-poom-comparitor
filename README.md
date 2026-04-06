
# cXML Comparator (React)

Upload **Template XML** (e.g., `aramark_shop.xml`), **Customer specific XML** (e.g., `customer_specific.xml`) and **Shop JSON** (`shop.json`).

The app compares **after the `<Header>`** section and shows:

- Missing **ItemDetail** children (from the template).
- Missing **Extrinsic** fields (from the template) per item.
- **Catch Weights** & UOM mismatches between `shop.json` and `customer_specific.xml` (e.g., JSON `uom` is `LB` while XML `UnitOfMeasure` is `CS`).

It can also generate an **updated `customer_specific.xml`** with missing nodes inserted (empty values), ready to download.

## Run locally
```bash
npm install
npm run dev
```

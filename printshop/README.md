# 🖨️ PrintShop — Static Website System

A complete, **zero-ongoing-cost** website system for print service businesses.

---

## 📁 File Structure

```
printshop/
├── admin/
│   └── index.html        ← Open in browser to manage products
├── build.js              ← Run to generate static website
├── data.json             ← Your product catalogue (export from admin)
└── dist/                 ← Generated static site (deploy this)
    ├── index.html
    ├── services.html
    ├── contact.html
    ├── 404.html
    ├── category/
    │   └── *.html
    └── product/
        └── *.html
```

---

## 🚀 Quick Start

### Step 1: Manage your catalogue
1. Open `admin/index.html` in any browser (double-click it)
2. Set your **Business Info** (name, phone, WhatsApp, address)
3. Add **Categories** (e.g. Business Cards, Banners)
4. Add **Products** with variants and pricing tiers
5. Click **Export data.json** → save it as `data.json` next to `build.js`

### Step 2: Build the website
```bash
node build.js
```
This generates the `dist/` folder with your complete static website.

### Step 3: Deploy (free options)
| Platform | How |
|----------|-----|
| **Netlify** | Go to netlify.com/drop → drag & drop the `dist/` folder |
| **GitHub Pages** | Push `dist/` contents to your gh-pages branch |
| **Vercel** | `vercel dist/` |
| **Any web host** | Upload `dist/` folder contents via FTP |

---

## 🎨 Admin Panel Features

- **Business Info** — Name, tagline, phone, WhatsApp, email, address, social links
- **Categories** — Create top-level and sub-categories with icons
- **Products** — Add products with:
  - Image URLs (Unsplash, your CDN, etc.)
  - Description, turnaround time, minimum order
  - Featured flag (shows on homepage)
- **Variants** — Any number of variant groups (Paper Type, Size, Color, etc.)
  - Each variant has multiple options
- **Pricing Matrix** — Auto-generated for every combination
  - Multiple quantity tiers per combination (bulk discount pricing)
  - e.g. 1–499 units: ₹6/unit, 500–699: ₹5/unit, 700+: ₹4/unit
- **Import/Export** — data.json download and upload

---

## 💰 Pricing System

For each product, pricing is set per variant combination + quantity tier:

```
Variant 1 (Paper): Matte / Glossy / Soft Touch
Variant 2 (Sides): Single / Double

→ Combinations: Matte|Single, Matte|Double, Glossy|Single, ...

For each combination, set tiers:
  - 1–499 units: ₹6.00/unit
  - 500–699 units: ₹5.00/unit  
  - 700+ units: ₹4.00/unit
```

The product page shows:
- Amazon-style variant buttons (click to select)
- Live price update as options/quantity change
- "Order X more to unlock ₹Y/unit" hint
- Pricing reference table (for 1-2 variants)
- Pre-filled WhatsApp message with full order details

---

## 📞 Customer Contact Flow

Customers configure their order → see exact pricing → click:
- **WhatsApp button** → opens WhatsApp with pre-filled order details
- **Send Enquiry** → contact form that sends via WhatsApp

No backend needed. Zero cloud cost.

---

## 🔄 Update Workflow

When you want to update products/prices:
1. Open `admin/index.html` in browser
2. Import your existing `data.json` (or it loads from browser storage)
3. Make changes
4. Export `data.json`
5. Run `node build.js` again
6. Re-deploy `dist/`

---

## 🛠️ Requirements

- **Node.js** (any version ≥ 12) — only needed for the build step
- A modern browser — for the admin panel
- No database, no server, no ongoing costs

---

## 📱 Features of Generated Website

- ✅ Mobile responsive
- ✅ Fast loading (pure HTML/CSS, minimal JS)
- ✅ Floating WhatsApp button on all pages
- ✅ Contact page with WhatsApp-connected form
- ✅ Category & subcategory pages
- ✅ Product pages with live pricing calculator
- ✅ Pricing table view (for ≤2 variant dimensions)
- ✅ Sticky navigation
- ✅ SEO-friendly semantic HTML
- ✅ Beautiful warm print-shop aesthetic

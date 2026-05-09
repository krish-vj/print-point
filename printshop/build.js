#!/usr/bin/env node
/**
 * PrintShop Static Site Builder
 * Run: node build.js
 * Output: dist/ folder — deploy anywhere (Netlify, GitHub Pages, etc.)
 */

const fs = require('fs');
const path = require('path');

// ───── Load Data ─────
const dataPath = path.join(__dirname, 'data.json');
if (!fs.existsSync(dataPath)) {
  console.error('❌ data.json not found. Export it from the Admin panel first.');
  process.exit(1);
}
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const { business, categories, products } = data;

// ───── Setup Output ─────
const distPath = path.join(__dirname, 'dist');
const assetsPath = path.join(distPath, 'assets');
if (fs.existsSync(distPath)) fs.rmSync(distPath, { recursive: true });
fs.mkdirSync(distPath, { recursive: true });
fs.mkdirSync(assetsPath, { recursive: true });

// ───── Helpers ─────
let assetCounter = 0;
function handleImage(src) {
  if (!src) return '';
  if (src.startsWith('data:image')) {
    const ext = src.split(';')[0].split('/')[1] || 'png';
    const filename = `img_${Date.now()}_${assetCounter++}.${ext}`;
    const base64Data = src.split(',')[1];
    fs.writeFileSync(path.join(assetsPath, filename), base64Data, 'base64');
    return `/assets/${filename}`;
  }
  return src;
}

// Process all images in data
business.logo = handleImage(business.logo);
categories.forEach(c => { if (c.imageIcon) c.imageIcon = handleImage(c.imageIcon); });
products.forEach(p => {
  if (p.images) p.images = p.images.map(img => handleImage(img));
});

function resolvePath(base, target) {
  if (!target) return '';
  if (target.startsWith('http')) return target;
  const rel = base === './' ? '' : base;
  return rel + target.replace(/^\//, '');
}

function getIconHTML(cat, rel = './') {
  if (cat.imageIcon) {
    return `<img src="${resolvePath(rel, cat.imageIcon)}" alt="${cat.name}">`;
  }
  return cat.icon || '📁';
}

function getMinPrice(product) {
  const matrix = product.pricingMatrix || {};
  let min = Infinity;
  for (const key of Object.keys(matrix)) {
    const tiers = matrix[key].tiers || [];
    for (const t of tiers) {
      if (t.pricePerUnit && t.pricePerUnit < min) min = t.pricePerUnit;
    }
  }
  return min === Infinity ? null : min;
}

function getProductsByCategory(catId) {
  return products.filter(p => p.categoryId === catId);
}

function getFeaturedProducts() {
  return products.filter(p => p.featured);
}

function getAllCombinations(variants) {
  if (!variants || !variants.length) return [[]];
  const [first, ...rest] = variants;
  const restCombos = getAllCombinations(rest);
  const result = [];
  for (const opt of (first.options || [])) {
    for (const combo of restCombos) result.push([opt, ...combo]);
  }
  return result;
}

// ───── Shared CSS ─────
const sharedCSS = `
@import url('https://fonts.googleapis.com/css2?family=Clash+Display:wght@400;500;600;700&family=Satoshi:wght@300;400;500;700&display=swap');
:root {
  --bg: #f7f4ef;
  --surface: #ffffff;
  --surface2: #f0ebe3;
  --border: #e2d9ce;
  --text: #1a1208;
  --text2: #5a4e3a;
  --text3: #9a8e7a;
  --accent: #c8410a;
  --accent2: #e8650f;
  --accent-light: rgba(200,65,10,0.08);
  --accent-lighter: rgba(200,65,10,0.04);
  --ink: #1a1208;
  --radius: 16px;
  --radius-sm: 10px;
  --shadow: 0 2px 20px rgba(26,18,8,0.08);
  --shadow-lg: 0 8px 48px rgba(26,18,8,0.14);
}
*{box-sizing:border-box;margin:0;padding:0;}
html{scroll-behavior:smooth;}
body{font-family:'Satoshi',sans-serif;background:var(--bg);color:var(--text);line-height:1.6;}
a{color:inherit;text-decoration:none;}
img{max-width:100%;height:auto;}
.container{max-width:1200px;margin:0 auto;padding:0 24px;}

/* Nav */
nav{background:var(--surface);border-bottom:1px solid var(--border);position:sticky;top:0;z-index:100;backdrop-filter:blur(12px);}
.nav-inner{display:flex;align-items:center;justify-content:space-between;height:68px;}
.nav-logo{font-family:'Clash Display',sans-serif;font-size:1.35rem;font-weight:700;color:var(--text);display:flex;align-items:center;gap:10px;}
.nav-logo img{height:32px;width:auto;object-fit:contain;}
.nav-logo span{color:var(--accent);}
.nav-links{display:flex;align-items:center;gap:28px;}
.nav-links a{font-size:0.88rem;font-weight:500;color:var(--text2);transition:color 0.2s;}
.nav-links a:hover{color:var(--accent);}
.nav-cta{background:var(--accent);color:#fff;padding:9px 20px;border-radius:var(--radius-sm);font-size:0.85rem;font-weight:700;transition:background 0.2s;letter-spacing:0.3px;}
.nav-cta:hover{background:var(--accent2);}
.nav-mobile-toggle{display:none;background:none;border:none;cursor:pointer;color:var(--text);font-size:1.4rem;}
.nav-mobile-menu{display:none;flex-direction:column;background:var(--surface);border-top:1px solid var(--border);padding:16px 24px;gap:12px;}
.nav-mobile-menu a{font-size:0.9rem;font-weight:500;color:var(--text2);padding:8px 0;border-bottom:1px solid var(--border);}
.nav-mobile-menu.open{display:flex;}

/* Footer */
footer{background:var(--text);color:rgba(255,255,255,0.7);padding:60px 0 24px;margin-top:80px;}
.footer-grid{display:grid;grid-template-columns:2fr 1fr 1fr;gap:48px;margin-bottom:40px;}
.footer-brand h3{font-family:'Clash Display',sans-serif;font-size:1.3rem;color:#fff;font-weight:700;display:flex;align-items:center;gap:10px;}
.footer-brand h3 img{height:30px;width:auto;}
.footer-brand h3 span{color:var(--accent2);}
.footer-brand p{font-size:0.85rem;margin-top:10px;line-height:1.7;}
.footer-col h4{color:#fff;font-size:0.8rem;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:16px;font-weight:700;}
.footer-col a{display:block;font-size:0.85rem;margin-bottom:8px;transition:color 0.2s;}
.footer-col a:hover{color:#fff;}
.footer-bottom{border-top:1px solid rgba(255,255,255,0.1);padding-top:20px;display:flex;justify-content:space-between;font-size:0.78rem;}
.social-links{display:flex;gap:12px;margin-top:16px;}
.social-links a{width:36px;height:36px;background:rgba(255,255,255,0.1);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:0.9rem;transition:background 0.2s;}
.social-links a:hover{background:var(--accent);}

/* WhatsApp Float */
.wa-float{position:fixed;bottom:28px;right:28px;z-index:999;background:#25d366;color:#fff;width:58px;height:58px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.6rem;box-shadow:0 4px 20px rgba(37,211,102,0.4);transition:transform 0.2s,box-shadow 0.2s;animation:waPulse 3s infinite;}
.wa-float:hover{transform:scale(1.1);box-shadow:0 6px 28px rgba(37,211,102,0.5);}
@keyframes waPulse{0%,100%{box-shadow:0 4px 20px rgba(37,211,102,0.4);}50%{box-shadow:0 4px 28px rgba(37,211,102,0.7),0 0 0 8px rgba(37,211,102,0.1);}}

/* Buttons */
.btn{display:inline-flex;align-items:center;gap:8px;padding:12px 24px;border-radius:var(--radius-sm);font-weight:700;font-size:0.88rem;border:none;cursor:pointer;transition:all 0.2s;letter-spacing:0.3px;}
.btn-primary{background:var(--accent);color:#fff;}
.btn-primary:hover{background:var(--accent2);transform:translateY(-1px);}
.btn-outline{background:transparent;color:var(--accent);border:2px solid var(--accent);}
.btn-outline:hover{background:var(--accent);color:#fff;}
.btn-wa{background:#25d366;color:#fff;}
.btn-wa:hover{background:#20c05a;}
.btn-lg{padding:15px 32px;font-size:0.95rem;}

/* Page Hero */
.page-hero{background:var(--text);color:#fff;padding:60px 0;margin-bottom:48px;}
.page-hero h1{font-family:'Clash Display',sans-serif;font-size:2.8rem;font-weight:700;margin-bottom:12px;display:flex;align-items:center;gap:16px;flex-wrap:wrap;}
.page-hero h1 img{max-height:80px;width:auto;border-radius:var(--radius-sm);object-fit:contain;}
.page-hero p{color:rgba(255,255,255,0.6);font-size:1rem;}
.breadcrumb{display:flex;align-items:center;gap:8px;font-size:0.8rem;color:rgba(255,255,255,0.4);margin-bottom:14px;}
.breadcrumb a{color:rgba(255,255,255,0.5);transition:color 0.2s;}
.breadcrumb a:hover{color:#fff;}
.breadcrumb span{color:rgba(255,255,255,0.2);}

/* Cards */
.product-card-link{display:block;border-radius:var(--radius);background:var(--surface);border:1px solid var(--border);overflow:hidden;transition:all 0.2s;box-shadow:var(--shadow);}
.product-card-link:hover{transform:translateY(-4px);box-shadow:var(--shadow-lg);border-color:var(--accent);}
.product-card-img{width:100%;height:200px;object-fit:cover;background:var(--surface2);display:flex;align-items:center;justify-content:center;font-size:2.5rem;}
.product-card-img img{width:100%;height:100%;object-fit:cover;}
.product-card-body{padding:18px;}
.product-card-cat{font-size:0.72rem;text-transform:uppercase;letter-spacing:1px;color:var(--accent);font-weight:700;margin-bottom:6px;display:flex;align-items:center;gap:6px;}
.product-card-cat img{height:16px;width:auto;object-fit:contain;}
.product-card-name{font-family:'Clash Display',sans-serif;font-size:1.05rem;font-weight:600;margin-bottom:6px;}
.product-card-desc{font-size:0.82rem;color:var(--text2);line-height:1.5;margin-bottom:12px;}
.product-card-meta{display:flex;align-items:center;justify-content:space-between;}
.price-from{font-size:0.78rem;color:var(--text3);}
.price-val{font-family:'Clash Display',sans-serif;font-size:1.1rem;font-weight:700;color:var(--accent);}
.tag-turnaround{font-size:0.72rem;background:var(--accent-light);color:var(--accent);padding:3px 10px;border-radius:99px;font-weight:600;}

/* Section headings */
.section-head{margin-bottom:36px;}
.section-head h2{font-family:'Clash Display',sans-serif;font-size:2rem;font-weight:700;margin-bottom:8px;}
.section-head p{color:var(--text2);font-size:0.95rem;}
.section-badge{display:inline-flex;align-items:center;gap:8px;font-size:0.72rem;text-transform:uppercase;letter-spacing:2px;color:var(--accent);font-weight:700;margin-bottom:10px;background:var(--accent-light);padding:4px 12px;border-radius:99px;}
.section-badge img{height:14px;width:auto;object-fit:contain;}

/* Category Header Banner */
.cat-header-banner{display:flex;align-items:center;gap:32px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:24px 32px;margin-bottom:40px;min-height:120px;transition:all 0.3s ease;}
.cat-header-banner:hover{border-color:var(--accent);box-shadow:var(--shadow);}
.cat-header-img{width:80px;height:80px;display:flex;align-items:center;justify-content:center;font-size:3.5rem;flex-shrink:0;}
.cat-header-img img{max-width:100%;max-height:100%;object-fit:contain;border-radius:var(--radius-sm);}
.cat-header-info{flex:1;}
.cat-header-name{font-family:'Clash Display',sans-serif;font-size:1.8rem;font-weight:700;color:var(--text);line-height:1.2;margin-bottom:4px;}
.cat-header-desc{font-size:0.95rem;color:var(--text2);line-height:1.5;}

/* Grid */
.products-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:24px;}
.categories-row{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px;margin-bottom:48px;}
.cat-pill{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);padding:18px 20px;display:flex;align-items:center;gap:14px;transition:all 0.2s;cursor:pointer;}
.cat-pill:hover{border-color:var(--accent);background:var(--accent-lighter);}
.cat-pill .icon{font-size:1.6rem;display:flex;align-items:center;justify-content:center;width:32px;}
.cat-pill .icon img{max-height:32px;max-width:32px;object-fit:contain;}
.cat-pill .name{font-family:'Clash Display',sans-serif;font-weight:600;font-size:0.92rem;}
.cat-pill .count{font-size:0.75rem;color:var(--text3);}

/* Hero Stack */
.hero-stack-wrap{position:relative;height:450px;width:100%;max-width:500px;margin:0 auto;}
.hero-stack{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;}
.hero-slide{position:absolute;width:100%;height:100%;border-radius:var(--radius);overflow:hidden;box-shadow:var(--shadow-lg);transition:all 0.8s cubic-bezier(0.4, 0, 0.2, 1);opacity:0;transform:scale(0.8) translateY(40px) rotate(-5deg);background:var(--surface2);}
.hero-slide img{width:100%;height:100%;object-fit:cover;}
.hero-slide.active{opacity:1;transform:scale(1) translateY(0) rotate(0deg);z-index:10;}
.hero-slide.prev{opacity:0.4;transform:scale(0.9) translateY(-20px) rotate(3deg);z-index:5;}

.hero-caption-wrap{position:absolute;top:20px;right:20px;z-index:20;pointer-events:none;}
.hero-caption{font-family:'Clash Display',sans-serif;font-size:0.9rem;font-weight:700;color:#fff;background:var(--accent);padding:6px 14px;border-radius:99px;box-shadow:var(--shadow);opacity:0;transform:translateX(20px);transition:all 0.6s ease;white-space:nowrap;}
.hero-caption.active{opacity:1;transform:translateX(0);}

/* Misc */
.empty-state{text-align:center;padding:80px 20px;color:var(--text3);}
.empty-state .icon{font-size:3rem;margin-bottom:12px;}
.divider{border:none;border-top:1px solid var(--border);margin:32px 0;}

@media(max-width:768px){ 
  .hero-stack-wrap{height:300px;} 
  .footer-grid{grid-template-columns:1fr;}
  .nav-links{display:none;}
  .nav-mobile-toggle{display:block;}
  .page-hero h1{font-size:1.9rem;gap:12px;}
  .page-hero h1 img{max-height:60px;}
  .categories-row{grid-template-columns:1fr;}
  .cat-header-banner{gap:20px;padding:20px;min-height:100px;flex-direction:row;text-align:left;}
  .cat-header-img{width:60px;height:60px;font-size:2.5rem;}
  .cat-header-name{font-size:1.4rem;}
  .cat-header-desc{font-size:0.85rem;}
}
@media(max-width:600px){
  .hero-stack-side{display:none;}
  section > .container > div { grid-template-columns: 1fr !important; }
  .cat-header-banner{gap:16px;padding:16px;min-height:auto;}
  .cat-header-img{width:50px;height:50px;font-size:2rem;}
  .cat-header-name{font-size:1.2rem;}
}
`;

// ───── Shared Nav/Footer HTML ─────
function navHTML(active = '', rel = './') {
  const topCats = categories.filter(c => !c.parentId).slice(0, 5);
  const logoContent = business.logo 
    ? `<img src="${resolvePath(rel, business.logo)}" alt="${business.name}">`
    : `${business.name?.split(' ')[0] || 'Print'}<span>${business.name?.split(' ').slice(1).join(' ') || 'Shop'}</span>`;

  return `
<nav>
  <div class="container">
    <div class="nav-inner">
      <a href="${resolvePath(rel, 'index.html')}" class="nav-logo">${logoContent}</a>
      <div class="nav-links">
        <a href="${resolvePath(rel, 'index.html')}" ${active === 'home' ? 'style="color:var(--accent)"' : ''}>Home</a>
        <a href="${resolvePath(rel, 'services.html')}" ${active === 'services' ? 'style="color:var(--accent)"' : ''}>Services</a>
        ${topCats.slice(0, 3).map(c => `<a href="${resolvePath(rel, `category/${c.slug}.html`)}" ${active === c.slug ? 'style="color:var(--accent)"' : ''}>${c.name}</a>`).join('')}
        <a href="${resolvePath(rel, 'contact.html')}" ${active === 'contact' ? 'style="color:var(--accent)"' : ''}>Contact</a>
        <a href="https://wa.me/${business.whatsapp}" target="_blank" class="nav-cta btn-wa">💬 WhatsApp</a>
      </div>
      <button class="nav-mobile-toggle" onclick="document.querySelector('.nav-mobile-menu').classList.toggle('open')">☰</button>
    </div>
  </div>
  <div class="nav-mobile-menu">
    <a href="${resolvePath(rel, 'index.html')}">Home</a>
    <a href="${resolvePath(rel, 'services.html')}">All Services</a>
    ${topCats.map(c => `<a href="${resolvePath(rel, `category/${c.slug}.html`)}">${c.icon || ''} ${c.name}</a>`).join('')}
    <a href="${resolvePath(rel, 'contact.html')}">Contact Us</a>
    <a href="https://wa.me/${business.whatsapp}" target="_blank" style="color:#25d366;font-weight:700;">💬 Order on WhatsApp</a>
  </div>
</nav>
<a class="wa-float" href="https://wa.me/${business.whatsapp}" target="_blank" title="Chat on WhatsApp">
  <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
</a>`;
}

function footerHTML(rel = './') {
  const topCats = categories.filter(c => !c.parentId);
  const logoContent = business.logo 
    ? `<img src="${resolvePath(rel, business.logo)}" alt="${business.name}">`
    : `${business.name?.split(' ')[0] || 'Print'}<span> ${business.name?.split(' ').slice(1).join(' ') || 'Shop'}</span>`;

  return `
<footer>
  <div class="container">
    <div class="footer-grid">
      <div class="footer-brand">
        <h3>${logoContent}</h3>
        <p>${business.tagline || ''}</p>
        <p style="margin-top:8px;">${business.address || ''}</p>
        <div class="social-links">
          ${business.socialLinks?.instagram ? `<a href="${business.socialLinks.instagram}" target="_blank">📷</a>` : ''}
          ${business.socialLinks?.facebook ? `<a href="${business.socialLinks.facebook}" target="_blank">📘</a>` : ''}
          <a href="https://wa.me/${business.whatsapp}" target="_blank">💬</a>
        </div>
      </div>
      <div class="footer-col">
        <h4>Categories</h4>
        ${topCats.map(c => `<a href="${resolvePath(rel, `category/${c.slug}.html`)}">${c.name}</a>`).join('')}
        <a href="${resolvePath(rel, 'services.html')}">All Services →</a>
      </div>
      <div class="footer-col">
        <h4>Quick Links</h4>
        <a href="${resolvePath(rel, 'index.html')}">Home</a>
        <a href="${resolvePath(rel, 'services.html')}">Services</a>
        <a href="${resolvePath(rel, 'contact.html')}">Contact Us</a>
        ${business.whatsapp ? `<a href="https://wa.me/${business.whatsapp}" target="_blank">WhatsApp Us</a>` : ''}
      </div>
    </div>
    <div class="footer-bottom">
      <span>© ${new Date().getFullYear()} ${business.name}. All rights reserved.</span>
      <span>${business.phone || ''}</span>
    </div>
  </div>
</footer>`;
}

function pageWrapper(title, content, active = '', extraCSS = '', extraJS = '', rel = './') {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title} — ${business.name}</title>
<meta name="description" content="${business.tagline || business.name}">
<style>${sharedCSS}${extraCSS}</style>
</head>
<body>
${navHTML(active, rel)}
${content}
${footerHTML(rel)}
${extraJS ? `<script>${extraJS}</script>` : ''}
</body>
</html>`;
}

// ───── HOME PAGE ─────
function buildHomePage() {
  const featuredProds = getFeaturedProducts();
  const topCats = categories.filter(c => !c.parentId);
  const rel = './';
  const slides = business.heroSlides || [];

  const stackHTML = slides.length ? `
    <div class="hero-stack-wrap">
      <div class="hero-stack">
        ${slides.map((s, i) => `<div class="hero-slide ${i === 0 ? 'active' : ''}" data-index="${i}"><img src="${s.image}" alt=""></div>`).join('')}
      </div>
      <div class="hero-caption-wrap">
        ${slides.map((s, i) => `<div class="hero-caption ${i === 0 ? 'active' : ''}" data-index="${i}">${s.caption}</div>`).join('')}
      </div>
    </div>
    <script>
      (function(){
        const slides = document.querySelectorAll('.hero-slide');
        const caps = document.querySelectorAll('.hero-caption');
        let current = 0;
        if(slides.length <= 1) return;
        setInterval(() => {
          slides[current].classList.remove('active');
          slides[current].classList.add('prev');
          caps[current].classList.remove('active');
          current = (current + 1) % slides.length;
          slides[current].classList.remove('prev');
          slides[current].classList.add('active');
          caps[current].classList.add('active');
          setTimeout(() => {
            document.querySelectorAll('.hero-slide').forEach((s, i) => {
              if(i !== current) s.classList.remove('prev');
            });
          }, 800);
        }, 3500);
      })();
    </script>
  ` : '';

  const heroSection = `
<section style="background:var(--text);color:#fff;padding:100px 0 120px;position:relative;overflow:hidden;">
  <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 70% 50%, rgba(200,65,10,0.15) 0%, transparent 60%);"></div>
  <div class="container" style="position:relative;">
    <div style="display:grid;grid-template-columns:${slides.length ? '1.2fr 1fr' : '1fr'};gap:64px;align-items:center;">
      <div style="max-width:640px;">
        <div class="nav-logo" style="font-size:1.8rem;margin-bottom:24px;display:inline-flex;">${business.name}</div>
        <div class="section-badge" style="background:rgba(200,65,10,0.2);color:var(--accent2);display:block;width:fit-content;">Professional Print Services</div>
        <h1 style="font-family:'Clash Display',sans-serif;font-size:3.4rem;font-weight:700;line-height:1.15;margin-bottom:20px;margin-top:12px;">${business.tagline || business.name}</h1>
        <p style="color:rgba(255,255,255,0.65);font-size:1.05rem;line-height:1.7;margin-bottom:32px;">${business.address ? 'Based in ' + business.address.split(',').pop().trim() + '.' : ''} Premium quality print products delivered fast. Configure your order, get instant pricing, contact us to order.</p>
        <div style="display:flex;gap:14px;flex-wrap:wrap;">
          <a href="${resolvePath(rel, 'services.html')}" class="btn btn-primary btn-lg">Browse Services</a>
          <a href="https://wa.me/${business.whatsapp}" target="_blank" class="btn btn-wa btn-lg">💬 Order on WhatsApp</a>
        </div>
      </div>
      <div class="hero-stack-side">
        ${stackHTML}
      </div>
    </div>
  </div>
</section>`;

  const catsSection = topCats.length ? `
<section style="padding:64px 0 0;">
  <div class="container">
    <div class="section-head">
      <div class="section-badge">Browse by Category</div>
      <h2>What We Print</h2>
      <p>From business cards to large format banners — we print it all.</p>
    </div>
    <div class="categories-row">
      ${topCats.map(cat => {
        const count = products.filter(p => p.categoryId === cat.id).length;
        return `<a href="${resolvePath(rel, `category/${cat.slug}.html`)}" class="cat-pill">
          <span class="icon">${getIconHTML(cat, rel)}</span>
          <div><div class="name">${cat.name}</div><div class="count">${count} product${count !== 1 ? 's' : ''}</div></div>
        </a>`;
      }).join('')}
    </div>
  </div>
</section>` : '';

  const featuredSection = featuredProds.length ? `
<section style="padding:48px 0 80px;">
  <div class="container">
    <div class="section-head">
      <div class="section-badge">Most Popular</div>
      <h2>Featured Products</h2>
      <p>Our most ordered print products — configure and price in seconds.</p>
    </div>
    <div class="products-grid">
      ${featuredProds.map(prod => productCardHTML(prod, rel)).join('')}
    </div>
    <div style="text-align:center;margin-top:36px;">
      <a href="${resolvePath(rel, 'services.html')}" class="btn btn-outline">View All Services →</a>
    </div>
  </div>
</section>` : '';

  const whyUsSection = `
<section style="background:var(--surface);border-top:1px solid var(--border);border-bottom:1px solid var(--border);padding:64px 0;">
  <div class="container">
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:36px;text-align:center;">
      ${[
        ['🎨', 'High-Quality Print', 'Vibrant colors, sharp details on every job'],
        ['⚡', 'Fast Turnaround', 'Most orders ready in 1-3 business days'],
        ['💰', 'Transparent Pricing', 'No surprises — see exact prices before ordering'],
        ['📦', 'Bulk Discounts', 'More you print, more you save per unit'],
      ].map(([icon, title, desc]) => `<div>
        <div style="font-size:2.2rem;margin-bottom:12px;">${icon}</div>
        <div style="font-family:'Clash Display',sans-serif;font-size:1rem;font-weight:700;margin-bottom:6px;">${title}</div>
        <div style="font-size:0.85rem;color:var(--text2);">${desc}</div>
      </div>`).join('')}
    </div>
  </div>
</section>`;

  const ctaSection = `
<section style="padding:80px 0;">
  <div class="container" style="text-align:center;">
    <h2 style="font-family:'Clash Display',sans-serif;font-size:2.2rem;font-weight:700;margin-bottom:14px;">Ready to Print?</h2>
    <p style="color:var(--text2);font-size:1rem;margin-bottom:28px;">Browse our services, configure your order, and reach out on WhatsApp to place your order in minutes.</p>
    <div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap;">
      <a href="${resolvePath(rel, 'services.html')}" class="btn btn-primary btn-lg">Browse All Services</a>
      <a href="${resolvePath(rel, 'contact.html')}" class="btn btn-outline btn-lg">Contact Us</a>
    </div>
  </div>
</section>`;

  const content = heroSection + catsSection + featuredSection + whyUsSection + ctaSection;
  fs.writeFileSync(path.join(distPath, 'index.html'), pageWrapper(business.name, content, 'home', '', '', rel));
  console.log('  ✓ index.html');
}

function productCardHTML(prod, rel = './') {
  const cat = categories.find(c => c.id === prod.categoryId);
  const minPrice = getMinPrice(prod);
  const thumb = prod.images?.[0];
  const thumbSrc = thumb ? (thumb.startsWith('http') ? thumb : resolvePath(rel, thumb)) : '';

  return `<a href="${resolvePath(rel, `product/${prod.slug}.html`)}" class="product-card-link">
    <div class="product-card-img">
      ${thumb ? `<img src="${thumbSrc}" alt="${prod.name}" loading="lazy">` : prod.name[0]}
    </div>
    <div class="product-card-body">
      ${cat ? `<div class="product-card-cat">${getIconHTML(cat, rel)} ${cat.name}</div>` : ''}
      <div class="product-card-name">${prod.name}</div>
      <div class="product-card-desc">${(prod.description || '').substring(0, 90)}${(prod.description?.length || 0) > 90 ? '...' : ''}</div>
      <div class="product-card-meta">
        <div>
          ${minPrice !== null ? `<div class="price-from">From</div><div class="price-val">₹${minPrice.toFixed(2)}/unit</div>` : '<div class="price-val">See Pricing</div>'}
        </div>
        ${prod.turnaround ? `<div class="tag-turnaround">⏱ ${prod.turnaround}</div>` : ''}
      </div>
    </div>
  </a>`;
}

// ───── SERVICES PAGE ─────
function buildServicesPage() {
  const topCats = categories.filter(c => !c.parentId);
  const rel = './';

  const hero = `<div class="page-hero"><div class="container">
    <div class="breadcrumb"><a href="${resolvePath(rel, 'index.html')}">Home</a><span>›</span>Services</div>
    <h1>All Services</h1>
    <p>Browse our complete range of print services — with transparent pricing for every option.</p>
  </div></div>`;

  let body = '';

  if (!topCats.length && !products.length) {
    body = '<div class="container"><div class="empty-state"><div class="icon">📦</div><p>No products added yet.</p></div></div>';
  } else if (!topCats.length) {
    body = `<div class="container"><div class="products-grid">${products.map(p => productCardHTML(p, rel)).join('')}</div></div>`;
  } else {
    // By category
    body = topCats.map(cat => {
      const subCats = categories.filter(c => c.parentId === cat.id);
      const directProds = getProductsByCategory(cat.id);
      const allCatProds = [...directProds];
      subCats.forEach(sub => allCatProds.push(...getProductsByCategory(sub.id)));
      if (!allCatProds.length) return '';
      
      return `<section style="padding:48px 0;">
        <div class="container">
          <div class="cat-header-banner">
            <div class="cat-header-img">${getIconHTML(cat, rel)}</div>
            <div class="cat-header-info">
              <div class="cat-header-name">${cat.name}</div>
              ${cat.description ? `<div class="cat-header-desc">${cat.description}</div>` : ''}
            </div>
          </div>
          
          ${subCats.length ? subCats.map(sub => {
            const subProds = getProductsByCategory(sub.id);
            if (!subProds.length) return '';
            return `<div style="margin-bottom:48px;">
              <div class="cat-header-banner" style="background:transparent;padding:16px 24px;min-height:auto;gap:20px;margin-bottom:24px;">
                <div class="cat-header-img" style="width:48px;height:48px;font-size:2rem;">${getIconHTML(sub, rel)}</div>
                <div class="cat-header-info">
                  <div class="cat-header-name" style="font-size:1.2rem;">${sub.name}</div>
                  ${sub.description ? `<div class="cat-header-desc" style="font-size:0.85rem;">${sub.description}</div>` : ''}
                </div>
              </div>
              <div class="products-grid">${subProds.map(p => productCardHTML(p, rel)).join('')}</div>
            </div>`;
          }).join('') : ''}
          ${directProds.length ? `<div class="products-grid">${directProds.map(p => productCardHTML(p, rel)).join('')}</div>` : ''}
        </div>
      </section>`;
    }).join('');
  }

  fs.writeFileSync(path.join(distPath, 'services.html'), pageWrapper('All Services', hero + body, 'services', '', '', rel));
  console.log('  ✓ services.html');
}

// ───── CATEGORY PAGES ─────
function buildCategoryPages() {
  const catDir = path.join(distPath, 'category');
  fs.mkdirSync(catDir, { recursive: true });
  const rel = '../';

  categories.forEach(cat => {
    const prods = getProductsByCategory(cat.id);
    const subCats = categories.filter(c => c.parentId === cat.id);
    const parentCat = cat.parentId ? categories.find(c => c.id === cat.parentId) : null;

    const hero = `<div class="page-hero"><div class="container">
      <div class="breadcrumb">
        <a href="${resolvePath(rel, 'index.html')}">Home</a><span>›</span>
        ${parentCat ? `<a href="${resolvePath(rel, `category/${parentCat.slug}.html`)}">${parentCat.name}</a><span>›</span>` : ''}
        <span>${cat.name}</span>
      </div>
      <h1>${getIconHTML(cat, rel)} ${cat.name}</h1>
      ${cat.description ? `<p>${cat.description}</p>` : ''}
    </div></div>`;

    const subSection = subCats.length ? `
    <div class="container" style="margin-bottom:32px;">
      <div class="categories-row">
        ${subCats.map(s => `<a href="${resolvePath(rel, `category/${s.slug}.html`)}" class="cat-pill">
          <span class="icon">${getIconHTML(s, rel)}</span>
          <div><div class="name">${s.name}</div><div class="count">${getProductsByCategory(s.id).length} products</div></div>
        </a>`).join('')}
      </div>
    </div>` : '';

    const prodSection = prods.length ? `
    <div class="container" style="padding-bottom:64px;">
      <div class="products-grid">${prods.map(p => productCardHTML(p, rel)).join('')}</div>
    </div>` : (subCats.length ? '' : '<div class="container"><div class="empty-state"><div class="icon">📦</div><p>No products in this category yet.</p></div></div>');

    fs.writeFileSync(path.join(catDir, cat.slug + '.html'), pageWrapper(cat.name, hero + subSection + prodSection, cat.slug, '', '', rel));
    console.log(`  ✓ category/${cat.slug}.html`);
  });
}

// ───── PRODUCT PAGES ─────
function buildProductPages() {
  const prodDir = path.join(distPath, 'product');
  fs.mkdirSync(prodDir, { recursive: true });
  const rel = '../';

  products.forEach(prod => {
    const cat = categories.find(c => c.id === prod.categoryId);
    const combos = getAllCombinations(prod.variants || []);
    const matrixJSON = JSON.stringify(prod.pricingMatrix || {});
    const variantsJSON = JSON.stringify(prod.variants || []);
    const minQty = prod.minOrderQty || 1;

    // Gallery Images
    const galleryImages = (prod.images || []).map(img => img.startsWith('http') ? img : resolvePath(rel, img));

    // Build pricing table data for display (when ≤ 2 variants)
    let pricingTableHTML = '';
    const varCount = (prod.variants || []).length;
    if (varCount === 0) {
      // No variants — flat pricing
      const flatKey = Object.keys(prod.pricingMatrix || {})[0];
      if (flatKey) {
        const tiers = prod.pricingMatrix[flatKey].tiers || [];
        pricingTableHTML = `<div style="overflow-x:auto;"><table class="pricing-tbl">
          <thead><tr><th>Quantity Range</th><th>Price per Unit</th><th>Est. Total (at min of range)</th></tr></thead>
          <tbody>${tiers.map(t => `<tr>
            <td>${t.minQty}${t.maxQty ? ' – ' + t.maxQty : '+'} units</td>
            <td><strong>₹${t.pricePerUnit.toFixed(2)}</strong></td>
            <td>₹${(t.minQty * t.pricePerUnit).toFixed(2)}</td>
          </tr>`).join('')}</tbody>
        </table></div>`;
      }
    } else if (varCount === 1) {
      const v1 = prod.variants[0];
      const allTierCounts = new Set();
      v1.options.forEach(o => {
        const k = o; const tiers = (prod.pricingMatrix?.[k]?.tiers || []);
        tiers.forEach(t => allTierCounts.add(`${t.minQty}-${t.maxQty || '∞'}`));
      });
      // Simple per-option table
      pricingTableHTML = `<div style="overflow-x:auto;"><table class="pricing-tbl">
        <thead><tr><th>${v1.name}</th>${v1.options.map(o => `<th>${o}</th>`).join('')}</tr></thead>
        <tbody>${(() => {
          // Collect all tier labels
          const tierSets = {};
          v1.options.forEach(o => {
            (prod.pricingMatrix?.[o]?.tiers || []).forEach(t => {
              const label = `${t.minQty}${t.maxQty ? '–' + t.maxQty : '+'} units`;
              if (!tierSets[label]) tierSets[label] = {};
              tierSets[label][o] = t.pricePerUnit;
            });
          });
          return Object.entries(tierSets).map(([label, prices]) =>
            `<tr><td><strong>${label}</strong></td>${v1.options.map(o => `<td>₹${(prices[o] || 0).toFixed(2)}</td>`).join('')}</tr>`
          ).join('');
        })()}</tbody>
      </table></div>`;
    } else if (varCount === 2) {
      const v1 = prod.variants[0], v2 = prod.variants[1];
      // Show first tier only in table, dynamic via JS
      pricingTableHTML = `<div id="pricing-table-wrap" style="overflow-x:auto;">
        <p style="font-size:0.8rem;color:var(--text2);margin-bottom:8px;">Showing prices for your current quantity selection (updates live above)</p>
        <table class="pricing-tbl" id="static-price-table">
          <thead><tr><th>${v1.name} \\ ${v2.name}</th>${v2.options.map(o => `<th>${o}</th>`).join('')}</tr></thead>
          <tbody id="price-table-body"></tbody>
        </table>
      </div>`;
    } else {
      pricingTableHTML = `<p style="font-size:0.83rem;color:var(--text2);">Price table is available for up to 2 variant dimensions. Use the configurator above to see exact pricing for each combination.</p>`;
    }

    const productCSS = `
.prod-layout{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:start;padding:48px 0 80px;}
.prod-gallery{position:sticky;top:90px;}
.prod-main-img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:var(--radius);background:var(--surface2);display:flex;align-items:center;justify-content:center;font-size:4rem;overflow:hidden;}
.prod-main-img img{width:100%;height:100%;object-fit:cover;}
.prod-thumbs{display:flex;gap:10px;margin-top:12px;flex-wrap:wrap;}
.prod-thumb{width:70px;height:70px;border-radius:var(--radius-sm);object-fit:cover;cursor:pointer;border:2px solid transparent;transition:border-color 0.2s;background:var(--surface2);overflow:hidden;}
.prod-thumb.active{border-color:var(--accent);}
.prod-thumb img{width:100%;height:100%;object-fit:cover;}
.variant-group{margin-bottom:20px;}
.variant-label{font-size:0.78rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--text2);margin-bottom:10px;}
.variant-options{display:flex;gap:8px;flex-wrap:wrap;}
.variant-btn{padding:8px 18px;border-radius:var(--radius-sm);border:2px solid var(--border);background:var(--surface);font-size:0.85rem;font-weight:600;cursor:pointer;transition:all 0.2s;color:var(--text);}
.variant-btn:hover{border-color:var(--accent);color:var(--accent);}
.variant-btn.selected{border-color:var(--accent);background:var(--accent-light);color:var(--accent);}
.qty-wrap{display:flex;align-items:center;gap:12px;margin-top:6px;}
.qty-btn{width:38px;height:38px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--surface);font-size:1.2rem;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;justify-content:center;}
.qty-btn:hover{border-color:var(--accent);color:var(--accent);}
.qty-input{width:90px;text-align:center;padding:8px 12px;border-radius:var(--radius-sm);border:1px solid var(--border);font-size:1rem;font-weight:600;background:var(--surface);color:var(--text);}
.qty-input:focus{outline:none;border-color:var(--accent);}
.price-display{background:linear-gradient(135deg,var(--text) 0%,#2a2010 100%);color:#fff;border-radius:var(--radius);padding:24px;margin:20px 0;}
.price-per-unit{font-size:0.8rem;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1px;}
.price-big{font-family:'Clash Display',sans-serif;font-size:2.4rem;font-weight:700;color:var(--accent2);line-height:1;}
.price-total{font-size:0.85rem;color:rgba(255,255,255,0.7);margin-top:8px;}
.price-tier-hint{font-size:0.75rem;background:rgba(255,255,255,0.08);border-radius:6px;padding:8px 12px;margin-top:12px;color:rgba(255,255,255,0.55);line-height:1.5;}
.order-btns{display:flex;flex-direction:column;gap:10px;}
.section-divider{border:none;border-top:1px solid var(--border);margin:32px 0;}
.pricing-tbl{width:100%;border-collapse:collapse;font-size:0.83rem;}
.pricing-tbl th{background:var(--text);color:#fff;padding:10px 14px;text-align:left;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.5px;}
.pricing-tbl td{padding:10px 14px;border-bottom:1px solid var(--border);}
.pricing-tbl tr:last-child td{border-bottom:none;}
.pricing-tbl tr:hover td{background:var(--accent-lighter);}
.info-chips{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px;}
.info-chip{display:flex;align-items:center;gap:6px;background:var(--surface2);border:1px solid var(--border);border-radius:99px;padding:5px 14px;font-size:0.78rem;font-weight:500;}
.no-combo-msg{background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:14px 18px;font-size:0.83rem;color:var(--text2);margin:16px 0;}
@media(max-width:768px){.prod-layout{grid-template-columns:1fr;}.prod-gallery{position:static;}}`;

    const waMsg = encodeURIComponent(`Hi! I'd like to order from ${business.name}.\n\nProduct: ${prod.name}\nPlease let me know your availability and confirm my order.`);

    const productJS = `
const variants = ${variantsJSON};
const pricingMatrix = ${matrixJSON};
const minQty = ${minQty};
let selectedOptions = {};
let qty = minQty;

// Init: select first option for each variant
variants.forEach(v => { if (v.options.length) selectedOptions[v.id] = v.options[0]; });
qty = minQty;
document.getElementById('qty-input').value = qty;

function getCurrentKey() {
  return variants.map(v => selectedOptions[v.id] || '').join('|');
}

function getCurrentTiers() {
  const key = getCurrentKey();
  return pricingMatrix[key]?.tiers || [];
}

function getPriceForQty(q) {
  const tiers = getCurrentTiers();
  for (let i = tiers.length - 1; i >= 0; i--) {
    if (q >= tiers[i].minQty) return tiers[i].pricePerUnit;
  }
  return tiers[0]?.pricePerUnit || 0;
}

function getNextTierInfo(q) {
  const tiers = getCurrentTiers();
  for (const t of tiers) {
    if (t.minQty > q) return t;
  }
  return null;
}

function updatePriceDisplay() {
  const price = getPriceForQty(qty);
  const total = price * qty;
  document.getElementById('price-per-unit').textContent = '₹' + price.toFixed(2) + ' / unit';
  document.getElementById('price-total').textContent = 'Total: ₹' + total.toFixed(2) + ' for ' + qty + ' units';
  const next = getNextTierInfo(qty);
  if (next) {
    const saving = ((price - next.pricePerUnit) * qty).toFixed(2);
    document.getElementById('price-tier-hint').textContent = '💡 Order ' + next.minQty + '+ units to get ₹' + next.pricePerUnit.toFixed(2) + '/unit. You save ₹' + saving + ' more!';
    document.getElementById('price-tier-hint').style.display = 'block';
  } else {
    document.getElementById('price-tier-hint').textContent = '🎉 Best rate unlocked!';
    document.getElementById('price-tier-hint').style.display = 'block';
  }
  // update WA link
  const opts = variants.map(v => v.name + ': ' + (selectedOptions[v.id] || '')).join(', ');
  const msg = encodeURIComponent('Hi! I want to order from ${business.name}.\\n\\nProduct: ${prod.name}\\n' + opts + '\\nQuantity: ' + qty + '\\nPrice/unit: ₹' + price.toFixed(2) + '\\nTotal: ₹' + total.toFixed(2) + '\\n\\nPlease confirm availability!');
  document.getElementById('wa-order-btn').href = 'https://wa.me/${business.whatsapp}?text=' + msg;
  ${varCount === 2 ? 'updatePriceTable();' : ''}
}

function selectOption(variantId, option) {
  selectedOptions[variantId] = option;
  document.querySelectorAll('[data-variant="' + variantId + '"]').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.option === option);
  });
  updatePriceDisplay();
}

function changeQty(delta) {
  qty = Math.max(minQty, qty + delta);
  document.getElementById('qty-input').value = qty;
  updatePriceDisplay();
}

document.getElementById('qty-input').addEventListener('input', function() {
  qty = Math.max(minQty, parseInt(this.value) || minQty);
  updatePriceDisplay();
});

${varCount === 2 ? `
function updatePriceTable() {
  const v1 = variants[0], v2 = variants[1];
  const tbody = document.getElementById('price-table-body');
  if (!tbody) return;
  tbody.innerHTML = v1.options.map(o1 => {
    return '<tr>' +
      '<td><strong>' + o1 + (selectedOptions[v1.id] === o1 ? ' ✓' : '') + '</strong></td>' +
      v2.options.map(o2 => {
        const key = o1 + '|' + o2;
        const tiers = pricingMatrix[key]?.tiers || [];
        let p = 0;
        for (let i = tiers.length - 1; i >= 0; i--) { if (qty >= tiers[i].minQty) { p = tiers[i].pricePerUnit; break; } }
        if (!p && tiers[0]) p = tiers[0].pricePerUnit;
        const active = selectedOptions[v1.id] === o1 && selectedOptions[v2.id] === o2;
        return '<td style="' + (active ? 'background:var(--accent-light);font-weight:700;color:var(--accent)' : '') + '">₹' + p.toFixed(2) + '</td>';
      }).join('') +
    '</tr>';
  }).join('');
}` : ''}

// Gallery
const images = ${JSON.stringify(galleryImages)};
let activeImg = 0;
function setImage(i) {
  activeImg = i;
  const main = document.getElementById('main-img');
  if (images[i]) { main.innerHTML = '<img src="' + images[i] + '" alt="">'; }
  document.querySelectorAll('.prod-thumb').forEach((t, ti) => t.classList.toggle('active', ti === i));
}

updatePriceDisplay();
`;

    const mainImg = galleryImages[0]
      ? `<div id="main-img"><img src="${galleryImages[0]}" alt="${prod.name}"></div>`
      : `<div id="main-img" style="display:flex;align-items:center;justify-content:center;font-size:4rem;">${prod.name[0]}</div>`;

    const thumbsHTML = galleryImages.length > 1
      ? `<div class="prod-thumbs">${galleryImages.map((img, i) => `<div class="prod-thumb ${i === 0 ? 'active' : ''}" onclick="setImage(${i})"><img src="${img}" alt=""></div>`).join('')}</div>`
      : '';

    const variantsHTML = (prod.variants || []).map(v => `
      <div class="variant-group">
        <div class="variant-label">${v.name}</div>
        <div class="variant-options">
          ${v.options.map((opt, oi) => `<button class="variant-btn ${oi === 0 ? 'selected' : ''}" data-variant="${v.id}" data-option="${opt}" onclick="selectOption('${v.id}','${opt}')">${opt}</button>`).join('')}
        </div>
      </div>
    `).join('');

    const infoChips = [
      prod.turnaround ? `<div class="info-chip">⏱ ${prod.turnaround}</div>` : '',
      prod.minOrderQty ? `<div class="info-chip">📦 Min. ${prod.minOrderQty} units</div>` : '',
    ].filter(Boolean).join('');

    const hero = `<div class="page-hero"><div class="container">
      <div class="breadcrumb">
        <a href="${resolvePath(rel, 'index.html')}">Home</a><span>›</span>
        ${cat ? `<a href="${resolvePath(rel, `category/${cat.slug}.html`)}">${cat.name}</a><span>›</span>` : ''}
        <span>${prod.name}</span>
      </div>
      <h1>${prod.name}</h1>
    </div></div>`;

    const body = `<div class="container"><div class="prod-layout">
      <div class="prod-gallery">
        <div class="prod-main-img">${mainImg}</div>
        ${thumbsHTML}
      </div>
      <div class="prod-info">
        <div class="info-chips">${infoChips}</div>
        <h1 style="font-family:'Clash Display',sans-serif;font-size:1.8rem;font-weight:700;margin-bottom:10px;">${prod.name}</h1>
        <p style="color:var(--text2);font-size:0.92rem;line-height:1.7;margin-bottom:24px;">${prod.description || ''}</p>
        ${variantsHTML}
        <div class="variant-group">
          <div class="variant-label">Quantity</div>
          <div class="qty-wrap">
            <button class="qty-btn" onclick="changeQty(-${Math.max(1, minQty)}" >−</button>
            <input class="qty-input" type="number" id="qty-input" value="${minQty}" min="${minQty}">
            <button class="qty-btn" onclick="changeQty(${Math.max(1, minQty)})">+</button>
          </div>
          ${minQty > 1 ? `<div style="font-size:0.75rem;color:var(--text3);margin-top:5px;">Minimum order: ${minQty} units</div>` : ''}
        </div>
        <div class="price-display">
          <div class="price-per-unit" id="price-per-unit">₹0.00 / unit</div>
          <div class="price-big" id="price-big" style="display:none"></div>
          <div class="price-total" id="price-total"></div>
          <div class="price-tier-hint" id="price-tier-hint" style="display:none"></div>
        </div>
        <div class="order-btns">
          <a href="https://wa.me/${business.whatsapp}?text=${waMsg}" id="wa-order-btn" target="_blank" class="btn btn-wa btn-lg">💬 Order on WhatsApp</a>
          <a href="${resolvePath(rel, 'contact.html')}" class="btn btn-outline btn-lg">📧 Send Enquiry</a>
        </div>
      </div>
    </div>

    ${pricingTableHTML ? `<hr class="section-divider">
    <h3 style="font-family:'Clash Display',sans-serif;margin-bottom:16px;">Pricing Reference Table</h3>
    <p style="font-size:0.83rem;color:var(--text2);margin-bottom:16px;">Prices shown are per unit (₹). Bulk discounts apply automatically.</p>
    ${pricingTableHTML}` : ''}

    </div>`;

    fs.writeFileSync(path.join(prodDir, prod.slug + '.html'), pageWrapper(prod.name, hero + body, '', productCSS, productJS, rel));
    console.log(`  ✓ product/${prod.slug}.html`);
  });
}

// ───── CONTACT PAGE ─────
function buildContactPage() {
  const rel = './';
  const hero = `<div class="page-hero"><div class="container">
    <div class="breadcrumb"><a href="${resolvePath(rel, 'index.html')}">Home</a><span>›</span>Contact</div>
    <h1>Contact Us</h1>
    <p>Get in touch to place orders, ask questions, or request custom quotes.</p>
  </div></div>`;

  const contactCSS = `
.contact-grid{display:grid;grid-template-columns:1fr 1fr;gap:48px;padding:48px 0 80px;align-items:start;}
.contact-info{display:flex;flex-direction:column;gap:20px;}
.contact-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:24px;display:flex;gap:18px;align-items:flex-start;}
.contact-icon{font-size:1.8rem;flex-shrink:0;}
.contact-label{font-size:0.75rem;text-transform:uppercase;letter-spacing:1px;color:var(--text3);font-weight:700;margin-bottom:4px;}
.contact-val{font-size:0.95rem;font-weight:600;}
.contact-val a{color:var(--accent);}
.contact-form{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:32px;}
.form-group{margin-bottom:18px;}
.form-label{display:block;font-size:0.8rem;font-weight:700;color:var(--text2);margin-bottom:7px;text-transform:uppercase;letter-spacing:0.5px;}
.form-control{width:100%;padding:12px 16px;background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text);font-size:0.88rem;font-family:'Satoshi',sans-serif;transition:border-color 0.2s;}
.form-control:focus{outline:none;border-color:var(--accent);}
textarea.form-control{resize:vertical;min-height:110px;}
@media(max-width:768px){.contact-grid{grid-template-columns:1fr;}}`;

  const contactJS = `
document.getElementById('contact-form').addEventListener('submit', function(e) {
  e.preventDefault();
  const name = document.getElementById('cf-name').value.trim();
  const phone = document.getElementById('cf-phone').value.trim();
  const msg = document.getElementById('cf-msg').value.trim();
  const waText = encodeURIComponent('Hi ${business.name}!\\n\\nName: ' + name + '\\nPhone: ' + phone + '\\n\\nMessage: ' + msg);
  window.open('https://wa.me/${business.whatsapp}?text=' + waText, '_blank');
});`;

  const body = `<div class="container">
  <div class="contact-grid">
    <div class="contact-info">
      ${business.phone ? `<div class="contact-card"><div class="contact-icon">📞</div><div><div class="contact-label">Phone</div><div class="contact-val"><a href="tel:${business.phone}">${business.phone}</a></div></div></div>` : ''}
      ${business.whatsapp ? `<div class="contact-card"><div class="contact-icon">💬</div><div><div class="contact-label">WhatsApp</div><div class="contact-val"><a href="https://wa.me/${business.whatsapp}" target="_blank">Chat on WhatsApp</a></div><div style="font-size:0.8rem;color:var(--text3);margin-top:4px;">Fastest way to reach us!</div></div></div>` : ''}
      ${business.email ? `<div class="contact-card"><div class="contact-icon">📧</div><div><div class="contact-label">Email</div><div class="contact-val"><a href="mailto:${business.email}">${business.email}</a></div></div></div>` : ''}
      ${business.address ? `<div class="contact-card"><div class="contact-icon">📍</div><div><div class="contact-label">Address</div><div class="contact-val">${business.address}</div></div></div>` : ''}
    </div>
    <div class="contact-form">
      <h2 style="font-family:'Clash Display',sans-serif;font-size:1.5rem;margin-bottom:6px;">Send an Enquiry</h2>
      <p style="color:var(--text2);font-size:0.85rem;margin-bottom:24px;">Fill in this form and we'll connect you via WhatsApp instantly.</p>
      <form id="contact-form">
        <div class="form-group"><label class="form-label" for="cf-name">Your Name</label><input class="form-control" id="cf-name" placeholder="Ramesh Kumar" required></div>
        <div class="form-group"><label class="form-label" for="cf-phone">Phone Number</label><input class="form-control" id="biz-phone" placeholder="+91 98765 43210" required></div>
        <div class="form-group"><label class="form-label" for="cf-product">Product / Service</label><input class="form-control" id="cf-product" placeholder="e.g. Business Cards, 500 qty"></div>
        <div class="form-group"><label class="form-label" for="cf-msg">Message</label><textarea class="form-control" id="cf-msg" placeholder="Tell us what you need..." required></textarea></div>
        <button type="submit" class="btn btn-wa btn-lg" style="width:100%;">💬 Send via WhatsApp</button>
      </form>
    </div>
  </div>
</div>`;

  fs.writeFileSync(path.join(distPath, 'contact.html'), pageWrapper('Contact Us', hero + body, 'contact', contactCSS, contactJS, rel));
  console.log('  ✓ contact.html');
}

// ───── 404 PAGE ─────
function build404() {
  const rel = './';
  const body = `<div style="text-align:center;padding:120px 24px;">
    <div style="font-size:5rem;margin-bottom:20px;">🔍</div>
    <h1 style="font-family:'Clash Display',sans-serif;font-size:2.5rem;margin-bottom:12px;">Page Not Found</h1>
    <p style="color:var(--text2);margin-bottom:28px;">The page you're looking for doesn't exist.</p>
    <a href="${resolvePath(rel, 'index.html')}" class="btn btn-primary btn-lg">← Go Home</a>
  </div>`;
  fs.writeFileSync(path.join(distPath, '404.html'), pageWrapper('404 Not Found', body, '', '', '', rel));
  console.log('  ✓ 404.html');
}

// ───── RUN ─────
console.log('\n🖨️  PrintShop Static Builder\n');
console.log('📁 Reading data.json...');
console.log(`  Business: ${business.name}`);
console.log(`  Categories: ${categories.length}`);
console.log(`  Products: ${products.length}\n`);
console.log('🔨 Building pages...');

buildHomePage();
buildServicesPage();
buildCategoryPages();
buildProductPages();
buildContactPage();
build404();

// Copy data.json to dist for reference
fs.writeFileSync(path.join(distPath, 'data.json'), JSON.stringify(data, null, 2));

console.log('\n✅ Build complete!');
console.log(`📂 Output: ${distPath}`);
console.log(`\n🚀 Deploy the /dist folder to:`);
console.log('   • Netlify: drag & drop dist/ at netlify.com/drop');
console.log('   • GitHub Pages: push dist/ to gh-pages branch');
console.log('   • Any static host: upload dist/ contents\n');

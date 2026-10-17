/**
 * PACKAGE CATALOG: the single source of truth for packages, details and add-ons.
 *
 * The website loads this from /api/packages to build the "Details & customize"
 * window and the add-on choices on the booking page, and the server uses it to
 * check bookings and calculate the estimated total (so prices can't be tampered with).
 *
 * To change prices or details, edit this file only. The starting prices on the
 * home page cards (public/index.html) and in the booking dropdown (public/book.html)
 * are plain text, so update those numbers too if you change a base price.
 *
 * Add-on fields:
 *   id      unique, lowercase, no spaces
 *   name    shown to clients
 *   price   USD
 *   unit    optional label for quantity add-ons, e.g. "per extra page"
 *   maxQty  optional: lets the client pick a quantity (1..maxQty)
 */
const SERVICES = [
  {
    id: 'starter-website',
    name: 'Landing Page / Starter Website',
    usd: 150,
    tagline: 'Best for local shops, food businesses & portfolios',
    description: 'A single, beautiful page that tells customers who you are, what you offer, and how to reach you. Perfect for getting online fast.',
    timeline: 'About 1 week',
    included: [
      '1-page custom design (intro, about, services or menu, gallery, contact)',
      'Mobile-friendly, responsive layout',
      'Click-to-call, WhatsApp, Viber and Messenger buttons',
      'Google Maps location and business hours',
      'Basic SEO: page title, description and social media preview',
      'Free SSL (https) setup on your hosting',
      '1 round of revisions',
      '7 days of support after launch',
    ],
    needFromYou: [
      'Your logo (or we can use your business name)',
      'Photos of your products, food or shop',
      'A short description, contact details and opening hours',
    ],
    addons: [
      { id: 'extra-section', name: 'Extra section (testimonials, FAQ, team, etc.)', price: 30, unit: 'per section', maxQty: 5 },
      { id: 'contact-form', name: 'Contact form that emails you', price: 25 },
      { id: 'copywriting', name: 'We write the text for you', price: 40 },
      { id: 'logo-design', name: 'Simple logo design', price: 60 },
      { id: 'domain-hosting', name: 'Domain & hosting setup help (yearly fees paid separately)', price: 30 },
      { id: 'rush', name: 'Rush delivery (3–4 days)', price: 50 },
    ],
  },
  {
    id: 'business-website',
    name: 'Full Business Website',
    usd: 350,
    popular: true,
    tagline: 'Best for growing businesses that want to look professional',
    description: 'A complete multi-page website that builds trust, explains your services in detail, and turns visitors into inquiries.',
    timeline: 'About 2–3 weeks',
    included: [
      'Up to 5 pages: Home, About, Services, Contact, Gallery',
      'Custom design that matches your brand',
      'Mobile-responsive on phones, tablets and computers',
      'Contact / inquiry form sent straight to your email',
      'Basic SEO: page titles, descriptions, sitemap and Google Search Console',
      'Google Maps, social media links and WhatsApp button',
      'Speed optimization and free SSL (https)',
      '2 rounds of revisions',
      'Short video guide on how to update your site',
      '14 days of support after launch',
    ],
    needFromYou: [
      'Your logo and brand colors (if you have them)',
      'Photos for each page',
      'Text about your business and services (or add copywriting)',
    ],
    addons: [
      { id: 'extra-page', name: 'Extra page', price: 40, unit: 'per page', maxQty: 10 },
      { id: 'blog', name: 'Blog / news section you can update yourself', price: 80 },
      { id: 'booking-system', name: 'Online booking / appointment system', price: 120 },
      { id: 'copywriting', name: 'Professional copywriting for all pages', price: 80 },
      { id: 'logo-design', name: 'Simple logo design', price: 60 },
      { id: 'second-language', name: 'Second language version', price: 100 },
      { id: 'analytics', name: 'Google Analytics & conversion tracking', price: 30 },
      { id: 'rush', name: 'Rush delivery (about 1 week)', price: 100 },
    ],
  },
  {
    id: 'ecommerce',
    name: 'E-Commerce / Online Store',
    usd: 800,
    tagline: 'Best for businesses that want to sell online 24/7',
    description: 'A full online store where customers can browse products, add them to a cart, pay online and get order updates automatically.',
    timeline: 'About 4–6 weeks',
    included: [
      'Store pages: home, shop, product, cart and checkout',
      'Up to 30 products uploaded with photos, prices and variants (size, color)',
      'Shopping cart and secure checkout',
      'Online payment setup (e.g. PayPal, Stripe or a local payment gateway)',
      'Order notification emails for you and your customers',
      'Shipping and tax settings',
      'Inventory / stock tracking',
      'Mobile-friendly design',
      'Basic SEO for products and categories',
      '2 rounds of revisions plus training on managing orders',
      '30 days of support after launch',
    ],
    needFromYou: [
      'Product list with names, prices, sizes/colors and descriptions',
      'Product photos',
      'Your shipping areas and rates, and your payment account (e.g. PayPal)',
    ],
    addons: [
      { id: 'extra-products', name: 'Extra products uploaded', price: 40, unit: 'per 20 products', maxQty: 10 },
      { id: 'photo-cleanup', name: 'Product photo background cleanup (up to 30 photos)', price: 50 },
      { id: 'discount-codes', name: 'Discount codes and promos', price: 40 },
      { id: 'customer-accounts', name: 'Customer accounts & order history', price: 80 },
      { id: 'social-shop', name: 'Facebook & Instagram Shop integration', price: 80 },
      { id: 'multi-currency', name: 'Multiple currencies', price: 60 },
      { id: 'rush', name: 'Rush delivery (about 2–3 weeks)', price: 200 },
    ],
  },
  {
    id: 'maintenance',
    name: 'Website Maintenance & Fixes',
    usd: 30,
    tagline: 'Best if you already have a website that needs help',
    description: 'Quick, affordable help for a website you already have. Priced per request, so you only pay for what you need.',
    timeline: 'Usually within 1–3 days',
    included: [
      'Website check-up and diagnosis of the problem',
      'Fix for 1 small issue (broken link, layout bug, form not sending)',
      'Up to 3 small content or image updates',
      'Backup before any changes',
      'A short report of what was done',
    ],
    needFromYou: [
      'Your website address',
      'Login access to your website or hosting',
      'A short description of what needs fixing or changing',
    ],
    addons: [
      { id: 'extra-fix', name: 'Additional fix or change', price: 20, unit: 'per fix', maxQty: 10 },
      { id: 'new-feature', name: 'New feature (WhatsApp button, form, gallery, etc.)', price: 50, unit: 'per feature', maxQty: 5 },
      { id: 'speed', name: 'Speed optimization (faster loading)', price: 60 },
      { id: 'security', name: 'Malware / security cleanup', price: 80 },
      { id: 'backup-setup', name: 'Automatic backup setup', price: 25 },
      { id: 'priority', name: 'Same-day priority', price: 25 },
    ],
  },
  { id: 'not-sure', name: 'Not sure yet, please recommend one', addons: [] },
];

const SERVICE_BY_ID = Object.fromEntries(SERVICES.map((s) => [s.id, s]));

/** "Starts at US$350", or '' when the package has no price. */
function priceLabel(serviceId) {
  const s = SERVICE_BY_ID[serviceId];
  if (!s || s.usd == null) return '';
  return `Starts at US$${s.usd.toLocaleString('en-US')}`;
}

const usd = (n) => `US$${Number(n).toLocaleString('en-US')}`;

/**
 * Validates add-ons chosen by the client and calculates the estimate on the server.
 * `input` is an array like [{ id: 'extra-page', qty: 2 }, { id: 'blog' }].
 * Returns { ok, error, addons: [{ id, name, qty, price, subtotal }], estimate }.
 */
function priceSelection(serviceId, input) {
  const svc = SERVICE_BY_ID[serviceId];
  if (!svc) return { ok: false, error: 'Unknown package.' };
  const list = Array.isArray(input) ? input : [];
  if (list.length > 20) return { ok: false, error: 'Too many add-ons.' };
  const seen = new Set();
  const addons = [];
  for (const item of list) {
    const id = item && typeof item.id === 'string' ? item.id : '';
    const def = (svc.addons || []).find((a) => a.id === id);
    if (!def) return { ok: false, error: 'One of the selected add-ons is not available for this package.' };
    if (seen.has(id)) continue;
    seen.add(id);
    const max = def.maxQty || 1;
    const qty = Math.min(Math.max(parseInt(item.qty, 10) || 1, 1), max);
    addons.push({ id, name: def.name, qty, price: def.price, subtotal: def.price * qty });
  }
  const base = svc.usd || 0;
  const estimate = svc.usd == null ? null : base + addons.reduce((sum, a) => sum + a.subtotal, 0);
  return { ok: true, addons, estimate };
}

/** "Extra page ×2 (US$80); Blog (US$80)" or "None". */
function addonsSummary(addons) {
  if (!addons || !addons.length) return 'None';
  return addons.map((a) => `${a.name}${a.qty > 1 ? ` ×${a.qty}` : ''} (${usd(a.subtotal)})`).join('; ');
}

module.exports = { SERVICES, SERVICE_BY_ID, priceLabel, priceSelection, addonsSummary, usd };

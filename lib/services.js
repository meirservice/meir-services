// Single source of truth for the services the booking form accepts.
// If you add/rename a service, update the <select> in public/index.html too
// (the option value must match `id`).
const SERVICES = [
  { id: 'web-design', name: 'Custom Web Design & UI/UX Prototyping' },
  { id: 'full-stack', name: 'Full-Stack Website & Web App Development' },
  { id: 'ecommerce', name: 'E-Commerce Store Development & Integration' },
  { id: 'redesign-maintenance', name: 'Website Redesign, Maintenance & Performance Optimization' },
  { id: 'seo-analytics', name: 'Search Engine Optimization (SEO) & Analytics Setup' },
  { id: 'api-integrations', name: 'API Development & Third-Party Integrations' },
  { id: 'not-sure', name: 'Not sure yet, help me decide' },
];

const SERVICE_BY_ID = Object.fromEntries(SERVICES.map((s) => [s.id, s]));

module.exports = { SERVICES, SERVICE_BY_ID };

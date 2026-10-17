// Vercel entry point: every /api/* request is rewritten here (see vercel.json)
// and handled by the same Express app used locally and on Render.
// Static files in /public are served directly by Vercel's CDN.
module.exports = require('../server');

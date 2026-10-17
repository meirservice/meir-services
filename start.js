// Startup file for cPanel "Setup Node.js App" (Phusion Passenger).
// In cPanel, set "Application startup file" to: start.js
const app = require('./server');
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Meir site running on port ${port}`));

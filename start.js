// Startup file for cPanel "Setup Node.js App" (Phusion Passenger)
const app = require('./server');
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Meir site running on port ${port}`));

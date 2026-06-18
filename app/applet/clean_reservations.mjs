import fs from 'fs';
const content = fs.readFileSync('src/pages/Reservations.tsx', 'utf-8');
const index = content.indexOf('      {/* Slide drawer for making new reservation */}');
if (index === -1) process.exit(1);
const newContent = content.substring(0, index) + `      {/* New Booking Wizard */}\n      {showDrawer && (\n        <NewBookingWizard onClose={() => setShowDrawer(false)} />\n      )}\n    </div>\n  );\n}\n`;
fs.writeFileSync('src/pages/Reservations.tsx', newContent);

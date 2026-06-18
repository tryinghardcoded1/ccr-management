import fs from 'fs';
const content = fs.readFileSync('./src/pages/Reservations.tsx', 'utf-8');
const index = content.indexOf('{/* Slide drawer for making new reservation */}');
const newContent = content.substring(0, index) + `{showDrawer && (\n        <NewBookingWizard onClose={() => setShowDrawer(false)} />\n      )}\n    </div>\n  );\n}`;
fs.writeFileSync('./src/pages/Reservations.tsx', newContent);

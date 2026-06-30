import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, writeBatch } from 'firebase/firestore';
import config from './firebase-applet-config.json';

const app = initializeApp(config);
const db = getFirestore(app);

const collections = [
  'reservations', 'payments', 'customers', 'vehicles', 'securityDeposits',
  'chargeItems', 'claims', 'fines', 'externalCharges', 'contracts',
  'generatedContracts', 'users', 'chargeTemplates', 'archivedCustomers',
  'archivedVehicles', 'archivedReservations', 'archivedChargeTemplates'
];

async function wipe() {
  for (const colName of collections) {
    console.log(`Wiping ${colName}...`);
    try {
      const colRef = collection(db, colName);
      const snapshot = await getDocs(colRef);
      const batch = writeBatch(db);
      snapshot.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      console.log(`Wiped ${colName}`);
    } catch (e) {
      console.error(`Failed to wipe ${colName}:`, e);
    }
  }
}

wipe().then(() => console.log('Done')).catch(console.error);

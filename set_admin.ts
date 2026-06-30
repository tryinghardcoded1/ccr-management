
import { db } from './src/lib/firebase';
import { collection, query, where, getDocs, updateDoc } from 'firebase/firestore';

async function setAdmin() {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('email', '==', 'cerezvincent24@gmail.com'));
  const querySnapshot = await getDocs(q);
  
  if (!querySnapshot.empty) {
    const userDoc = querySnapshot.docs[0];
    await updateDoc(userDoc.ref, { role: 'admin' });
    console.log('User role updated to admin');
  } else {
    console.log('User not found');
  }
}

setAdmin();

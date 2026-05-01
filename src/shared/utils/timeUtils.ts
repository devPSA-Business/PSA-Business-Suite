import { doc, getDocFromServer, setDoc, serverTimestamp } from 'firebase/firestore';
import { firestoreDb, isConfigValid } from '../api/firebase';

let timeOffset = 0;

export async function syncTimeOffset(): Promise<void> {
  if (!navigator.onLine || !isConfigValid) return;
  
  try {
    const timestampRef = doc(firestoreDb, 'serverInfo', 'timestamp');
    const t0 = Date.now();
    await setDoc(timestampRef, {
      time: serverTimestamp()
    }, { merge: true });
    
    const snap = await getDocFromServer(timestampRef);
    const t1 = Date.now();
    
    if (snap.exists()) {
      const serverTime = snap.data().time?.toMillis();
      if (serverTime) {
        const latency = (t1 - t0) / 2;
        const currentLocalEstimated = Date.now() - latency;
        timeOffset = serverTime - currentLocalEstimated;
        
        const offsetMinutes = Math.abs(timeOffset) / (60 * 1000);
        if (offsetMinutes > 5) {
          console.warn(`Time drift detected: ${offsetMinutes.toFixed(2)} minutes off from server.`);
        }
      }
    }
  } catch (error) {
    console.warn('Failed to sync time offset:', error);
  }
}

export function getCurrentTime(): number {
  return Date.now() + timeOffset;
}

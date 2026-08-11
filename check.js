import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "demo-key",
  authDomain: "demo-project.firebaseapp.com",
  projectId: "food-drop-294fa",
  storageBucket: "demo-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const q = collection(db, 'attendance_logs');
  const snap = await getDocs(q);
  console.log("Total logs:", snap.docs.length);
  snap.docs.forEach(d => {
    const data = d.data();
    if (data.overtimeMinutes) {
      console.log("Log with overtime:", data.time, data.type, data.overtimeMinutes, data.overtimePay, data.shiftName);
    }
  });
  process.exit(0);
}
run();

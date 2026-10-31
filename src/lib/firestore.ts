// ═══════════════════════════════════════════════════════════════════════
//  Firebase Admin SDK — เชื่อมต่อ Firestore จาก Vercel
//  ใช้ Service Account JSON (เก็บใน env var FIREBASE_SERVICE_ACCOUNT)
// ═══════════════════════════════════════════════════════════════════════

import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// ─── อ่าน Service Account จาก env var ──────────────────────────────
// ต้องสร้างใน Firebase Console → Project Settings → Service Accounts
//   → Generate new private key → ดาวน์โหลด JSON
//   → คัดลอกเนื้อหา JSON ทั้งหมด ไปใส่ใน Vercel env var: FIREBASE_SERVICE_ACCOUNT
const serviceAccount = JSON.parse(
  process.env.FIREBASE_SERVICE_ACCOUNT || '{}'
);

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

export const db = getFirestore();

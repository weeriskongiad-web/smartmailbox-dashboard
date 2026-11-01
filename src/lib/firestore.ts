// ═══════════════════════════════════════════════════════════════════════
//  Firebase Admin SDK — เชื่อมต่อ Firestore จาก Vercel
// ═══════════════════════════════════════════════════════════════════════

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// ─── อ่าน Service Account จาก env var ──────────────────────────────
// วิธีสร้าง:
//   1. Firebase Console → Project Settings → Service Accounts
//   2. Generate new private key → ดาวน์โหลด JSON
//   3. คัดลอกเนื้อหา JSON ทั้งหมด
//   4. ไป Vercel → Settings → Environment Variables
//   5. เพิ่ม: FIREBASE_SERVICE_ACCOUNT = (วาง JSON ทั้งหมด)
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT || "{}";

let dbInstance: ReturnType<typeof getFirestore> | null = null;

if (!getApps().length) {
  try {
    const serviceAccount = JSON.parse(serviceAccountJson);
    if (serviceAccount.project_id) {
      initializeApp({
        credential: cert(serviceAccount),
      });
      dbInstance = getFirestore();
      console.log("[FIRESTORE] Initialized successfully");
    } else {
      console.warn("[FIRESTORE] No project_id in service account");
    }
  } catch (error) {
    console.error("[FIRESTORE] Init failed:", error);
  }
} else {
  dbInstance = getFirestore();
}

export const db = dbInstance;

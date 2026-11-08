// ═══════════════════════════════════════════════════════════════════════
//  GET /api/events — ดึงข้อมูลล่าสุด (แบบง่าย ไม่ต้องสร้าง index)
// ═══════════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { db } from "@/lib/firestore";

export async function GET() {
  if (!db) {
    return NextResponse.json(
      { error: "Firestore not connected" },
      { status: 500 }
    );
  }

  try {
    // ─── 1. ดึงสถานะตู้ปัจจุบัน ─────────────────────────────────────────
    let status = null;
    try {
      const statusDoc = await db.collection("mailbox_status").doc("current").get();
      status = statusDoc.exists ? statusDoc.data() : null;
    } catch (e) {
      console.log("[EVENTS] No status doc yet");
    }

    // ─── 2. ดึง mail events ล่าสุด 10 รายการ (ไม่ filter เพื่อหลีกเลี่ยง index) ─
    let mailEvents: any[] = [];
    try {
      const mailSnapshot = await db.collection("mail_events")
        .orderBy("timestamp", "desc")
        .limit(10)
        .get();
      mailEvents = mailSnapshot.docs.map((doc: any) => {
        const data = doc.data();
        return {
          id: doc.id,
          timestamp: data.timestamp?.toDate?.()?.toISOString() || new Date().toISOString(),
          type: data.type || "metadata",
          weight: data.weight,
          battery: data.battery,
          capture_index: data.capture_index,
          image_url: data.image_url,
        };
      });
    } catch (e) {
      console.error("[EVENTS] mail_events query error:", e);
    }

    // ─── 3. ดึง GPS logs ล่าสุด 5 รายการ ──────────────────────────────────
    let gpsLogs: any[] = [];
    try {
      const gpsSnapshot = await db.collection("gps_logs")
        .orderBy("timestamp", "desc")
        .limit(5)
        .get();
      gpsLogs = gpsSnapshot.docs.map((doc: any) => {
        const data = doc.data();
        return {
          id: doc.id,
          lat: data.lat,
          lon: data.lon,
          satellites: data.satellites,
          hdop: data.hdop,
          battery: data.battery,
          timestamp: data.timestamp?.toDate?.()?.toISOString() || new Date().toISOString(),
        };
      });
    } catch (e) {
      console.error("[EVENTS] gps_logs query error:", e);
    }

    // ─── 4. ดึง alerts ล่าสุด 5 รายการ ──────────────────────────────────
    let alerts: any[] = [];
    try {
      const alertsSnapshot = await db.collection("alerts")
        .orderBy("timestamp", "desc")
        .limit(5)
        .get();
      alerts = alertsSnapshot.docs.map((doc: any) => {
        const data = doc.data();
        return {
          id: doc.id,
          type: data.type,
          message: data.message,
          timestamp: data.timestamp?.toDate?.()?.toISOString() || new Date().toISOString(),
        };
      });
    } catch (e) {
      console.error("[EVENTS] alerts query error:", e);
    }

    // ─── 5. นับซองวันนี้ (แบบง่าย — นับจาก mail_events ทั้งหมดที่มี image_url) ─
    let todayMailCount = 0;
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const allMailSnapshot = await db.collection("mail_events")
        .orderBy("timestamp", "desc")
        .limit(50)
        .get();
      todayMailCount = allMailSnapshot.docs.filter((doc: any) => {
        const data = doc.data();
        const ts = data.timestamp?.toDate?.() || new Date(0);
        return ts >= today && data.image_url;
      }).length;
    } catch (e) {
      console.error("[EVENTS] count error:", e);
    }

    return NextResponse.json({
      status,
      mail_events: mailEvents,
      gps_logs: gpsLogs,
      today_mail_count: todayMailCount,
      alerts,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[GET /api/events] Error:", error);
    return NextResponse.json(
      { error: "Failed", message: String(error) },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  GET /api/events — ดึงข้อมูลล่าสุดสำหรับ Dashboard
// ═══════════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { db } from "@/lib/firestore";

export async function GET() {
  if (!db) {
    return NextResponse.json(
      { error: "Firestore not connected. Set FIREBASE_SERVICE_ACCOUNT env var." },
      { status: 500 }
    );
  }

  try {
    // ─── ดึงสถานะตู้ปัจจุบัน ─────────────────────────────────────────────
    const statusDoc = await db.collection("mailbox_status").doc("current").get();
    const status = statusDoc.exists ? statusDoc.data() : null;

    // ─── ดึง mail events ล่าสุด 10 รายการ ──────────────────────────────────
    const mailSnapshot = await db.collection("mail_events")
      .orderBy("timestamp", "desc")
      .limit(10)
      .get();

    const mailEvents = mailSnapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        timestamp: data.timestamp?.toDate?.()?.toISOString() || data.timestamp,
        type: data.type || "metadata",
        weight: data.weight,
        battery: data.battery,
        capture_index: data.capture_index,
        image_url: data.image_url,
      };
    });

    // ─── ดึง GPS logs ล่าสุด 5 รายการ ──────────────────────────────────────
    const gpsSnapshot = await db.collection("gps_logs")
      .orderBy("timestamp", "desc")
      .limit(5)
      .get();

    const gpsLogs = gpsSnapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        lat: data.lat,
        lon: data.lon,
        satellites: data.satellites,
        hdop: data.hdop,
        battery: data.battery,
        timestamp: data.timestamp?.toDate?.()?.toISOString() || data.timestamp,
      };
    });

    // ─── นับจำนวนซองวันนี้ ─────────────────────────────────────────────
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMailSnapshot = await db.collection("mail_events")
      .where("type", "==", "image")
      .where("timestamp", ">=", today)
      .get();
    const todayMailCount = todayMailSnapshot.size;

    // ─── ดึง alerts ล่าสุด 5 รายการ ──────────────────────────────────────
    const alertsSnapshot = await db.collection("alerts")
      .orderBy("timestamp", "desc")
      .limit(5)
      .get();

    const alerts = alertsSnapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        type: data.type,
        message: data.message,
        timestamp: data.timestamp?.toDate?.()?.toISOString() || data.timestamp,
      };
    });

    return NextResponse.json({
      status: status,
      mail_events: mailEvents,
      gps_logs: gpsLogs,
      today_mail_count: todayMailCount,
      alerts: alerts,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[GET /api/events] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch events", message: String(error) },
      { status: 500 }
    );
  }
}

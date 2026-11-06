// ═══════════════════════════════════════════════════════════════════════
//  Smart Mailbox API Route — รับข้อมูลจาก ESP32 + บันทึกลง Firestore
// ═══════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import axios from "axios";
import { db } from "@/lib/firestore";

// ─── Cloudinary ──────────────────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const LINE_TOKEN = process.env.LINE_TOKEN || "";
const LINE_USER_ID = process.env.LINE_USER_ID || "";
const TG_TOKEN = process.env.TELEGRAM_TOKEN || "";
const TG_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";

const ESP32_AUTH_TOKEN = "Bearer mailbox_secret_token_v1";

// ═══════════════════════════════════════════════════════════════════════
//  POST handler
// ═══════════════════════════════════════════════════════════════════════
export async function POST(request: NextRequest) {
  const auth = request.headers.get("authorization") || "";
  if (auth !== ESP32_AUTH_TOKEN) {
    console.warn("[AUTH] Unauthorized:", auth);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") || "";
  const url = new URL(request.url);
  const type = url.searchParams.get("type") || "";

  try {
    // ─── กรณี 1: อัปโหลดภาพ JPEG ─────────────────────────────────────────
    if (contentType.includes("image/jpeg")) {
      const captureIndex = parseInt(url.searchParams.get("capture") || "1");
      const weight = url.searchParams.get("weight") || "?";
      const buffer = Buffer.from(await request.arrayBuffer());
      const result = await handleImageUpload(buffer, captureIndex, weight);
      return NextResponse.json({ success: true, ...result });
    }

    // ─── กรณี 2: ส่งข้อมูล JSON ───────────────────────────────────────────
    const data = await request.json();
    const eventType = type || data.type;

    if (eventType === "GPS_UPDATE") {
      await handleGPSUpdate(data);
    } else if (eventType === "DOOR_OPENED") {
      await handleAlert("DOOR_OPENED", data.message || "");
    } else if (eventType === "GPS_NO_FIX") {
      await handleAlert("GPS_NO_FIX", data.message || "");
    } else if (eventType === "LOW_BATTERY") {
      await handleAlert("LOW_BATTERY", data.message || "");
    } else if (eventType === "MAIL_EVENT") {
      await handleMailMetadata(data);
    } else {
      console.log("[API] Unknown type:", eventType);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API Error]", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: String(error) },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  GET handler — health check
// ═══════════════════════════════════════════════════════════════════════
export async function GET() {
  return NextResponse.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    version: "3.0-vercel-firestore",
    firestore_connected: db !== null,
  });
}

// ═══════════════════════════════════════════════════════════════════════
//  HANDLE GPS UPDATE — บันทึกลง Firestore
// ═══════════════════════════════════════════════════════════════════════
async function handleGPSUpdate(data: any) {
  console.log(`[GPS] Lat: ${data.lat}, Lon: ${data.lon}, Sats: ${data.satellites}, Battery: ${data.battery}%`);

  if (db) {
    try {
      // บันทึก log
      await db.collection("gps_logs").add({
        lat: data.lat,
        lon: data.lon,
        satellites: data.satellites || 0,
        hdop: data.hdop || 0,
        battery: data.battery,
        timestamp: new Date(),
      });

      // อัปเดตสถานะตู้ปัจจุบัน
      await db.collection("mailbox_status").doc("current").set({
        last_gps_lat: data.lat,
        last_gps_lon: data.lon,
        last_gps_time: new Date(),
        battery_level: data.battery,
        online: true,
      }, { merge: true });

      console.log("[GPS] Saved to Firestore");
    } catch (err) {
      console.error("[GPS] Firestore error:", err);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  HANDLE MAIL EVENT METADATA — บันทึกลง Firestore
// ═══════════════════════════════════════════════════════════════════════
async function handleMailMetadata(data: any) {
  console.log(`[MAIL] weight=${data.weight}g, battery=${data.battery}%`);

  if (db) {
    try {
      await db.collection("mail_events").add({
        weight: data.weight,
        battery: data.battery,
        timestamp: new Date(),
        type: "metadata",
      });
      console.log("[MAIL] Saved to Firestore");
    } catch (err) {
      console.error("[MAIL] Firestore error:", err);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  HANDLE IMAGE UPLOAD — Cloudinary + Firestore + LINE/Telegram
// ═══════════════════════════════════════════════════════════════════════
async function handleImageUpload(buffer: Buffer, captureIndex: number, weight: string) {
  const timestamp = Date.now();

  // ─── อัปโหลดไป Cloudinary ─────────────────────────────────────────
  const result = await new Promise<any>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "smartmailbox/mail_events",
        public_id: `${timestamp}_capture${captureIndex}`,
        resource_type: "image",
        format: "jpg",
        overwrite: false,
        quality: "auto:good",
        fetch_format: "auto",
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    uploadStream.end(buffer);
  });

  console.log(`[IMAGE] Capture #${captureIndex}: ${result.secure_url} (${result.bytes} bytes)`);

  // ─── บันทึก metadata ลง Firestore ─────────────────────────────────────
  if (db) {
    try {
      await db.collection("mail_events").add({
        timestamp: new Date(),
        type: "image",
        capture_index: captureIndex,
        image_url: result.secure_url,
        cloudinary_public_id: result.public_id,
        image_width: result.width,
        image_height: result.height,
        image_bytes: result.bytes,
        weight: weight,
      });
      console.log("[IMAGE] Saved to Firestore");
    } catch (err) {
      console.error("[IMAGE] Firestore error:", err);
    }
  }

  // ─── ส่งภาพไป LINE + Telegram (เฉพาะ capture #2) ───
  if (captureIndex === 1) {
    const text = `📬 มีซองหยอดตู้!\nเวลา: ${new Date().toLocaleString("th-TH")}\nน้ำหนัก: ${weight}g`;

    try {
      await sendToLINE(result.secure_url, text);
      console.log("[NOTIFY] LINE sent");
    } catch (err) {
      console.error("[NOTIFY] LINE failed:", err);
    }

    try {
      await sendToTelegram(result.secure_url, text);
      console.log("[NOTIFY] Telegram sent");
    } catch (err) {
      console.error("[NOTIFY] Telegram failed:", err);
    }
  }

  return {
    image_url: result.secure_url,
    public_id: result.public_id,
    bytes: result.bytes,
  };
}

// ═══════════════════════════════════════════════════════════════════════
//  SEND TO LINE
// ═══════════════════════════════════════════════════════════════════════
async function sendToLINE(imageUrl: string, text: string) {
  if (!LINE_TOKEN || !LINE_USER_ID) {
    console.log("[LINE] Skipped (no token/user_id)");
    return;
  }

  await axios.post(
    "https://api.line.me/v2/bot/message/push",
    {
      to: LINE_USER_ID,
      messages: [
        { type: "text", text },
        {
          type: "image",
          originalContentUrl: imageUrl,
          previewImageUrl: imageUrl,
        },
      ],
    },
    {
      headers: {
        Authorization: `Bearer ${LINE_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  SEND TO TELEGRAM
// ═══════════════════════════════════════════════════════════════════════
async function sendToTelegram(imageUrl: string, text: string) {
  if (!TG_TOKEN || !TG_CHAT_ID) {
    console.log("[TELEGRAM] Skipped (no token/chat_id)");
    return;
  }

  await axios.post(`https://api.telegram.org/bot${TG_TOKEN}/sendPhoto`, {
    chat_id: TG_CHAT_ID,
    photo: imageUrl,
    caption: text,
  });
}

// ═══════════════════════════════════════════════════════════════════════
//  HANDLE ALERT
// ═══════════════════════════════════════════════════════════════════════
async function handleAlert(type: string, message: string) {
  const messages: Record<string, string> = {
    DOOR_OPENED: "⚠ ตู้ถูกเปิด! ตรวจสอบทันที",
    GPS_NO_FIX: "⚠ GPS ไม่สามารถ fix สัญญาณได้",
    LOW_BATTERY: `⚠ แบตเตอรี่ต่ำ: ${message}`,
  };

  const msg = messages[type] || `⚠ Alert: ${type}`;
  console.log(`[ALERT] ${type}: ${msg}`);

  // ─── บันทึก alert ลง Firestore ─────────────────────────────────────
  if (db) {
    try {
      await db.collection("alerts").add({
        type: type,
        message: msg,
        timestamp: new Date(),
      });
      console.log("[ALERT] Saved to Firestore");
    } catch (err) {
      console.error("[ALERT] Firestore error:", err);
    }
  }

  // ─── ส่งไป LINE ──────────────────────────────────────────────────────
  if (LINE_TOKEN && LINE_USER_ID) {
    try {
      await axios.post(
        "https://api.line.me/v2/bot/message/push",
        {
          to: LINE_USER_ID,
          messages: [{ type: "text", text: msg }],
        },
        {
          headers: {
            Authorization: `Bearer ${LINE_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );
    } catch (err) {
      console.error("[LINE] Alert failed:", err);
    }
  }

  // ─── ส่งไป Telegram ──────────────────────────────────────────────────
  if (TG_TOKEN && TG_CHAT_ID) {
    try {
      await axios.post(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
        chat_id: TG_CHAT_ID,
        text: msg,
      });
    } catch (err) {
      console.error("[TELEGRAM] Alert failed:", err);
    }
  }
}

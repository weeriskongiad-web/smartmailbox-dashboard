// ═══════════════════════════════════════════════════════════════════════
//  Smart Mailbox API Route — รับข้อมูลจาก ESP32
//  URL: https://smartmailbox-dashboard.vercel.app/api/receiveEvent
// ═══════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import axios from "axios";

// ─── Cloudinary Configuration ─────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ─── LINE + Telegram ──────────────────────────────────────────────────
const LINE_TOKEN = process.env.LINE_TOKEN || "";
const LINE_USER_ID = process.env.LINE_USER_ID || "";
const TG_TOKEN = process.env.TELEGRAM_TOKEN || "";
const TG_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";

// ─── Auth Token (ต้องตรงกับใน SmartMailbox_Main.ino) ──────────────────
const ESP32_AUTH_TOKEN = "Bearer mailbox_secret_token_v1";

// ═══════════════════════════════════════════════════════════════════════
//  POST handler — รับข้อมูลจาก ESP32
// ═══════════════════════════════════════════════════════════════════════
export async function POST(request: NextRequest) {
  // ─── Auth check ──────────────────────────────────────────────────────
  const auth = request.headers.get("authorization") || "";
  if (auth !== ESP32_AUTH_TOKEN) {
    console.warn("[AUTH] Unauthorized request:", auth);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") || "";
  const url = new URL(request.url);
  const type = url.searchParams.get("type") || "";

  try {
    // ─── กรณี 1: อัปโหลดภาพ JPEG (binary) ────────────────────────────────
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
      console.log(`[MAIL] weight=${data.weight}g, battery=${data.battery}%`);
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
//  GET handler — Health check
// ═══════════════════════════════════════════════════════════════════════
export async function GET() {
  return NextResponse.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    version: "2.0-vercel",
    endpoints: {
      POST_image: "/api/receiveEvent (Content-Type: image/jpeg)",
      POST_json: "/api/receiveEvent?type=GPS_UPDATE|DOOR_OPENED|MAIL_EVENT|...",
      GET: "/api/receiveEvent (health check)",
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════
//  HANDLE GPS UPDATE — บันทึก log (ไม่ใช้ Firestore ตอนนี้)
// ═══════════════════════════════════════════════════════════════════════
async function handleGPSUpdate(data: any) {
  console.log(`[GPS] Lat: ${data.lat}, Lon: ${data.lon}, Sats: ${data.satellites}, Battery: ${data.battery}%`);
  // TODO: เพิ่ม Firestore บันทึกข้อมูลจริง (หลัง build ผ่านแล้ว)
}

// ═══════════════════════════════════════════════════════════════════════
//  HANDLE IMAGE UPLOAD — อัปโหลดไป Cloudinary + ส่งแจ้งเตือน
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

  // ─── ส่งภาพไป LINE + Telegram (เฉพาะ capture #2 ที่เห็นหน้าชัด) ───
  if (captureIndex === 2) {
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

  await axios.post(
    `https://api.telegram.org/bot${TG_TOKEN}/sendPhoto`,
    {
      chat_id: TG_CHAT_ID,
      photo: imageUrl,
      caption: text,
    }
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  HANDLE ALERT (door opened, GPS no fix, low battery)
// ═══════════════════════════════════════════════════════════════════════
async function handleAlert(type: string, message: string) {
  const messages: Record<string, string> = {
    DOOR_OPENED: "⚠ ตู้ถูกเปิด! ตรวจสอบทันที",
    GPS_NO_FIX: "⚠ GPS ไม่สามารถ fix สัญญาณได้",
    LOW_BATTERY: `⚠ แบตเตอรี่ต่ำ: ${message}`,
  };

  const msg = messages[type] || `⚠ Alert: ${type}`;
  console.log(`[ALERT] ${type}: ${msg}`);

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

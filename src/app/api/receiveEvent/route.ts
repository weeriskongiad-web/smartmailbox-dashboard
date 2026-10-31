// ═══════════════════════════════════════════════════════════════════════
//  Smart Mailbox API Route — รับข้อมูลจาก ESP32
//  URL: https://smartmailbox-dashboard.vercel.app/api/receiveEvent
// ═══════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { db } from '@/lib/firestore';
import axios from 'axios';

// ─── Cloudinary Configuration ─────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ─── LINE + Telegram ──────────────────────────────────────────────────
const LINE_TOKEN = process.env.LINE_TOKEN || '';
const LINE_USER_ID = process.env.LINE_USER_ID || '';
const TG_TOKEN = process.env.TELEGRAM_TOKEN || '';
const TG_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';

// ─── Auth Token (ต้องตรงกับใน SmartMailbox_Main.ino) ──────────────────
const ESP32_AUTH_TOKEN = 'Bearer mailbox_secret_token_v1';

// ═══════════════════════════════════════════════════════════════════════
//  POST handler — รับข้อมูลจาก ESP32
// ═══════════════════════════════════════════════════════════════════════
export async function POST(request: NextRequest) {
  // ─── Auth check ──────────────────────────────────────────────────────
  const auth = request.headers.get('authorization') || '';
  if (auth !== ESP32_AUTH_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const contentType = request.headers.get('content-type') || '';
  const url = new URL(request.url);
  const type = url.searchParams.get('type') || '';

  try {
    // ─── กรณี 1: อัปโหลดภาพ (binary JPEG) ──────────────────────────────
    if (contentType.includes('image/jpeg')) {
      const captureIndex = parseInt(url.searchParams.get('capture') || '1');
      const weight = url.searchParams.get('weight') || '?';
      const buffer = Buffer.from(await request.arrayBuffer());
      const result = await handleImageUpload(buffer, captureIndex, weight);
      return NextResponse.json({ success: true, ...result });
    }

    // ─── กรณี 2: ส่งข้อมูล JSON (GPS, alert, metadata) ──────────────────
    const data = await request.json();

    if (type === 'GPS_UPDATE' || data.type === 'GPS_UPDATE') {
      await handleGPSUpdate(data);
    } else if (type === 'DOOR_OPENED' || data.type === 'DOOR_OPENED') {
      await handleAlert(data.type || 'DOOR_OPENED', data.message || '');
    } else if (type === 'GPS_NO_FIX' || data.type === 'GPS_NO_FIX') {
      await handleAlert('GPS_NO_FIX', data.message || '');
    } else if (type === 'LOW_BATTERY' || data.type === 'LOW_BATTERY') {
      await handleAlert('LOW_BATTERY', data.message || '');
    } else if (type === 'MAIL_EVENT' || data.type === 'MAIL_EVENT') {
      await handleMailMetadata(data);
    } else {
      return NextResponse.json({ error: 'Unknown type', type }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API Error]', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: String(error) },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  GET handler — สำหรับ health check
// ═══════════════════════════════════════════════════════════════════════
export async function GET() {
  return NextResponse.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0-vercel',
  });
}

// ═══════════════════════════════════════════════════════════════════════
//  HANDLE GPS UPDATE
// ═══════════════════════════════════════════════════════════════════════
async function handleGPSUpdate(data: any) {
  await db.collection('gps_logs').add({
    lat: data.lat,
    lon: data.lon,
    satellites: data.satellites || 0,
    hdop: data.hdop || 0,
    battery: data.battery,
    timestamp: new Date(),
  });

  await db.collection('mailbox_status').doc('current').set({
    last_gps_lat: data.lat,
    last_gps_lon: data.lon,
    last_gps_time: new Date(),
    battery_level: data.battery,
    online: true,
  }, { merge: true });

  console.log(`[GPS] Updated: ${data.lat}, ${data.lon}`);
}

// ═══════════════════════════════════════════════════════════════════════
//  HANDLE MAIL EVENT METADATA
// ═══════════════════════════════════════════════════════════════════════
async function handleMailMetadata(data: any) {
  await db.collection('mail_events').add({
    weight: data.weight,
    battery: data.battery,
    timestamp: new Date(),
    images: [],
  });
  console.log(`[MAIL] Event logged: weight=${data.weight}g`);
}

// ═══════════════════════════════════════════════════════════════════════
//  HANDLE IMAGE UPLOAD — อัปโหลดไป Cloudinary + ส่ง LINE/Telegram
// ═══════════════════════════════════════════════════════════════════════
async function handleImageUpload(buffer: Buffer, captureIndex: number, weight: string) {
  const timestamp = Date.now();

  // ─── อัปโหลดไป Cloudinary ─────────────────────────────────────────
  const result = await new Promise<any>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'smartmailbox/mail_events',
        public_id: `${timestamp}_capture${captureIndex}`,
        resource_type: 'image',
        format: 'jpg',
        overwrite: false,
        quality: 'auto:good',
        fetch_format: 'auto',
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    uploadStream.end(buffer);
  });

  // ─── บันทึก metadata ลง Firestore ─────────────────────────────────────
  await db.collection('mail_events').add({
    timestamp: new Date(),
    capture_index: captureIndex,
    image_url: result.secure_url,
    cloudinary_public_id: result.public_id,
    image_width: result.width,
    image_height: result.height,
    image_bytes: result.bytes,
  });

  console.log(`[IMAGE] Uploaded capture #${captureIndex}: ${result.secure_url}`);

  // ─── ส่งภาพไป LINE + Telegram (เฉพาะ capture #2) ────────────────────
  if (captureIndex === 2) {
    const text = `📬 มีซองหยอดตู้!\nเวลา: ${new Date().toLocaleString('th-TH')}\nน้ำหนัก: ${weight}g`;
    try {
      await sendToLINE(result.secure_url, text);
      await sendToTelegram(result.secure_url, text);
    } catch (err) {
      console.error('[NOTIFY] Failed:', err);
    }
  }

  return {
    image_url: result.secure_url,
    public_id: result.public_id,
  };
}

// ═══════════════════════════════════════════════════════════════════════
//  SEND TO LINE
// ═══════════════════════════════════════════════════════════════════════
async function sendToLINE(imageUrl: string, text: string) {
  if (!LINE_TOKEN || !LINE_USER_ID) return;
  await axios.post('https://api.line.me/v2/bot/message/push', {
    to: LINE_USER_ID,
    messages: [
      { type: 'text', text },
      { type: 'image', originalContentUrl: imageUrl, previewImageUrl: imageUrl },
    ],
  }, {
    headers: {
      'Authorization': `Bearer ${LINE_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════
//  SEND TO TELEGRAM
// ═══════════════════════════════════════════════════════════════════════
async function sendToTelegram(imageUrl: string, text: string) {
  if (!TG_TOKEN || !TG_CHAT_ID) return;
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
    DOOR_OPENED: '⚠ ตู้ถูกเปิด! ตรวจสอบทันที',
    GPS_NO_FIX: '⚠ GPS ไม่สามารถ fix สัญญาณได้',
    LOW_BATTERY: `⚠ แบตเตอรี่ต่ำ: ${message}`,
  };
  const msg = messages[type] || `⚠ Alert: ${type}`;

  // ─── ส่งไป LINE ──────────────────────────────────────────────────────
  if (LINE_TOKEN && LINE_USER_ID) {
    try {
      await axios.post('https://api.line.me/v2/bot/message/push', {
        to: LINE_USER_ID,
        messages: [{ type: 'text', text: msg }],
      }, {
        headers: {
          'Authorization': `Bearer ${LINE_TOKEN}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (err) {
      console.error('[LINE] Alert failed:', err);
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
      console.error('[TELEGRAM] Alert failed:', err);
    }
  }

  console.log(`[ALERT] ${type} sent`);
}

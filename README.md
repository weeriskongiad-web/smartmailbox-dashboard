# Smart Mailbox Dashboard

Next.js web application for Smart Mailbox IoT system.

## Features

- 📬 Dashboard สำหรับดูสถานะตู้รับซอง
- 📷 API endpoint สำหรับรับภาพจาก ESP32-CAM
- 🗺️ แสดงพิกัด GPS ของตู้
- 📊 สถิติจดหมายเข้ารายวัน
- 🔔 ส่งแจ้งเตือน LINE + Telegram

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Image Storage**: Cloudinary (ฟรี 25GB)
- **Database**: Firebase Firestore (Spark Plan - ฟรี)
- **Hosting**: Vercel (Hobby Plan - ฟรี)

## API Endpoint

```
POST https://smartmailbox-dashboard.vercel.app/api/receiveEvent
```

## Environment Variables (ตั้งใน Vercel Dashboard)

```
CLOUDINARY_CLOUD_NAME=lwjkzby
CLOUDINARY_API_KEY=523171825984118
CLOUDINARY_API_SECRET=GA-8fuekhS8CjxLHpux0KWF33Yc
LINE_TOKEN=your_line_channel_token
LINE_USER_ID=your_line_user_id
TELEGRAM_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
```

## Deploy

Deploy อัตโนมัติเมื่อ push ขึ้น GitHub main branch.

# Smart Mailbox Dashboard v2

โปรเจกต์ Next.js สำหรับ Smart Mailbox IoT System — Dashboard + API endpoint

## 📋 ไฟล์ทั้งหมด

```
smartmailbox-v2/
├── .gitignore
├── next.config.ts
├── package.json
├── tsconfig.json
└── src/
    └── app/
        ├── api/
        │   └── receiveEvent/
        │       └── route.ts        ← API endpoint สำหรับ ESP32
        ├── globals.css             ← Dark theme CSS
        ├── layout.tsx
        └── page.tsx                ← Dashboard 5 views
```

## 🚀 วิธี Deploy

### 1. แทนที่ไฟล์ทั้งหมดในโฟลเดอร์ `Documents\GitHub\smartmailbox-dashboard`

ลบไฟล์เดิมทั้งหมด แล้วคัดลอกไฟล์จาก `smartmailbox-v2/` มาวาง

### 2. Commit + Push ใน GitHub Desktop

### 3. รอ Vercel Auto-Deploy (2-3 นาที)

### 4. ตั้งค่า Environment Variables ใน Vercel

```
CLOUDINARY_CLOUD_NAME=lwjkzby
CLOUDINARY_API_KEY=523171825984118
CLOUDINARY_API_SECRET=GA-8fuekhS8CjxLHpux0KWF33Yc
LINE_TOKEN=your_line_token
LINE_USER_ID=your_line_user_id
TELEGRAM_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id
```

### 5. อัปเดต Arduino Code

ใน `SmartMailbox_Main.ino` แก้บรรทัด:
```cpp
const char* CLOUD_URL = "https://smartmailbox-dashboard.vercel.app/api/receiveEvent";
```

## 📱 API Endpoint

```
POST https://smartmailbox-dashboard.vercel.app/api/receiveEvent
```

## 🎨 ฟีเจอร์ Dashboard

- 5 views: Overview, Map, Mail Events, Statistics, Settings
- Dark theme สวย ๆ
- Sidebar + Topbar + Stat Cards
- Responsive (mobile-friendly)

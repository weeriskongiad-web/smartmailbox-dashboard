// ═══════════════════════════════════════════════════════════════════════
//  Smart Mailbox Dashboard — Main Page
// ═══════════════════════════════════════════════════════════════════════

"use client";

import { useState } from "react";

type View = "overview" | "map" | "mail" | "stats" | "settings";

export default function Home() {
  const [view, setView] = useState<View>("overview");

  return (
    <div className="app">
      {/* ─── Sidebar ─── */}
      <aside className="sidebar">
        <div className="logo">
          <div className="logo-icon">📬</div>
          <div className="logo-text">Smart Mailbox</div>
        </div>

        <ul className="menu">
          <li
            className={`menu-item ${view === "overview" ? "active" : ""}`}
            onClick={() => setView("overview")}
          >
            <span className="menu-icon">📊</span>
            <span>ภาพรวม</span>
          </li>
          <li
            className={`menu-item ${view === "map" ? "active" : ""}`}
            onClick={() => setView("map")}
          >
            <span className="menu-icon">🗺️</span>
            <span>แผนที่ตู้</span>
          </li>
          <li
            className={`menu-item ${view === "mail" ? "active" : ""}`}
            onClick={() => setView("mail")}
          >
            <span className="menu-icon">📷</span>
            <span>ประวัติซอง</span>
          </li>
          <li
            className={`menu-item ${view === "stats" ? "active" : ""}`}
            onClick={() => setView("stats")}
          >
            <span className="menu-icon">📈</span>
            <span>สถิติ</span>
          </li>
          <li
            className={`menu-item ${view === "settings" ? "active" : ""}`}
            onClick={() => setView("settings")}
          >
            <span className="menu-icon">⚙️</span>
            <span>ตั้งค่าระบบ</span>
          </li>
        </ul>
      </aside>

      {/* ─── Main ─── */}
      <div className="main">
        <header className="topbar">
          <div className="page-title">
            {view === "overview" && "ภาพรวมระบบ"}
            {view === "map" && "แผนที่ตู้ (GPS)"}
            {view === "mail" && "ประวัติซองจดหมาย"}
            {view === "stats" && "สถิติการใช้งาน"}
            {view === "settings" && "ตั้งค่าระบบ"}
          </div>

          <div className="status-pills">
            <span className="pill pill-online">● Online</span>
            <span className="pill pill-battery">🔋 78%</span>
            <span className="pill pill-signal">📶 -78 dBm</span>
            <span className="pill pill-temp">🌡️ 32°C</span>
          </div>

          <div className="avatar">W</div>
        </header>

        <main className="content">
          {view === "overview" && <OverviewView />}
          {view === "map" && <MapView />}
          {view === "mail" && <MailView />}
          {view === "stats" && <StatsView />}
          {view === "settings" && <SettingsView />}
        </main>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  View: Overview
// ═══════════════════════════════════════════════════════════════════════
function OverviewView() {
  return (
    <>
      {/* Stat Cards */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">📬 ซองวันนี้</div>
          <div className="stat-value">12<span className="stat-unit">ฉบับ</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-label">🔋 แบตเตอรี่</div>
          <div className="stat-value">78<span className="stat-unit">%</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-label">📶 สัญญาณ 4G</div>
          <div className="stat-value">-78<span className="stat-unit">dBm</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-label">🌡️ อุณหภูมิตู้</div>
          <div className="stat-value">32<span className="stat-unit">°C</span></div>
        </div>
      </div>

      {/* Recent Mail Events */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">📬 ซองจดหมายล่าสุด</div>
          <span className="card-action">ดูทั้งหมด →</span>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>เวลา</th>
              <th>ภาพ</th>
              <th>น้ำหนัก</th>
              <th>กล้อง</th>
              <th>GPS</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={5} className="table-empty">
                ยังไม่มีข้อมูล — รอ ESP32 ส่งข้อมูลเข้ามา
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* GPS Mini Map */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">🗺️ ตำแหน่งตู้ล่าสุด (GPS)</div>
          <span className="card-action">ดูแผนที่ใหญ่ →</span>
        </div>
        <div className="mini-map">
          <div>📍 รอรับพิกัด GPS...</div>
          <div className="gps-coord">
            ส่ง GPS 3 ครั้ง/วัน (08:00, 13:00, 18:00)
          </div>
        </div>
      </div>

      {/* API Endpoint Info */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">⚙️ API Endpoint สำหรับ ESP32</div>
        </div>
        <div className="api-label">
          ใช้ URL นี้ในไฟล์ <code>SmartMailbox_Main.ino</code> บรรทัด <code>CLOUD_URL</code>:
        </div>
        <div className="api-box">
          https://smartmailbox-dashboard.vercel.app/api/receiveEvent
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  View: Map
// ═══════════════════════════════════════════════════════════════════════
function MapView() {
  return (
    <>
      <div className="card">
        <div className="card-header">
          <div className="card-title">🗺️ แผนที่ตำแหน่งตู้</div>
        </div>
        <div className="mini-map" style={{ height: 400 }}>
          <div>📍 รอรับพิกัด GPS...</div>
          <div className="gps-coord">
            ส่ง GPS 3 ครั้ง/วัน — จะแสดงตำแหน่งล่าสุดที่นี่
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">📋 ประวัติการส่ง GPS</div>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>เวลา</th>
              <th>ละติจูด</th>
              <th>ลองจิจูด</th>
              <th>ดาวเทียม</th>
              <th>HDOP</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={5} className="table-empty">
                ยังไม่มีข้อมูล GPS
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  View: Mail Events
// ═══════════════════════════════════════════════════════════════════════
function MailView() {
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">📷 ประวัติซองจดหมาย</div>
      </div>
      <table className="table">
        <thead>
          <tr>
            <th>เวลา</th>
            <th>ภาพ</th>
            <th>น้ำหนัก</th>
            <th>กล้อง</th>
            <th>GPS</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan={6} className="table-empty">
              ยังไม่มีข้อมูล — รอ ESP32 ส่งภาพเข้ามา
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  View: Statistics
// ═══════════════════════════════════════════════════════════════════════
function StatsView() {
  return (
    <>
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">📊 รวมเดือนนี้</div>
          <div className="stat-value">245<span className="stat-unit">ฉบับ</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-label">📈 เฉลี่ย/วัน</div>
          <div className="stat-value">8<span className="stat-unit">ฉบับ</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-label">📅 วันที่มากสุด</div>
          <div className="stat-value">18<span className="stat-unit">ฉบับ</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-label">⏰ ช่วงเวลาบ่อย</div>
          <div className="stat-value">14:00<span className="stat-unit">น</span></div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">📈 กราฟสถิติจดหมาย 7 วันล่าสุด</div>
        </div>
        <div className="mini-map" style={{ height: 300 }}>
          <div>📊 กราฟกำลังพัฒนา...</div>
          <div className="gps-coord">
            จะแสดง Bar chart ของจำนวนซองรายวัน
          </div>
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  View: Settings
// ═══════════════════════════════════════════════════════════════════════
function SettingsView() {
  return (
    <>
      <div className="card">
        <div className="card-header">
          <div className="card-title">⏰ ตั้งค่าเวลาส่ง GPS</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <div>
            <div className="api-label">เช้า</div>
            <input
              type="time"
              defaultValue="08:00"
              style={{
                background: "#0a1628",
                border: "1px solid #334155",
                borderRadius: 8,
                padding: "10px 12px",
                color: "#06b6d4",
                fontSize: 14,
                width: "100%",
              }}
            />
          </div>
          <div>
            <div className="api-label">กลางวัน</div>
            <input
              type="time"
              defaultValue="13:00"
              style={{
                background: "#0a1628",
                border: "1px solid #334155",
                borderRadius: 8,
                padding: "10px 12px",
                color: "#06b6d4",
                fontSize: 14,
                width: "100%",
              }}
            />
          </div>
          <div>
            <div className="api-label">เย็น</div>
            <input
              type="time"
              defaultValue="18:00"
              style={{
                background: "#0a1628",
                border: "1px solid #334155",
                borderRadius: 8,
                padding: "10px 12px",
                color: "#06b6d4",
                fontSize: 14,
                width: "100%",
              }}
            />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">🔔 การแจ้งเตือน</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <div className="api-label">LINE Token</div>
            <input
              type="text"
              placeholder="ใส่ LINE Channel Token"
              style={{
                background: "#0a1628",
                border: "1px solid #334155",
                borderRadius: 8,
                padding: "10px 12px",
                color: "#cbd5e1",
                fontSize: 14,
                width: "100%",
              }}
            />
          </div>
          <div>
            <div className="api-label">Telegram Bot Token</div>
            <input
              type="text"
              placeholder="ใส่ Telegram Bot Token"
              style={{
                background: "#0a1628",
                border: "1px solid #334155",
                borderRadius: 8,
                padding: "10px 12px",
                color: "#cbd5e1",
                fontSize: 14,
                width: "100%",
              }}
            />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">⚠️ การแจ้งเตือนระบบ</div>
        </div>
        <div>
          <div className="api-label">แจ้งเตือนเมื่อแบตเตอรี่ต่ำกว่า (%)</div>
          <input
            type="number"
            defaultValue={20}
            style={{
              background: "#0a1628",
              border: "1px solid #334155",
              borderRadius: 8,
              padding: "10px 12px",
              color: "#06b6d4",
              fontSize: 14,
              width: 100,
              marginTop: 4,
            }}
          />
        </div>
        <button
          style={{
            background: "#06b6d4",
            color: "white",
            border: "none",
            padding: "10px 20px",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            marginTop: 16,
          }}
        >
          💾 บันทึกการตั้งค่า
        </button>
      </div>
    </>
  );
}

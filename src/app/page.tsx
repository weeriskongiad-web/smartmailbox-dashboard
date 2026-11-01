// ═══════════════════════════════════════════════════════════════════════
//  Smart Mailbox Dashboard — v3 (ดึงข้อมูลจริงจาก Firestore)
// ═══════════════════════════════════════════════════════════════════════

"use client";

import { useState, useEffect } from "react";

type View = "overview" | "map" | "mail" | "stats" | "settings";

interface DashboardData {
  status: any;
  mail_events: any[];
  gps_logs: any[];
  today_mail_count: number;
  alerts: any[];
  timestamp: string;
}

export default function Home() {
  const [view, setView] = useState<View>("overview");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  // ─── ดึงข้อมูลทุก 5 วินาที ──────────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/events");
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000); // อัปเดตทุก 5 วินาที
    return () => clearInterval(interval);
  }, []);

  // ─── ค่าที่จะแสดง (ใช้ข้อมูลจริงถ้ามี) ─────────────────────────────
  const battery = data?.status?.battery_level ?? 0;
  const todayCount = data?.today_mail_count ?? 0;
  const lastGps = data?.gps_logs?.[0];
  const lat = lastGps?.lat ?? "—";
  const lon = lastGps?.lon ?? "—";

  return (
    <div className="app">
      {/* ─── Sidebar ─── */}
      <aside className="sidebar">
        <div className="logo">
          <div className="logo-icon">📬</div>
          <div className="logo-text">Smart Mailbox</div>
        </div>
        <ul className="menu">
          <li className={`menu-item ${view === "overview" ? "active" : ""}`} onClick={() => setView("overview")}>
            <span className="menu-icon">📊</span><span>ภาพรวม</span>
          </li>
          <li className={`menu-item ${view === "map" ? "active" : ""}`} onClick={() => setView("map")}>
            <span className="menu-icon">🗺️</span><span>แผนที่ตู้</span>
          </li>
          <li className={`menu-item ${view === "mail" ? "active" : ""}`} onClick={() => setView("mail")}>
            <span className="menu-icon">📷</span><span>ประวัติซอง</span>
          </li>
          <li className={`menu-item ${view === "stats" ? "active" : ""}`} onClick={() => setView("stats")}>
            <span className="menu-icon">📈</span><span>สถิติ</span>
          </li>
          <li className={`menu-item ${view === "settings" ? "active" : ""}`} onClick={() => setView("settings")}>
            <span className="menu-icon">⚙️</span><span>ตั้งค่าระบบ</span>
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
            <span className="pill pill-battery">🔋 {battery.toFixed(0)}%</span>
            <span className="pill pill-signal">📶 {data?.status ? "OK" : "—"}</span>
          </div>
          <div className="avatar">W</div>
        </header>

        <main className="content">
          {loading && <div className="loading">กำลังโหลดข้อมูล...</div>}
          {!loading && view === "overview" && <OverviewView data={data} todayCount={todayCount} battery={battery} lat={lat} lon={lon} />}
          {!loading && view === "map" && <MapView data={data} />}
          {!loading && view === "mail" && <MailView data={data} />}
          {!loading && view === "stats" && <StatsView data={data} />}
          {!loading && view === "settings" && <SettingsView />}
        </main>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  Overview View
// ═══════════════════════════════════════════════════════════════════════
function OverviewView({ data, todayCount, battery, lat, lon }: any) {
  const mailEvents = data?.mail_events || [];
  const lastGps = data?.gps_logs?.[0];

  return (
    <>
      {/* Stat Cards */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">📬 ซองวันนี้</div>
          <div className="stat-value">{todayCount}<span className="stat-unit">ฉบับ</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-label">🔋 แบตเตอรี่</div>
          <div className="stat-value">{battery.toFixed(0)}<span className="stat-unit">%</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-label">🛰️ ดาวเทียม</div>
          <div className="stat-value">{lastGps?.satellites ?? "—"}<span className="stat-unit">ดวง</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-label">⏰ GPS ล่าสุด</div>
          <div className="stat-value" style={{ fontSize: 16 }}>
            {lastGps ? new Date(lastGps.timestamp).toLocaleTimeString("th-TH") : "—"}
          </div>
        </div>
      </div>

      {/* Recent Mail Events */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">📬 ซองจดหมายล่าสุด</div>
        </div>
        {mailEvents.length === 0 ? (
          <div className="table-empty">ยังไม่มีข้อมูล — รอ ESP32 ส่งข้อมูลเข้ามา</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>เวลา</th>
                <th>ภาพ</th>
                <th>น้ำหนัก</th>
                <th>กล้อง</th>
              </tr>
            </thead>
            <tbody>
              {mailEvents.slice(0, 5).map((event: any) => (
                <tr key={event.id}>
                  <td>{new Date(event.timestamp).toLocaleString("th-TH")}</td>
                  <td>
                    {event.image_url ? (
                      <img src={event.image_url} alt="mail" className="image-thumb" />
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>{event.weight ? `${event.weight}g` : "—"}</td>
                  <td>
                    {event.capture_index && (
                      <span className={`badge badge-cam${event.capture_index}`}>
                        CAM-{event.capture_index}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* GPS Mini Map */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">🗺️ ตำแหน่งตู้ล่าสุด (GPS)</div>
        </div>
        <div className="mini-map">
          {lat !== "—" ? (
            <>
              <div>📍 ตำแหน่งตู้ปัจจุบัน</div>
              <div className="gps-coord">
                Lat: {typeof lat === "number" ? lat.toFixed(6) : lat}<br/>
                Lon: {typeof lon === "number" ? lon.toFixed(6) : lon}
              </div>
              <div style={{ fontSize: 11, color: "#64748b" }}>
                อัปเดต: {lastGps ? new Date(lastGps.timestamp).toLocaleString("th-TH") : "—"}
              </div>
            </>
          ) : (
            <>
              <div>📍 รอรับพิกัด GPS...</div>
              <div className="gps-coord">ส่ง GPS 3 ครั้ง/วัน (08:00, 13:00, 18:00)</div>
            </>
          )}
        </div>
      </div>

      {/* Recent Alerts */}
      {data?.alerts && data.alerts.length > 0 && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">⚠️ แจ้งเตือนล่าสุด</div>
          </div>
          {data.alerts.slice(0, 3).map((alert: any) => (
            <div key={alert.id} className="alert-item">
              {alert.message}
              <div style={{ fontSize: 11, marginTop: 4, opacity: 0.7 }}>
                {new Date(alert.timestamp).toLocaleString("th-TH")}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  Map View
// ═══════════════════════════════════════════════════════════════════════
function MapView({ data }: any) {
  const gpsLogs = data?.gps_logs || [];

  return (
    <>
      <div className="card">
        <div className="card-header">
          <div className="card-title">🗺️ ตำแหน่งตู้ล่าสุด</div>
        </div>
        <div className="mini-map" style={{ height: 400 }}>
          {gpsLogs.length > 0 ? (
            <>
              <div>📍 ตำแหน่งตู้</div>
              <div className="gps-coord" style={{ fontSize: 16 }}>
                Lat: {gpsLogs[0].lat.toFixed(6)}<br/>
                Lon: {gpsLogs[0].lon.toFixed(6)}
              </div>
              <div style={{ fontSize: 12 }}>
                ดาวเทียม: {gpsLogs[0].satellites} ดวง | HDOP: {gpsLogs[0].hdop?.toFixed(1)}
              </div>
              <a
                href={`https://www.google.com/maps?q=${gpsLogs[0].lat},${gpsLogs[0].lon}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#06b6d4", fontSize: 13, marginTop: 8 }}
              >
                📖 เปิดใน Google Maps →
              </a>
            </>
          ) : (
            <div>ยังไม่มีข้อมูล GPS</div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">📋 ประวัติการส่ง GPS</div>
        </div>
        {gpsLogs.length === 0 ? (
          <div className="table-empty">ยังไม่มีข้อมูล GPS</div>
        ) : (
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
              {gpsLogs.map((gps: any) => (
                <tr key={gps.id}>
                  <td>{new Date(gps.timestamp).toLocaleString("th-TH")}</td>
                  <td>{gps.lat.toFixed(6)}</td>
                  <td>{gps.lon.toFixed(6)}</td>
                  <td>{gps.satellites}</td>
                  <td>{gps.hdop?.toFixed(1) || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  Mail View
// ═══════════════════════════════════════════════════════════════════════
function MailView({ data }: any) {
  const mailEvents = data?.mail_events || [];

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">📷 ประวัติซองจดหมาย</div>
      </div>
      {mailEvents.length === 0 ? (
        <div className="table-empty">ยังไม่มีข้อมูล — รอ ESP32 ส่งภาพเข้ามา</div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>เวลา</th>
              <th>ภาพ</th>
              <th>น้ำหนัก</th>
              <th>กล้อง</th>
            </tr>
          </thead>
          <tbody>
            {mailEvents.map((event: any) => (
              <tr key={event.id}>
                <td>{new Date(event.timestamp).toLocaleString("th-TH")}</td>
                <td>
                  {event.image_url ? (
                    <img src={event.image_url} alt="mail" className="image-thumb" />
                  ) : (
                    "—"
                  )}
                </td>
                <td>{event.weight ? `${event.weight}g` : "—"}</td>
                <td>
                  {event.capture_index && (
                    <span className={`badge badge-cam${event.capture_index}`}>
                      CAM-{event.capture_index}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  Stats View
// ═══════════════════════════════════════════════════════════════════════
function StatsView({ data }: any) {
  const totalMail = data?.mail_events?.length || 0;
  const totalGps = data?.gps_logs?.length || 0;
  const totalAlerts = data?.alerts?.length || 0;

  return (
    <>
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">📬 ซองวันนี้</div>
          <div className="stat-value">{data?.today_mail_count || 0}<span className="stat-unit">ฉบับ</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-label">📊 รวมทั้งหมด</div>
          <div className="stat-value">{totalMail}<span className="stat-unit">รายการ</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-label">🛰️ GPS ทั้งหมด</div>
          <div className="stat-value">{totalGps}<span className="stat-unit">ครั้ง</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-label">⚠️ แจ้งเตือน</div>
          <div className="stat-value">{totalAlerts}<span className="stat-unit">ครั้ง</span></div>
        </div>
      </div>

      {data?.alerts && data.alerts.length > 0 && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">⚠️ ประวัติการแจ้งเตือน</div>
          </div>
          {data.alerts.map((alert: any) => (
            <div key={alert.id} className="alert-item">
              {alert.message}
              <div style={{ fontSize: 11, marginTop: 4, opacity: 0.7 }}>
                {new Date(alert.timestamp).toLocaleString("th-TH")}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  Settings View
// ═══════════════════════════════════════════════════════════════════════
function SettingsView() {
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">⚙️ API Endpoint</div>
      </div>
      <div className="api-label">ใช้ URL นี้ใน SmartMailbox_Main.ino:</div>
      <div className="api-box">https://smartmailbox-dashboard.vercel.app/api/receiveEvent</div>
    </div>
  );
}

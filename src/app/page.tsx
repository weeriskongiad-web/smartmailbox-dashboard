// ═══════════════════════════════════════════════════════════════════════
//  Smart Mailbox Dashboard v4 — Beautiful UI + Real Data from Firestore
//  Polling: 60 วินาที (ป้องกัน Firestore quota)
// ═══════════════════════════════════════════════════════════════════════

"use client";

import { useState, useEffect, useCallback } from "react";

type View = "overview" | "map" | "mail" | "stats" | "settings";

const DEVICE_ID = "MBX-BKK-0042";

export default function Home() {
  const [view, setView] = useState<View>("overview");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/events", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setLastUpdate(new Date());
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000); // ⭐ 60 วินาที
    return () => clearInterval(interval);
  }, [fetchData]);

  const battery = data?.status?.battery_level ?? 0;
  const todayCount = data?.today_mail_count ?? 0;
  const lastGps = data?.gps_logs?.[0];
  const lat = lastGps?.lat ?? 0;
  const lon = lastGps?.lon ?? 0;
  const online = data?.status?.online ?? false;
  const lastSeen = data?.status?.last_gps_time;
  const uptimeHours = 142; // Mock - คำนวณจาก boot_count หรือเวลาเริ่มต้น

  return (
    <div className="app">
      {/* Sidebar */}
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

      {/* Main */}
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
            <span className={`pill ${online ? "pill-online" : ""}`}>
              {online ? "● Online" : "● Offline"}
            </span>
            <span className="pill pill-battery">🔋 {battery.toFixed(0)}%</span>
            <span className="pill pill-device">📦 {DEVICE_ID}</span>
          </div>

          <button className="refresh-btn" onClick={fetchData}>
            🔄 รีเฟรช
          </button>
        </header>

        <main className="content">
          {loading && <div className="loading">กำลังโหลดข้อมูล...</div>}
          {!loading && view === "overview" && (
            <OverviewView data={data} todayCount={todayCount} battery={battery} lat={lat} lon={lon} lastGps={lastGps} uptimeHours={uptimeHours} />
          )}
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
//  SVG Map Component — แผนที่แบบ Visual
// ═══════════════════════════════════════════════════════════════════════
function SvgMap({ lat, lon, height = 300 }: { lat: number; lon: number; height?: number }) {
  if (!lat || !lon) {
    return (
      <div className="map-container" style={{ height, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#64748b", textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🗺️</div>
          <div>รอรับพิกัด GPS...</div>
          <div className="map-coord">ส่ง GPS 3 ครั้ง/วัน (08:00, 13:00, 18:00)</div>
        </div>
      </div>
    );
  }

  // Convert lat/lon to SVG coordinates (simplified projection)
  const cx = 200 + (lon - 100.5) * 1000;
  const cy = 150 - (lat - 13.75) * 1000;

  return (
    <div className="map-container">
      <svg className="map-svg" viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
        {/* Background gradient */}
        <defs>
          <radialGradient id="mapBg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#020617" />
          </radialGradient>
        </defs>
        <rect width="400" height="300" fill="url(#mapBg)" />

        {/* Grid lines */}
        {[50, 100, 150, 200, 250, 300, 350].map((x) => (
          <line key={`v${x}`} x1={x} y1="0" x2={x} y2="300" stroke="#1e293b" strokeWidth="0.5" />
        ))}
        {[50, 100, 150, 200, 250].map((y) => (
          <line key={`h${y}`} x1="0" y1={y} x2="400" y2={y} stroke="#1e293b" strokeWidth="0.5" />
        ))}

        {/* Roads (decorative) */}
        <path d="M 0 200 Q 100 180 200 150 T 400 100" stroke="#334155" strokeWidth="2" fill="none" opacity="0.5" />
        <path d="M 150 0 L 180 300" stroke="#334155" strokeWidth="2" fill="none" opacity="0.5" />
        <path d="M 0 80 L 400 120" stroke="#334155" strokeWidth="1.5" fill="none" opacity="0.3" />

        {/* Geofence circle (2.5km radius) */}
        <circle cx={cx} cy={cy} r="80" fill="#06b6d4" fillOpacity="0.05" stroke="#06b6d4" strokeWidth="1" strokeDasharray="4,4" opacity="0.5" />
        <text x={cx} y={cy - 85} fill="#06b6d4" fontSize="9" textAnchor="middle" opacity="0.7">Geofence 2.5km</text>

        {/* GPS Trail (history) */}
        <circle cx={cx - 3} cy={cy + 5} r="3" fill="#06b6d4" opacity="0.3" />
        <circle cx={cx - 6} cy={cy + 10} r="2" fill="#06b6d4" opacity="0.2" />

        {/* Location pin (pulsing) */}
        <circle cx={cx} cy={cy} r="12" fill="#06b6d4" opacity="0.3">
          <animate attributeName="r" values="8;16;8" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.3;0;0.3" dur="2s" repeatCount="indefinite" />
        </circle>
        <circle cx={cx} cy={cy} r="6" fill="#06b6d4" />
        <circle cx={cx} cy={cy} r="3" fill="white" />

        {/* Coordinates label */}
        <rect x={cx - 60} y={cy + 15} width="120" height="30" rx="4" fill="#0f172a" stroke="#334155" />
        <text x={cx} y={cy + 28} fill="#06b6d4" fontSize="9" textAnchor="middle" fontFamily="monospace">
          {lat.toFixed(5)}, {lon.toFixed(5)}
        </text>
        <text x={cx} y={cy + 38} fill="#64748b" fontSize="8" textAnchor="middle">
          📍 Smart Mailbox Location
        </text>

        {/* Compass */}
        <g transform="translate(360, 30)">
          <circle cx="0" cy="0" r="15" fill="#1e293b" stroke="#334155" />
          <text x="0" y="-5" fill="#06b6d4" fontSize="8" textAnchor="middle">N</text>
          <line x1="0" y1="-10" x2="0" y2="10" stroke="#475569" strokeWidth="0.5" />
        </g>
      </svg>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  Overview View
// ═══════════════════════════════════════════════════════════════════════
function OverviewView({ data, todayCount, battery, lat, lon, lastGps, uptimeHours }: any) {
  const mailEvents = data?.mail_events || [];

  return (
    <>
      {/* Stat Cards */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">📬 ซองวันนี้</div>
          <div className="stat-value">{todayCount}<span className="stat-unit">ฉบับ</span></div>
          <div className="stat-sub">รวมทั้งหมด: {mailEvents.length} รายการ</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">🔋 แบตเตอรี่</div>
          <div className="stat-value">{battery.toFixed(0)}<span className="stat-unit">%</span></div>
          <div className="stat-sub">{battery > 20 ? "ปกติ" : "ต่ำ!"}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">🛰️ ดาวเทียม</div>
          <div className="stat-value">{lastGps?.satellites ?? "—"}<span className="stat-unit">ดวง</span></div>
          <div className="stat-sub">HDOP: {lastGps?.hdop?.toFixed(1) ?? "—"}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">⏱️ Uptime</div>
          <div className="stat-value">{uptimeHours}<span className="stat-unit">ชม.</span></div>
          <div className="stat-sub">Device: MBX-BKK-0042</div>
        </div>
      </div>

      {/* Recent Mail Events */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">📬 ซองจดหมายล่าสุด</div>
          <span className="card-action" onClick={() => window.location.reload()}>รีเฟรช →</span>
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

      {/* GPS Map (SVG) */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">🗺️ ตำแหน่งตู้ล่าสุด (GPS)</div>
        </div>
        <SvgMap lat={lat} lon={lon} height={300} />
        <div className="device-panel">
          <div className="device-info-item">
            <div className="device-info-label">พิกัดล่าสุด</div>
            <div className="device-info-value">
              {lat ? `${lat.toFixed(6)}, ${lon.toFixed(6)}` : "—"}
            </div>
          </div>
          <div className="device-info-item">
            <div className="device-info-label">อัปเดตล่าสุด</div>
            <div className="device-info-value">
              {lastGps ? new Date(lastGps.timestamp).toLocaleString("th-TH") : "—"}
            </div>
          </div>
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
//  Map View (แผนที่ใหญ่ + Timeline)
// ═══════════════════════════════════════════════════════════════════════
function MapView({ data }: any) {
  const gpsLogs = data?.gps_logs || [];
  const lastGps = gpsLogs[0];

  return (
    <>
      <div className="card">
        <div className="card-header">
          <div className="card-title">🗺️ ตำแหน่งตู้ล่าสุด</div>
        </div>
        <SvgMap lat={lastGps?.lat || 0} lon={lastGps?.lon || 0} height={400} />
        {lastGps && (
          <div className="device-panel">
            <div className="device-info-item">
              <div className="device-info-label">ละติจูด</div>
              <div className="device-info-value">{lastGps.lat.toFixed(6)}</div>
            </div>
            <div className="device-info-item">
              <div className="device-info-label">ลองจิจูด</div>
              <div className="device-info-value">{lastGps.lon.toFixed(6)}</div>
            </div>
            <div className="device-info-item">
              <div className="device-info-label">ดาวเทียม</div>
              <div className="device-info-value">{lastGps.satellites} ดวง</div>
            </div>
            <div className="device-info-item">
              <div className="device-info-label">HDOP</div>
              <div className="device-info-value">{lastGps.hdop?.toFixed(1) || "—"}</div>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">📋 ประวัติการส่ง GPS (Timeline)</div>
        </div>
        {gpsLogs.length === 0 ? (
          <div className="table-empty">ยังไม่มีข้อมูล GPS</div>
        ) : (
          <div className="timeline">
            {gpsLogs.map((gps: any) => (
              <div key={gps.id} className="timeline-item">
                <div className="timeline-time">
                  {new Date(gps.timestamp).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
                </div>
                <div className="timeline-coord">
                  📍 {gps.lat.toFixed(6)}, {gps.lon.toFixed(6)} | 🛰️ {gps.satellites} ดวง
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  Mail Events View
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
    <>
      <div className="card">
        <div className="card-header">
          <div className="card-title">⚙️ API Endpoint</div>
        </div>
        <div className="api-label">ใช้ URL นี้ใน SmartMailbox_Main.ino:</div>
        <div className="api-box">https://smartmailbox-dashboard.vercel.app/api/receiveEvent</div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">📦 ข้อมูลอุปกรณ์</div>
        </div>
        <div className="device-panel">
          <div className="device-info-item">
            <div className="device-info-label">Device ID</div>
            <div className="device-info-value">MBX-BKK-0042</div>
          </div>
          <div className="device-info-item">
            <div className="device-info-label">Firmware Version</div>
            <div className="device-info-value">v2.3 (ASCII Protocol)</div>
          </div>
          <div className="device-info-item">
            <div className="device-info-label">GPS Schedule</div>
            <div className="device-info-value">08:00, 13:00, 18:00</div>
          </div>
          <div className="device-info-item">
            <div className="device-info-label">Battery Threshold</div>
            <div className="device-info-value">20% (Low)</div>
          </div>
        </div>
      </div>
    </>
  );
}

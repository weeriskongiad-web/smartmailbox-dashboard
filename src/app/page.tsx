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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
    const interval = setInterval(fetchData, 300000); // 5 นาที (300,000 ms)
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

  const handleSetView = (newView: View) => {
    setView(newView);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="app">
      {/* Mobile Top Bar with Hamburger Menu */}
      <button className="hamburger-btn" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
        ☰
      </button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div className="mobile-overlay" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${isMobileMenuOpen ? "sidebar-open" : ""}`}>
        <div className="logo">
          <div className="logo-icon">📬</div>
          <div className="logo-text">Smart Mailbox</div>
        </div>
        <ul className="menu">
          <li className={`menu-item ${view === "overview" ? "active" : ""}`} onClick={() => handleSetView("overview")}>
            <span className="menu-icon">📊</span><span>ภาพรวม</span>
          </li>
          <li className={`menu-item ${view === "map" ? "active" : ""}`} onClick={() => handleSetView("map")}>
            <span className="menu-icon">🗺️</span><span>แผนที่ตู้</span>
          </li>
          <li className={`menu-item ${view === "mail" ? "active" : ""}`} onClick={() => handleSetView("mail")}>
            <span className="menu-icon">📷</span><span>ประวัติซอง</span>
          </li>
          <li className={`menu-item ${view === "stats" ? "active" : ""}`} onClick={() => handleSetView("stats")}>
            <span className="menu-icon">📈</span><span>สถิติ</span>
          </li>
          <li className={`menu-item ${view === "settings" ? "active" : ""}`} onClick={() => handleSetView("settings")}>
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
//  Real Map Component — Google Maps Embed (ฟรี ไม่ต้อง API Key)
// ═══════════════════════════════════════════════════════════════════════
function RealMap({ lat, lon, height = 300 }: { lat: number; lon: number; height?: number }) {
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

  const mapUrl = `https://maps.google.com/maps?q=${lat},${lon}&z=15&output=embed`;

  return (
    <div className="map-container" style={{ padding: 0, overflow: "hidden" }}>
      <iframe
        src={mapUrl}
        width="100%"
        height={height}
        style={{ border: 0, borderRadius: 8 }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
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
        <RealMap lat={lat} lon={lon} height={300} />
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
        <RealMap lat={lastGps?.lat || 0} lon={lastGps?.lon || 0} height={400} />
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

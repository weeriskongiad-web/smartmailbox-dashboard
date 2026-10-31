// ═══════════════════════════════════════════════════════════════════════
//  Smart Mailbox Dashboard — หน้าหลัก
//  URL: https://smartmailbox-dashboard.vercel.app
// ═══════════════════════════════════════════════════════════════════════

export default function Home() {
  return (
    <main className="container">
      <h1>📬 Smart Mailbox Dashboard</h1>

      {/* Status badges */}
      <div style={{ marginBottom: 24, display: 'flex', gap: 12 }}>
        <span className="status-badge status-online">● Online</span>
        <span className="status-badge status-offline">Battery: 78%</span>
        <span className="status-badge status-offline">4G: -78 dBm</span>
      </div>

      {/* Stats */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-value">12</div>
          <div className="stat-label">ซองวันนี้</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">78%</div>
          <div className="stat-label">แบตเตอรี่</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">-78</div>
          <div className="stat-label">สัญญาณ 4G (dBm)</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">32°C</div>
          <div className="stat-label">อุณหภูมิตู้</div>
        </div>
      </div>

      {/* Recent Events */}
      <div className="card">
        <h2>📬 ซองจดหมายล่าสุด</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>
          ยังไม่มีข้อมูล — รอ ESP32 ส่งข้อมูลเข้ามา
        </p>
        <table>
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
              <td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                ไม่มีข้อมูล
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* GPS Location */}
      <div className="card">
        <h2>🗺️ ตำแหน่งตู้ล่าสุด (GPS)</h2>
        <p style={{ color: 'var(--text-muted)' }}>
          ยังไม่มีข้อมูล GPS — รอส่ง GPS ครั้งแรก (08:00, 13:00, 18:00)
        </p>
      </div>

      {/* API Info */}
      <div className="card">
        <h2>⚙️ API Endpoint</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: 8 }}>
          ใช้ URL นี้ใน SmartMailbox_Main.ino บรรทัด CLOUD_URL:
        </p>
        <code style={{
          display: 'block',
          background: '#0f172a',
          padding: 12,
          borderRadius: 6,
          color: 'var(--accent)',
          fontSize: 13,
          wordBreak: 'break-all'
        }}>
          https://smartmailbox-dashboard.vercel.app/api/receiveEvent
        </code>
      </div>
    </main>
  );
}

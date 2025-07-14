import React, { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { FaTasks } from "react-icons/fa";
import { Container } from "react-bootstrap";

export default function AllLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const beautifyField = (field) =>
    field
      .replace(/_/g, " ")
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

  const formatValue = (field, value) => {
    if (value === null || value === undefined || value === "") {
      return <span className="text-secondary">🚫 Değer yok</span>;
    }

    if (typeof value === "object") {
      try {
        value = JSON.stringify(value);
      } catch {
        value = "[Nesne]";
      }
    }

    const str = String(value).toLowerCase();

    if (field === "durum_adi") {
      return (
        <span className="text-primary fw-semibold">
          Durum: "{value}" durumuna alındı
        </span>
      );
    }

    if (str === "true")
      return <span className="text-success fw-semibold">✅ Aktif</span>;
    if (str === "false")
      return <span className="text-danger fw-semibold">❌ Pasif</span>;
    if (str === "null")
      return <span className="text-secondary">🚫 Değer yok</span>;

    return value;
  };

  useEffect(() => {
    async function fetchLogs() {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("http://localhost:3000/imalat_takip_logs", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Veri alınamadı");
        const json = await res.json();
        setLogs(json);
      } catch (err) {
        console.error("Log çekme hatası:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchLogs();
  }, []);

  if (loading)
    return <div className="text-center mt-5 text-muted">Yükleniyor...</div>;
  if (error)
    return <div className="text-center mt-5 text-danger">Hata: {error}</div>;

  return (
    <Container style={{ fontFamily: "Poppins, sans-serif" }}>
      <h5 className="card-title mb-4" style={{ color: "#21274a", fontSize: 16 }}>
        <FaTasks /> İmalat Takip Log
      </h5>

      <div className="row gy-3">
        {logs.length === 0 && (
          <div className="text-muted" style={{ padding: 20 }}>
            Henüz görüntülenecek log kaydı bulunamadı.
          </div>
        )}

        {logs.map((log, index) => {
          const alanKey = log.alan_adi || "Bilinmeyen alan";
          const alan = beautifyField(alanKey);
          const kullanici = log.kullanici_adi?.split("@")[0] || "Bilinmiyor";
          const tarih = log.degisim_tarihi
            ? new Date(log.degisim_tarihi).toLocaleString("tr-TR")
            : "Tarih yok";
          const urunAdi = log.urun_adi || "Bilinmiyor";

          return (
            <div className="col-12" key={log.id ?? log.unique_id ?? index}>
              <div
                className="p-3 d-flex flex-column flex-md-row align-items-start justify-content-between shadow-sm rounded border-start"
                style={{
                  borderLeft: "5px solid #21274a",
                  backgroundColor: "#ffffff",
                }}
              >
                {/* Sol: Kullanıcı ve Ürün */}
                <div className="mb-2 mb-md-0" style={{ minWidth: "25%" }}>
                  <div className="fw-semibold text-dark" style={{ fontSize: 14 }}>
                    {kullanici}
                  </div>
                  <div className="mt-1 text-body-secondary">
                    <span
                      className="badge bg-light text-dark me-2"
                      style={{ fontSize: 10 }}
                    >
                      Ürün
                    </span>
                    <strong style={{ fontSize: 10 }}>{urunAdi}</strong>
                  </div>
                </div>

                {/* Orta: Alan ve Yeni Değer */}
                <div className="mb-2 mb-md-0" style={{ minWidth: "45%" }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: "#555" }}>
                    {alan}
                  </div>
                  <div className="mt-1" style={{ fontSize: 13, fontWeight: 700 }}>
                    {formatValue(alanKey, log.yeni_deger)}
                  </div>
                </div>

                {/* Sağ: Tarih ve ID */}
                <div className="text-md-end" style={{ minWidth: "30%" }}>
                  <div className="text-muted" style={{ fontSize: 11 }}>
                    {tarih}
                  </div>
                  <span className="badge bg-secondary mt-1" style={{ fontSize: 10 }}>
                    Ürün ID: {log.unique_id}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Container>
  );
}

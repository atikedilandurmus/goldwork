import React, { useEffect, useState } from "react";
import { useAuth } from "../AuthContext";
import axios from "axios";
import { Container, Card, Button } from "react-bootstrap";
import { FaTasks } from "react-icons/fa";

function YeniImalat() {
  const { currentUser } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openRows, setOpenRows] = useState({});
  const [allowedFields, setAllowedFields] = useState([]);
  const [selectedOrders, setSelectedOrders] = useState(new Set());

  const booleanFields = ["stl", "dokum", "cila", "tamamlandi", "iptal"];
  const inputFields = [
    "cila_gelis",
    "mihlama_giris",
    "mihlama_gelis",
    "tuy_giris",
    "tuy_gelis",
    "paketleme",
  ];

  useEffect(() => {
    if (!currentUser) return;

    async function fetchImalatTakip() {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("http://localhost:3000/imalat_takip", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status !== 200) throw new Error("Veri alınamadı");
        setData(res.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchImalatTakip();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;

    const fetchPermissions = async () => {
      try {
        const userId = currentUser.id;
        const token = localStorage.getItem("token");
        const res = await axios.get(
          `http://localhost:3000/api/user_permissions/${userId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const lowerFields = (res.data.allowedFields || []).map((f) =>
          f.toLowerCase()
        );
        console.log(lowerFields);
        setAllowedFields(lowerFields);
      } catch (err) {
        console.error("Yetki alma hatası:", err);
        setAllowedFields([]);
      }
    };

    fetchPermissions();
  }, [currentUser]);

  const isFieldDisabled = (field) => {
    if (!allowedFields || allowedFields.length === 0) return true;
    return !allowedFields.includes(field.toLowerCase());
  };

  const handleFieldChange = async (uniqueId, field, value) => {
    const token = localStorage.getItem("token");
    try {
      await axios.patch(
        `http://localhost:3000/imalat_takip/${uniqueId}`,
        { [field]: value },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // PATCH'ten sonra güncel satırı tekrar çek
      const res = await axios.get(
        `http://localhost:3000/imalat_takip/${uniqueId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Gelen yeni satır ile state'i güncelle
      const updatedRow = res.data;
      setData((prevData) =>
        prevData.map((item) =>
          item.unique_id === uniqueId ? updatedRow : item
        )
      );
    } catch (error) {
      console.error("Güncelleme hatası:", error);
      alert("Güncelleme sırasında hata oluştu");
    }
  };

  if (loading) return <div>Yükleniyor...</div>;
  if (error) return <div>Hata: {error}</div>;

  const orderCodeKey = "siparis_kodu";

  return (
    <Container
      style={{
        fontFamily: "Poppins, sans-serif",
        color: "#21274a",
        width: "100%",
      }}
    >
      <h5
        className="card-title mb-3"
        style={{
          color: "#21274a",
          fontSize: 16,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <FaTasks /> İmalat Takibi
      </h5>
      {data.map((row, index) => {
        const keys = Object.keys(row);
        const filteredKeys = keys.filter((k) => k !== "unique_id");
  const isOpen = !!openRows[index]; // burası önemli

        const orderCodeIndex = filteredKeys.indexOf(orderCodeKey);
        const visibleKeys =
          orderCodeIndex >= 0
            ? filteredKeys.slice(0, orderCodeIndex + 1)
            : filteredKeys;
        const hiddenKeys =
          orderCodeIndex >= 0 ? filteredKeys.slice(orderCodeIndex + 1) : [];


        return (
          <div className="d-flex row">
            <div
      key={index}
      style={{
        display: "flex",
        gap: 20,
        marginBottom: 30,
        alignItems: "flex-start",
        width: "100%",
        flexDirection:'row'
      }}
    >
      {/* Sol sütun: visible alanlar */}
      <Card
        style={{
          display: "flex",
          flexDirection: "column",
          padding: "1.5rem",
          alignItems: "flex-start",
          fontSize: 12,
          width: "50%",
          minWidth: 320,
          boxSizing: "border-box",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          borderRadius: 8,
          backgroundColor: "#fff",
        }}
        className="shadow-sm"
      >
        
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)", // 4 sütun
                    gap: "10px",
                    width: "100%",
                    wordBreak: "break-word",
                  }}
                >
                  {visibleKeys.map((key) => (
                    <div
                      key={key}
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      {key === "is_checked" ? (
                        <>
                          <input
                            type="checkbox"
                            checked={selectedOrders.has(row.unique_id)}
                            onChange={(e) => {
                              setSelectedOrders((prev) => {
                                const newSet = new Set(prev);
                                if (e.target.checked) {
                                  newSet.add(row.unique_id);
                                } else {
                                  newSet.delete(row.unique_id);
                                }
                                return newSet;
                              });
                            }}
                            style={{ cursor: "pointer" }}
                          />
                        </>
                      ) : key === "barkod" && row[key] ? (
                        <img
                          src={`data:image/png;base64,${row[key]}`}
                          alt="Barkod"
                          style={{ maxWidth: 150, maxHeight: 50 }}
                        />
                      ) : (
                        <span>
                          <strong>{key}:</strong> {row[key]?.toString() || ""}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </Card>

              {/* Sağ sütun: detay ve buton */}
                              {currentUser?.role === "admin" && (

              <Card
                style={{
                  flexShrink: 0,
                  width: "50%",
                  maxWidth: "100%",
                  padding: "1rem",
                  fontSize: 11,
                  boxSizing: "border-box",
                }}
                className="shadow-sm"
              >
                {currentUser?.role === "admin" && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() =>
setOpenRows((prev) => ({
  ...prev,
  [index]: !prev[index],
}))

                    }
                    aria-expanded={isOpen}
                    aria-controls={`details-${index}`}
                    style={{
                      marginBottom: 12,
                      whiteSpace: "nowrap",
                      fontSize: 10,
                      userSelect: "none",
                    }}
                  >
                    {isOpen ? "Detayları Gizle ▲" : "Detayları Göster ▼"}
                  </Button>
                )}

                {isOpen && (
                 <div
              id={`details-${index}`}
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                gap: 12,
                maxHeight: 300,
                overflowY: "auto",
                border: "1px solid #e0e0e0",
                padding: 12,
                borderRadius: 6,
                backgroundColor: "#fff",
                wordBreak: "break-word",
                fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
              }}
            >
                    {hiddenKeys.map((key) => {
                      const value = row[key];
                      const disabled = isFieldDisabled(key);
                      const uniqueId = row.unique_id;

                      const commonBoxStyle = {
                        backgroundColor: disabled ? "#f9f9f9" : "#fff",
                        borderRadius: 5,
                        padding: "6px 10px",
                        boxShadow: "0 1px 3px rgb(0 0 0 / 0.08)",
                        transition: "background-color 0.3s",
                        cursor: disabled ? "not-allowed" : "default",
                        display: "flex",
                        flexDirection: "column",
                        userSelect: "none",
                      };

                      if (booleanFields.includes(key)) {
                        return (
                          <label
                            key={key}
                            style={{
                              ...commonBoxStyle,
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 8,
                              fontWeight: 600,
                              color: disabled ? "#a0a0a0" : "#34495e",
                              cursor: disabled ? "not-allowed" : "pointer",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={!!value}
                              disabled={disabled}
                              onChange={(e) =>
                                handleFieldChange(
                                  uniqueId,
                                  key,
                                  e.target.checked
                                )
                              }
                              style={{
                                width: 16,
                                height: 16,
                                cursor: disabled ? "not-allowed" : "pointer",
                                accentColor: "#3498db",
                              }}
                            />
                            {key}
                          </label>
                        );
                      } else if (inputFields.includes(key)) {
                        return (
                          <div key={key} style={commonBoxStyle}>
                            <span
                              style={{
                                fontWeight: 600,
                                marginBottom: 4,
                                color: disabled ? "#a0a0a0" : "#34495e",
                              }}
                            >
                              {key}
                            </span>
                            <input
                              type="text"
                              defaultValue={value || ""}
                              disabled={disabled}
                              onChange={(e) =>
                                handleFieldChange(uniqueId, key, e.target.value)
                              }
                              style={{
                                width: "100%",
                                padding: "5px 8px",
                                fontSize: 11,
                                borderRadius: 4,
                                border: "1px solid #ddd",
                                backgroundColor: disabled ? "#f2f2f2" : "#fff",
                                color: disabled ? "#a0a0a0" : "#2c3e50",
                                outline: "none",
                                transition: "border-color 0.2s",
                              }}
                              onFocus={(e) => {
                                if (!disabled)
                                  e.target.style.borderColor = "#3498db";
                              }}
                              onBlur={(e) => {
                                if (!disabled)
                                  e.target.style.borderColor = "#ddd";
                              }}
                            />
                          </div>
                        );
                      } else if (key === "tahmini_teslimat") {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const tahminiTeslim = value ? new Date(value) : null;
                        tahminiTeslim?.setHours(0, 0, 0, 0);

                        let bgColor = "";
                        if (tahminiTeslim) {
                          if (tahminiTeslim > today) bgColor = "lightgreen";
                          else if (tahminiTeslim.getTime() === today.getTime())
                            bgColor = "orange";
                          else bgColor = "red";
                        }

                        return (
                          <div
                            key={key}
                            style={{
                              ...commonBoxStyle,
                              backgroundColor: bgColor,
                            }}
                          >
                            <strong style={{ marginBottom: 4, fontSize: 11 }}>
                              {key}:
                            </strong>{" "}
                            <span>
                              {value
                                ? new Date(value).toLocaleDateString()
                                : ""}
                            </span>
                          </div>
                        );
                      } else if (key === "barkod" && value) {
                        return (
                          <div
                            key={key}
                            style={{
                              ...commonBoxStyle,
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <strong style={{ marginBottom: 8, fontSize: 11 }}>
                              {key}:
                            </strong>
                            <img
                              src={`data:image/png;base64,${value}`}
                              alt="Barkod"
                              style={{ maxWidth: 150, maxHeight: 50 }}
                            />
                          </div>
                        );
                      } else {
                        return (
                          <div key={key} style={commonBoxStyle}>
                            <strong style={{ marginBottom: 4, fontSize: 11 }}>
                              {key}:
                            </strong>{" "}
                            <span>{value?.toString() || ""}</span>
                          </div>
                        );
                      }
                    })}
                  </div>
                )}
              </Card>
                              )}
            </div>
            {/* <div style={{height:1, backgroundColor:'black', width:'100vw'}}></div> */}
          </div>
        );
      })}
    </Container>
  );
}

export default YeniImalat;

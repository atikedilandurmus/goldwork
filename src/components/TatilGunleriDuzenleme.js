import React, { useEffect, useState } from "react";
import { Container } from "react-bootstrap";

export default function HolidayAdmin() {
  const [holidays, setHolidays] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [desc, setDesc] = useState("");

  const fetchHolidays = () => {
    fetch("http://localhost:3000/holidays")
      .then((res) => res.json())
      .then(setHolidays)
      .catch(console.error);
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  const addHoliday = () => {
    if (!startDate || !endDate || !desc) {
      alert("Lütfen tüm alanları doldurun.");
      return;
    }

    // Eğer aralık ise tüm tarihleri ayrı ayrı eklemek isterseniz, backend desteklemeli.
    // Şimdilik sadece başlangıç tarihini gönderiyoruz, isterseniz ikisi arasında döngü yazılabilir.

    fetch("http://localhost:3000/holidays", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tatil_tarihi: startDate,
        endDate: endDate || null,
        aciklama: desc,
      }),
    })
      .then(() => {
        setStartDate("");
        setEndDate("");
        setDesc("");
        fetchHolidays();
      })
      .catch(console.error);
  };

  const deleteHoliday = (date) => {
    fetch(`http://localhost:3000/holidays/${date}`, { method: "DELETE" })
      .then(fetchHolidays)
      .catch(console.error);
  };

  return (
    <Container className="mt-4">
      <h5 className="custom-font-medium">Resmi Tatiller</h5>

      <div className="d-flex col gap-2" style={{ flexWrap: "wrap", gap: 1 }}>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          style={{
            padding: "5px 9px",
            textAlign: "center",
            cursor: "pointer",
            backgroundColor: "#f9fafb",
            borderRadius: 20,
            marginTop: 10,
            fontSize: 12,
            flex: 1,
          }}
          placeholder="Başlangıç Tarihi"
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          style={{
            padding: "5px 9px",
            textAlign: "center",
            cursor: "pointer",
            backgroundColor: "#f9fafb",
            borderRadius: 20,
            marginTop: 10,
            fontSize: 12,
            flex: 1,
          }}
          placeholder="Bitiş Tarihi"
        />

        <select
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          style={{
            padding: "5px 9px",
            cursor: "pointer",
            backgroundColor: "#f9fafb",
            borderRadius: 20,
            marginTop: 10,
            fontSize: 12,
            flex: 1,
            textAlign: "center",
          }}
        >
          <option value="">-- Tatil Seçiniz --</option>
          <option value="Kurban Bayramı">Kurban Bayramı</option>
          <option value="Ramazan Bayramı">Ramazan Bayramı</option>
        </select>

        <button
          onClick={addHoliday}
          style={{
            padding: "5px 9px",
            cursor: "pointer",
            backgroundColor: "#f9fafb",
            borderRadius: 20,
            marginTop: 10,
            fontSize: 12,
            flexBasis: "100px",
            fontWeight: "600",
          }}
        >
          Ekle
        </button>
      </div>

      <div
        style={{
          fontWeight: "500",
          fontSize: 11,
          textTransform: "uppercase",
          color: "#2c3e50",
          borderRadius: 20,
          marginTop: 20,
        }}
      >
        <ul style={{ padding: 0 }}>
          {holidays.map((holiday) => (
            <li
              key={holiday.tatil_tarihi}
              style={{
                padding: "6px",
                borderTop: "1px solid #ddd",
                borderLeft: "1px solid #ddd",
                textAlign: "center",
                cursor: "pointer",
                transition: "background-color 0.15s ease",
                display: "flex",
                backgroundColor: "#f9fafb",
                justifyContent: "space-between",
                alignItems: "center",
                borderRadius: 20,
                marginTop: 10,
              }}
            >
              {holiday.tatil_tarihi} / {holiday.aciklama}
              <button
                onClick={() => deleteHoliday(holiday.tatil_tarihi)}
                className="btn btn-ml "
                style={{
                  backgroundColor: "#ee6028",
                  fontSize: 10,
                  borderRadius: 20,
                }}
              >
                Sil
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Container>
  );
}

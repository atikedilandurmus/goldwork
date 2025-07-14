import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../AuthContext";
import axios from "axios";
import { Container, Table, Spinner, Form } from "react-bootstrap";

const booleanFields = ["is_checked", "stl", "dokum", "tamamlandi", "iptal"];
const inputFields = [
  "cila_gelis",
  "mihlama_giris",
  "mihlama_gelis",
  "tuy_giris",
  "tuy_gelis",
  "paketleme",
];

// Dropdown olacak alanlar
const dropdownFields = [
  "atolye_adi",
  "dokumcu",
  "cilaci",
  "mihlamaci",
  "tuycu",
];

// Gramaj input olacak alanlar
const gramFields = [
  "atolye_gram",
  "dokum_gram",
  "kocan_gram",
  "cila_gram",
  "mihlama_giris_gram",
  "mihlama_cikis_gram",
  "tuy_giris_gram",
  "tuy_cikis_gram",
];

export default function ImalatTakipTable() {
  const { currentUser } = useAuth();
  const [data, setData] = useState([]);
  const [allowedFields, setAllowedFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [atolyeler, setAtolyeler] = useState([]);

  const [dokumculer, setDokumculer] = useState([]);
  const [cilacilar, setCilacilar] = useState([]);
  const [mihlamacilar, setMihlamacilar] = useState([]);
  const [tuycular, setTuycular] = useState([]);
  const filterableFields = [
    "stl",
    "atolye_adi",
    "dokumcu",
    "cilaci",
    "mihlamaci",
    "tuycu",
    "imalat_durumu",
    "coklu",
  ];
  const imalatDurumuOptions = [
    ...booleanFields,
    ...inputFields,
    ...dropdownFields,
    ...gramFields,
  ];

  const [filters, setFilters] = useState({});

  // Seçilen filtreyi güncelle
  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };
  const filteredData = data.filter((row) => {
    // Eğer imalat_durumu alanı seçilmişse, o alanın true, dolu veya sıfırdan büyük olması gerekir
    const selectedDurum = filters.imalat_durumu;
    if (selectedDurum) {
      const val = row[selectedDurum];
      if (
        val === undefined ||
        val === null ||
        val === "" ||
        val === false ||
        val === 0
      ) {
        return false;
      }
    }

    // Diğer filtreler
    return Object.entries(filters).every(([field, selectedValue]) => {
      if (field === "imalat_durumu") return true;
      if (!selectedValue) return true;
      const val = row[field];
      return String(val) === selectedValue;
    });
  });

  useEffect(() => {
    const token = localStorage.getItem("token");

    async function fetchDropdownOptions() {
      try {
        const [resDokumcu, resCila, resMihlama, resTuy] = await Promise.all([
          axios.get("http://localhost:3000/api/dokum", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get("http://localhost:3000/api/cila", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get("http://localhost:3000/api/mihlama", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get("http://localhost:3000/api/tuy", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        setDokumculer(
          Array.isArray(resDokumcu.data)
            ? resDokumcu.data.map((item) => item.dokum_adi)
            : []
        );
        setCilacilar(
          Array.isArray(resCila.data)
            ? resCila.data.map((item) => item.cila_adi)
            : []
        );
        setMihlamacilar(
          Array.isArray(resMihlama.data)
            ? resMihlama.data.map((item) => item.mihlama_adi)
            : []
        );
        setTuycular(
          Array.isArray(resTuy.data)
            ? resTuy.data.map((item) => item.tuy_adi)
            : []
        );
      } catch (error) {
        console.error("Dropdown verileri alınamadı:", error);
      }
    }

    fetchDropdownOptions();
  }, []);
  function useDebounce(callback, delay) {
    const timeoutRef = useRef(null);

    function debouncedFunction(...args) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    }

    // Cleanup on unmount
    useEffect(() => {
      return () => clearTimeout(timeoutRef.current);
    }, []);

    return debouncedFunction;
  }

  // Kullanıcı izinlerini çek
  useEffect(() => {
    if (!currentUser) return;

    async function fetchPermissions() {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(
          `http://localhost:3000/api/user_permissions/${currentUser.id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const lowerFields = (res.data.allowedFields || []).map((f) =>
          f.toLowerCase()
        );
        setAllowedFields(lowerFields);
      } catch (err) {
        console.error("Yetki alma hatası:", err);
        setAllowedFields([]);
      }
    }

    fetchPermissions();
  }, [currentUser]);

  // Veri çek
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        const [resData, resAtolyeler] = await Promise.all([
          axios.get("http://localhost:3000/imalat_takip", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get("http://localhost:3000/api/atolye", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        setData(resData.data);
        setAtolyeler(resAtolyeler.data);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const isFieldDisabled = (field) => {
    if (!allowedFields || allowedFields.length === 0) return true;
    return !allowedFields.includes(field.toLowerCase());
  };

  // Backend'e güncelleme gönderen fonksiyon
const sendUpdate = async (uniqueId, updatedFields) => {
  const token = localStorage.getItem("token");
  try {
    await axios.patch(
      `http://localhost:3000/imalat_takip/${uniqueId}`,
      updatedFields,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log("📤 PATCH gönderiliyor:", updatedFields);
  } catch (error) {
    console.error("Güncelleme hatası:", error);
    alert("Güncelleme sırasında hata oluştu");
  }
};

  // Debounce edilmiş versiyonunu oluştur
  const debouncedSendUpdate = useDebounce(sendUpdate, 700);
const handleFieldChange = (uniqueId, field, value) => {
  const updatedRow = data.find((item) => item.unique_id === uniqueId);

  // Eğer cila ile ilgili gram alanlarından biri değişiyorsa,
  // diğeri ve cila_giris_gram'ı da ekle ki backend tam veri alsın
  const ekAlanlar = {};
  if (field === "cila_gram" || field === "kocan_gram" || field === "cila_giris_gram") {
    const cilaGiris = field === "cila_giris_gram" ? value : updatedRow?.cila_giris_gram;
    const cilaGram = field === "cila_gram" ? value : updatedRow?.cila_gram;
    const kocanGram = field === "kocan_gram" ? value : updatedRow?.kocan_gram;

    // Sadece dolu olanları ekle
    if (cilaGiris !== undefined && cilaGiris !== null && cilaGiris !== "") {
      ekAlanlar["cila_giris_gram"] = cilaGiris;
    }
    if (cilaGram !== undefined && cilaGram !== null && cilaGram !== "") {
      ekAlanlar["cila_gram"] = cilaGram;
    }
    if (kocanGram !== undefined && kocanGram !== null && kocanGram !== "") {
      ekAlanlar["kocan_gram"] = kocanGram;
    }
  }

  const guncelDegerler = { [field]: value, ...ekAlanlar };

  // null veya boş string olanları gönderme (isteğe bağlı, backend'in davranışına göre)
  const temizlenmis = {};
  for (const [key, val] of Object.entries(guncelDegerler)) {
    if (val !== null && val !== "") {
      temizlenmis[key] = val;
    }
  }

  // State güncelle
  setData((prev) =>
    prev.map((item) =>
      item.unique_id === uniqueId ? { ...item, ...temizlenmis } : item
    )
  );

  // Backend'e gönder
  debouncedSendUpdate(uniqueId, temizlenmis);
};

  if (loading)
    return (
      <div className="text-center mt-5">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  if (error)
    return <div className="text-center mt-5 text-danger">Hata: {error}</div>;

  if (!data.length) return <div>Gösterilecek veri yok.</div>;

  // STL sütunundan sonra gelecek özel kolonlar (küçük harf ile)
  const afterStlColumns = [
    "atolye_adi",
    "atolye_gram",
    "dokumcu",
    "dokum_gram",
    "cilaci",
    "kocan_gram",
    "cila_gram",
    "mihlamaci",
    "mihlama_giris_gram",
    "mihlama_cikis_gram",
    "tuycu",
    "tuy_giris_gram",
    "tuy_cikis_gram",
  ];

  const allKeys = Object.keys(data[0]).filter((k) => k !== "unique_id");
  const stlIndex = allKeys.indexOf("stl");

  let headers;
  if (stlIndex === -1) {
    headers = allKeys;
  } else {
    const beforeStl = allKeys.slice(0, stlIndex + 1);
    const lowerAfterStlCols = afterStlColumns.map((c) => c.toLowerCase());
    const remainingCols = allKeys.filter(
      (col) =>
        !beforeStl.includes(col) &&
        !lowerAfterStlCols.includes(col.toLowerCase())
    );
    const filteredAfterStlCols = afterStlColumns.filter((col) =>
      allKeys.some((k) => k.toLowerCase() === col.toLowerCase())
    );
    headers = [...beforeStl, ...filteredAfterStlCols, ...remainingCols];
  }



  return (
    <Container style={{ fontFamily: "Poppins, sans-serif" }}>
      <h5 style={{ marginBottom: 15, color: "#21274a" }}>
        İmalat Takip Tablosu
      </h5>
      
<Table hover responsive size="sm" className="table-rounded sticky-table">
        <thead>
          <tr>
            {headers.map((header) => {
              const formatHeader = (text) =>
                text
                  .split("_")
                  .map(
                    (word) =>
                      word.charAt(0).toUpperCase() + word.slice(1).toUpperCase()
                  )
                  .join(" ");

              return (
                <th
                  key={header}
                  style={{
                    width: header === "is_checked" ? 30 : undefined,
                    padding: "4px 6px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                      padding: 5,
                    }}
                  >
                    <span style={{ fontWeight: 500, color: "#666666" }}>
                      {formatHeader(header)}
                    </span>
                    {filterableFields.includes(header.toLowerCase()) && (
                      <Form.Select
                        className="select-arrow-only"
                        value={filters[header] || ""}
                        onChange={(e) =>
                          handleFilterChange(header, e.target.value)
                        }
                        style={{ fontSize: 10, paddingLeft: 5 }}
                      >
                        <option value="">Tümü</option>
                        {header === "imalat_durumu"
                          ? imalatDurumuOptions.map((field, i) => (
                              <option key={i} value={field}>
                                {field.replace(/_/g, " ").toUpperCase()}
                              </option>
                            ))
                          : [...new Set(data.map((row) => row[header]))]
                              .filter(
                                (val) =>
                                  val !== undefined &&
                                  val !== null &&
                                  val !== ""
                              )
                              .map((val, idx) => (
                                <option key={idx} value={val}>
                                  {typeof val === "boolean"
                                    ? val
                                      ? "✓ Evet"
                                      : "✗ Hayır"
                                    : val.toString()}
                                </option>
                              ))}
                      </Form.Select>
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {filteredData.map((row, rowIndex) => {
            const uniqueKey = row.unique_id || row.id || rowIndex;

            return (
              <tr key={uniqueKey}>
                {headers.map((field) => {
                  const value = row[field];
                  const disabled = isFieldDisabled(field);

                  if (booleanFields.includes(field)) {
                    return (
                      <td key={field} style={{ textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={!!value}
                          disabled={disabled}
                          onChange={(e) =>
                            handleFieldChange(
                              uniqueKey,
                              field,
                              e.target.checked
                            )
                          }
                          style={{
                            cursor: disabled ? "not-allowed" : "pointer",
                            color: "#000",
                          }}
                        />
                      </td>
                    );
                  }

                  if (dropdownFields.includes(field.toLowerCase())) {
                    let options = [];
                    switch (field.toLowerCase()) {
                      case "atolye_adi":
                        options = atolyeler.map(
                          (a) => a.atolye_adi || a.name || a.id
                        );
                        break;
                      case "dokumcu":
                        options = dokumculer;
                        break;
                      case "cilaci":
                        options = cilacilar;
                        break;
                      case "mihlamaci":
                        options = mihlamacilar;
                        break;
                      case "tuycu":
                        options = tuycular;
                        break;
                    }
                    return (
                      <td key={field}>
                        <select
                          disabled={disabled}
                          value={value || ""}
                          onChange={(e) =>
                            handleFieldChange(uniqueKey, field, e.target.value)
                          }
                          style={{
                            width: "100%",
                            fontSize: 12,
                            padding: 4,
                            boxSizing: "border-box",
                            backgroundColor: disabled ? "#f0f0f0" : "white",
                            border: "1px solid #ccc",
                            borderRadius: 4,
                          }}
                        >
                          <option value="">Seçiniz</option>
                          {options.map((opt, i) => (
                            <option key={i} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </td>
                    );
                  }

                  if (gramFields.includes(field.toLowerCase())) {
                    return (
                      <td key={field}>
                        <input
                          type="number"
                          step="0.01"
                          disabled={disabled}
                          value={value || ""}
                          onChange={(e) =>
                            handleFieldChange(uniqueKey, field, e.target.value)
                          }
                          style={{
                            width: "100%",
                            fontSize: 12,
                            padding: 4,
                            boxSizing: "border-box",
                            backgroundColor: disabled ? "#f0f0f0" : "white",
                            border: "1px solid #ccc",
                            borderRadius: 4,
                          }}
                        />
                      </td>
                    );
                  }

                  if (inputFields.includes(field)) {
                    return (
                      <td key={field}>
                        <input
                          type="text"
                          value={value || ""}
                          disabled={disabled}
                          onChange={(e) =>
                            handleFieldChange(uniqueKey, field, e.target.value)
                          }
                          style={{
                            width: "100%",
                            fontSize: 12,
                            padding: 4,
                            boxSizing: "border-box",
                            backgroundColor: disabled ? "#f0f0f0" : "white",
                            border: "1px solid #ccc",
                            borderRadius: 4,
                          }}
                        />
                      </td>
                    );
                  }

                  if (field === "tahmini_teslimat") {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const teslimDate = value ? new Date(value) : null;
                    let bgColor = "";
                    if (teslimDate) {
                      if (teslimDate > today) bgColor = "lightgreen";
                      else if (teslimDate.getTime() === today.getTime())
                        bgColor = "orange";
                      else bgColor = "red";
                    }
                    return (
                      <td
                        key={field}
                        style={{
                          backgroundColor: bgColor,
                          textAlign: "center",
                        }}
                      >
                        {value ? new Date(value).toLocaleDateString() : ""}
                      </td>
                    );
                  }

                  if (field === "barkod" && value) {
                    return (
                      <td key={field} style={{ textAlign: "center" }}>
                        <img
                          src={`data:image/png;base64,${value}`}
                          alt="Barkod"
                          style={{ maxWidth: 120, maxHeight: 40 }}
                        />
                      </td>
                    );
                  }

                  return <td key={field}>{value?.toString() || ""}</td>;
                })}
              </tr>
            );
          })}
        </tbody>
      </Table>
    </Container>
  );
}

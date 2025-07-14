import React, { useEffect, useState } from "react";
import {
  Container,
  Table,
  Form,
  Button,
  Spinner,
  Alert,
  Row,
  Col,
  Modal,
} from "react-bootstrap";
import axios from "axios";
import dayjs from "dayjs"; // Tarih formatı için dayjs kütüphanesi (npm i dayjs)
import { useAuth } from "../AuthContext";

const readonlyFields = ["has_bakiye_alacak", "dolar_bakiye_alacak"];

const numberFields = [
  "has_tezgah_isciligi",
  "dolar_tezgah_isciligi",
  "has_tuy_isciligi",
  "dolar_tuy_isciligi",
];

// DİKKAT: 'has_bakiye_verecek' ve 'dolar_bakiye_verecek' burada yok

const entities = [
  { label: "Atölye", field: "atolye_adi", api: "atolye" },
  { label: "Dökümcü", field: "dokum_adi", api: "dokum" },
  { label: "Mıhlamacı", field: "mihlama_adi", api: "mihlama" },
  { label: "Tüycü", field: "tuy_adi", api: "tuy" },
  { label: "Cilacı", field: "cila_adi", api: "cila" },
];

export default function AtolyeYonetimSayfasi() {
  const [currentEntity, setCurrentEntity] = useState(entities[0]);
  const [data, setData] = useState([]);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingRow, setSavingRow] = useState(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [defterDetay, setDefterDetay] = useState([]);
  const [detayLoading, setDetayLoading] = useState(false);
  const [showDetayModal, setShowDetayModal] = useState(false);
  const [verilecekAciklama, setVerilecekAciklama] = useState("");
  const { currentUser } = useAuth();

  const [islemYapan, setIslemYapan] = useState(currentUser?.email || "");

  // Verilecek miktarlar state'i (seçilen satır için)
  const [verilecekMiktarlar, setVerilecekMiktarlar] = useState({});

  useEffect(() => {
    fetchData();
    setSelectedId(null);
  }, [currentEntity]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `http://localhost:3000/api/${currentEntity.api}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setData(res.data);

      const baseForm = { [currentEntity.field]: "" };
      numberFields.forEach((f) => (baseForm[f] = ""));
      setFormData(baseForm);
      setError(null);
      setVerilecekMiktarlar({});
    } catch {
      setError("Veri alınamadı.");
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = async (id, field, value) => {
    setSavingRow(id);
    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        `http://localhost:3000/api/${currentEntity.api}/${id}`,
        { [field]: value },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setData((prev) =>
        prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
      );
    } catch {
      alert("Güncelleme sırasında hata oluştu.");
    } finally {
      setSavingRow(null);
    }
  };

  const handleVerilecekChange = (id, field, value) => {
    setVerilecekMiktarlar((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  };
const fetchDetaylar = async (entityId) => {
  setDetayLoading(true);
  setShowDetayModal(true);
  try {
    const token = localStorage.getItem("token");
    const res = await axios.get(
      `http://localhost:3000/api/${currentEntity.api}_defteri/${entityId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    setDefterDetay(res.data);
  } catch (err) {
    setDefterDetay([]);
    alert("Detaylar yüklenirken hata oluştu.");
  } finally {
    setDetayLoading(false);
  }
};

  const parseDecimal = (val) => {
    if (!val) return 0;
    return parseFloat(val.replace(",", "."));
  };

  const handleVerilecekKaydet = async (id) => {
    const miktarlar = verilecekMiktarlar[id];
    if (!miktarlar) return;

    const satir = data.find((r) => r.id === id);
    if (!satir) return;

    const hasVerilecek = parseDecimal(miktarlar.has_bakiye_verecek);
    const dolarVerilecek = parseDecimal(miktarlar.dolar_bakiye_verecek);

    if (hasVerilecek <= 0 && dolarVerilecek <= 0) {
      alert("En az bir pozitif miktar girin.");
      return;
    }

    const mevcutHas = parseFloat(satir.has_bakiye_alacak) || 0;
    const mevcutDolar = parseFloat(satir.dolar_bakiye_alacak) || 0;

    if (hasVerilecek > mevcutHas) {
      alert("Has miktarı mevcut bakiyeden büyük olamaz.");
      return;
    }

    if (dolarVerilecek > mevcutDolar) {
      alert("Dolar miktarı mevcut bakiyeden büyük olamaz.");
      return;
    }

    const payload = {
      tarih: new Date().toISOString().split("T")[0],
      islem_turu: "verecek",
      has_miktar: hasVerilecek,
      dolar_miktar: dolarVerilecek,
      aciklama: verilecekAciklama.trim() || "Bakiye düşüldü",
      islem_yapan: islemYapan.trim(),
    };

    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `http://localhost:3000/api/atolye_defteri/${id}`,
        payload,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      await fetchData();
      setSuccess("Bakiye işlemi deftere kaydedildi.");
      setVerilecekMiktarlar((prev) => ({ ...prev, [id]: {} }));
    } catch (err) {
      alert(
        "Bakiye işlemi başarısız: " + (err.response?.data?.error || err.message)
      );
    }
  };

  useEffect(() => {
  setVerilecekAciklama("");
}, [selectedId]);


  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  
  const handleAdd = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!formData[currentEntity.field]?.trim()) {
      setError("İsim alanı zorunludur.");
      return;
    }

    setAdding(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `http://localhost:3000/api/${currentEntity.api}`,
        {
          ...formData,
          ...numberFields.reduce(
            (acc, f) => ({
              ...acc,
              [f]: Number(formData[f]) || 0,
            }),
            {}
          ),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setData((prev) => [...prev, res.data]);
      const resetForm = { [currentEntity.field]: "" };
      numberFields.forEach((f) => (resetForm[f] = ""));
      setFormData(resetForm);
      setSuccess("Başarıyla eklendi.");
      setShowModal(false); // Modal'ı kapat
    } catch {
      setError("Ekleme sırasında hata oluştu.");
    } finally {
      setAdding(false);
    }
  };

  const tableHeaders =
    data.length > 0
      ? Object.keys(data[0]).filter(
          (k) =>
            k !== "id" &&
            k !== "has_bakiye_verecek" &&
            k !== "dolar_bakiye_verecek"
        )
      : [];

  if (loading) return <Spinner animation="border" className="mt-3" />;

  return (
    <Container style={{fontFamily: "Poppins, sans-serif"}}>
      <div className="d-flex col align-items-center mb-3 justify-content-between">
        <h5 style={{ color: "#21274a", fontSize: 16 }}>Atölye Yönetimi</h5>
        <Button
          style={{
            backgroundColor: "#21274a",
            fontSize: 11,
            color: "white",
            border: "none",
            padding: "5px 15px",
          }}
          onClick={() => setShowModal(true)}
        >
          + Yeni {currentEntity.label} Ekle
        </Button>
      </div>

      <Form.Select
        className="mb-3"
        onChange={(e) => setCurrentEntity(entities[e.target.selectedIndex])}
        value={currentEntity.label}
      >
        {entities.map((e) => (
          <option key={e.api} value={e.label}>
            {e.label}
          </option>
        ))}
      </Form.Select>

      {error && (
        <Alert variant="danger" style={{ fontSize: 11 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert variant="success" style={{ fontSize: 11 }}>
          {success}
        </Alert>
      )}

      <Table striped hover responsive size="sm" className="custom-table">
        <thead>
          <tr>
{tableHeaders.map((header) => {
  let label;

  if (header === "has_bakiye_alacak") {
    label = "HAS TOPLAM";
  } else if (header === "dolar_bakiye_alacak") {
    label = "DOLAR TOPLAM";
  } else {
    label = header.replace(/_/g, " ").toUpperCase();
  }

  return <th key={header}>{label}</th>;
})}


          </tr>
        </thead>

        <tbody>
          {data.map((row) => {
            const isSelected = selectedId === row.id;
            return (
              <tr
                key={row.id}
                className={isSelected ? "selected-row" : ""}
                style={{
                  cursor: "pointer",
                  backgroundColor: isSelected ? "#d1e7dd" : undefined,
                }}
                onClick={() =>
                  setSelectedId(row.id === selectedId ? null : row.id)
                }
              >
                {tableHeaders.map((field) => {
                  const val = row[field];
                  if (readonlyFields.includes(field)) {
                    return (
                      <td key={field} style={{ backgroundColor: "#e9ecef" }}>
                        {isNaN(Number(val)) ? "0.00" : Number(val).toFixed(2)}
                      </td>
                    );
                  } else {
                    return (
                      <td key={field} className="readonly-cell">
                        <Form.Control
                          type="text"
                          size="sm"
                          value={val ?? ""}
                          onChange={(e) =>
                            handleFieldChange(row.id, field, e.target.value)
                          }
                          onClick={(e) => e.stopPropagation()}
                          disabled={savingRow === row.id}
                        />
                      </td>
                    );
                  }
                })}
                <td>
                  <Button
                    size="sm"
                    variant="info"
                    style={{
                      backgroundColor: "#21274a",
                      fontSize: 11,
                      color: "white",
                      border: "none",
                      padding: "5px 15px",
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      fetchDetaylar(row.id);
                    }}
                  >
                    Detaylar
                  </Button>
                </td>
                {/* Kaydet butonu kaldırıldı */}
              </tr>
            );
          })}
        </tbody>
      </Table>

      {selectedId &&
        (() => {
          const selectedRow = data.find((r) => r.id === selectedId);
          if (!selectedRow) return null;

          const hasVerilecek =
            verilecekMiktarlar[selectedId]?.has_bakiye_verecek || "";
          const dolarVerilecek =
            verilecekMiktarlar[selectedId]?.dolar_bakiye_verecek || "";

          const handleChangeHas = (e) => {
            handleVerilecekChange(
              selectedId,
              "has_bakiye_verecek",
              e.target.value
            );
          };
          const handleChangeDolar = (e) => {
            handleVerilecekChange(
              selectedId,
              "dolar_bakiye_verecek",
              e.target.value
            );
          };

          const onSave = () => handleVerilecekKaydet(selectedId);

          return (
            <Form
              className="verilecek-form"
              style={{
                marginTop: 20,
                padding: 15,
                border: "1px solid #ddd",
                fontSize: 12,
              }}
              onSubmit={(e) => {
                e.preventDefault();
                onSave();
              }}
            >
              <h6>
                {selectedRow[currentEntity.field] || ""} - Verilecek Miktar Gir
                (Has ve Dolar)
              </h6>
              <Form.Group as={Row} className="mb-2" controlId="hasVerilecek">
                <Form.Label column sm={2}>
                  Has Bakiye Verecek
                </Form.Label>
                <Col sm={4}>
                  <Form.Control
                    type="number"
                    step="0.01"
                    value={hasVerilecek}
                    onChange={handleChangeHas}
                    style={{ fontSize: 11 }}
                  />
                  <Form.Text>
                    Mevcut:{" "}
                    {(parseFloat(selectedRow.has_bakiye_alacak) || 0).toFixed(
                      2
                    )}
                  </Form.Text>
                </Col>
              </Form.Group>

              <Form.Group as={Row} className="mb-2" controlId="dolarVerilecek">
                <Form.Label column sm={2}>
                  Dolar Bakiye Verecek
                </Form.Label>
                <Col sm={4}>
                  <Form.Control
                    type="number"
                    step="0.01"
                    value={dolarVerilecek}
                    style={{ fontSize: 11 }}
                    onChange={handleChangeDolar}
                  />
                  <Form.Text>
                    Mevcut:{" "}
                    {(parseFloat(selectedRow.dolar_bakiye_alacak) || 0).toFixed(
                      2
                    )}
                  </Form.Text>
                </Col>
              </Form.Group>
              <Form.Group
                as={Row}
                className="mb-2"
                controlId="verilecekAciklama"
              >
                <Form.Label column sm={2}>
                  Açıklama
                </Form.Label>
                <Col sm={4}>
                  <Form.Control
                    type="text"
                    value={verilecekAciklama}
                    onChange={(e) => setVerilecekAciklama(e.target.value)}
                    placeholder="Açıklama giriniz"
                    style={{ fontSize: 11 }}
                    required
                  />
                </Col>
              </Form.Group>

              <Form.Group as={Row} className="mb-2" controlId="islemYapan">
                <Form.Label column sm={2}>
                  İşlemi Yapan
                </Form.Label>
                <Col sm={4}>
                  <Form.Control
                    type="text"
                    value={islemYapan}
                    onChange={(e) => setIslemYapan(e.target.value)}
                    placeholder="İşlemi yapan kişinin adı"
                    style={{ fontSize: 11 }}
                    readOnly
                  />
                </Col>
              </Form.Group>

              <Button
                type="submit"
                style={{
                  backgroundColor: "#ee6028",
                  border: "none",
                  fontSize: 12,
                }}
                disabled={savingRow === selectedId}
              >
                {savingRow === selectedId ? "Kaydediliyor..." : "Kaydet"}
              </Button>
            </Form>
          );
        })()}

      <Modal
       style={{fontFamily: "Poppins, sans-serif"}}
        show={showModal}
        onHide={() => {
          setShowModal(false);
          const resetForm = { [currentEntity.field]: "" };
          numberFields.forEach((f) => (resetForm[f] = ""));
          setFormData(resetForm);
        }}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title style={{ color: "#21274a", fontSize: 16 }}>Yeni {currentEntity.label} Ekle</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleAdd} className="entity-form">
            <Form.Group className="mb-2" style={{ fontSize: 13 }}>
              <Form.Label>{currentEntity.label} Adı</Form.Label>
              <Form.Control
                type="text"
                name={currentEntity.field}
                value={formData[currentEntity.field] || ""}
                onChange={handleFormChange}
                required
              />
            </Form.Group>

            {numberFields.map((field) => (
              <Form.Group className="mb-2" key={field} style={{ fontSize: 13 }}>
                <Form.Label>
                  {field.replace(/_/g, " ").toUpperCase()}
                </Form.Label>
                <Form.Control
                  type="number"
                  step="0.01"
                  name={field}
                  value={formData[field]}
                  onChange={handleFormChange}
                />
              </Form.Group>
            ))}

            <div className="d-flex justify-content-end">
              <Button
                type="submit"
                disabled={adding}
                style={{
                  backgroundColor: "#ee6028",
                  fontSize: 13,
                  border: "none",
                }}
              >
                {adding ? "Ekleniyor..." : "Ekle"}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
      <Modal
        show={showDetayModal}
        onHide={() => setShowDetayModal(false)}
        size="lg"
         style={{fontFamily: "Poppins, sans-serif"}}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title style={{ color: "#21274a", fontSize: 16 }}>İşlem Geçmişi</Modal.Title>
        </Modal.Header>
        <Modal.Body
          style={{ maxHeight: "60vh", overflowY: "auto", padding: "1rem", fontSize:12 }}
        >
          {detayLoading ? (
            <div className="d-flex justify-content-center">
              <Spinner animation="border" />
            </div>
          ) : defterDetay.length === 0 ? (
            <p>Herhangi bir işlem bulunamadı.</p>
          ) : (
            <div>
              {defterDetay.map((item, i) => (
                <div
                  key={i}
                  style={{
                    border: "1px solid #ddd",
                    borderRadius: 8,
                    padding: "12px 16px",
                    marginBottom: 12,
                    boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
                    backgroundColor: "#fff",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 6,
                    }}
                  >
                    <strong style={{ color: "#21274a" }}>
                      {new Date(item.tarih).toLocaleDateString("tr-TR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </strong>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 12,
                        color: "white",
                        fontSize: 12,
                        textTransform: "capitalize",
                        backgroundColor:
                          item.islem_turu === "verecek"
                            ? "#28a745"
                            : item.islem_turu === "alacak"
                            ? "#dc3545"
                            : "#6c757d",
                      }}
                    >
                      {item.islem_turu}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 20,
                      marginBottom: 6,
                      fontWeight: "600",
                    }}
                  >
                    <div>
                      Has Miktar:{" "}
                      <span style={{ float: "right" }}>
                        {Number(item.bakiye_has).toFixed(2)}
                      </span>
                    </div>
                    <div>
                      Dolar Miktar:{" "}
                      <span style={{ float: "right" }}>
                        {Number(item.bakiye_dolar).toFixed(2)}
                      </span>
                    </div>
                  </div>
<div className="d-flex col justify-content-between align-items-center">
                  <div style={{ whiteSpace: "pre-wrap", color: "#555", fontSize:11 }}>
                    {item.aciklama}
                  </div>
                  <div style={{ whiteSpace: "pre-wrap", color: "#555", fontSize:11 }}>
                    {item.islem_yapan}
                  </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal.Body>
      </Modal>
    </Container>
  );
}

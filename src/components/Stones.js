import React, { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { FaGem, FaTh, FaList, FaArrowDown, FaArrowUp } from "react-icons/fa";
import { Container } from "react-bootstrap";

const Stones = () => {
  const [stones, setStones] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    stok_kodu: "",
    stok_adi: "",
    olcusu: "",
    sekli: "",
    rengi: "",
    tas_cinsi: "",
    aciklama: "",
    grami: "",
    stok_adeti: "",
    stok_grami: "",
    mihlama_cinsi: "",
    mihlama_grami: "",
  });
  const [viewMode, setViewMode] = useState("card"); // "card" veya "list"
  const [sortOrder, setSortOrder] = useState("asc"); // "asc" | "desc" | null
  const sortStones = (order) => {
    const sorted = [...stones].sort((a, b) => {
      const gramA = parseFloat(a.olcusu) || 0;
      const gramB = parseFloat(b.olcusu) || 0;
      return order === "asc" ? gramA - gramB : gramB - gramA;
    });

    setStones(sorted);
    setSortOrder(order);
  };

  const generateStokKodu = () => {
    if (stones.length === 0) return "TYM-0001";
    const last = [...stones].sort(
      (a, b) =>
        parseInt(b.stok_kodu.split("-")[1]) -
        parseInt(a.stok_kodu.split("-")[1])
    )[0];
    const nextNum = parseInt(last.stok_kodu.split("-")[1]) + 1;
    return `TYM-${String(nextNum).padStart(4, "0")}`;
  };

  const openModal = () => {
    setFormData({
      stok_kodu: "",
      stok_adi: "",
      olcusu: "",
      sekli: "",
      rengi: "",
      tas_cinsi: "",
      aciklama: "",
      grami: "",
      stok_adeti: "",
      stok_grami: "",
      mihlama_cinsi: "",
      mihlama_grami: "",
    });
    setShowModal(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const updatedData = { ...formData, [name]: value };

    // Otomatik stok kodu oluşturma
    const { olcusu, sekli, rengi, tas_cinsi } = updatedData;
    if (olcusu && sekli && rengi && tas_cinsi) {
      updatedData.stok_kodu = `TYM-${olcusu}-${sekli}-${rengi}-${tas_cinsi}`;
    }

    setFormData(updatedData);
  };

  const sanitizeFormData = (data) => {
    const cleaned = { ...data };
    ["grami", "stok_adeti", "stok_grami", "mihlama_grami"].forEach((key) => {
      cleaned[key] = cleaned[key] === "" ? null : Number(cleaned[key]);
    });
    return cleaned;
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanedData = sanitizeFormData(formData);

    try {
      const res = await fetch("http://localhost:3000/taslar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cleanedData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Taş eklenemedi");
      }

      const added = await res.json();
      setStones((prev) => [...prev, added]);
      setShowModal(false);
    } catch (err) {
      console.error("Hata:", err);
      alert(`Hata: ${err.message}`);
    }
  };

  useEffect(() => {
    async function fetchStones() {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("http://localhost:3000/taslar", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) throw new Error("Taşlar yüklenemedi");
        const data = await res.json();
        setStones(data);
      } catch (error) {
        console.error("Taşlar yüklenirken hata:", error);
      }
    }
    fetchStones();
  }, []);

  return (
      <Container style={{ fontFamily: "Poppins, sans-serif", }}>

      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5
          className="card-title mb-0"
          style={{ color: "#21274a", fontSize: 16 }}
        >
          Taş Listesi
        </h5>{" "}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            className={`btn btn-sm ${
              sortOrder === "asc" ? "btn-secondary" : "btn-outline-secondary"
            }`}
            onClick={() => sortStones("asc")}
          >
            <FaArrowUp />
          </button>
          <button
            className={`btn btn-sm ${
              sortOrder === "desc" ? "btn-secondary" : "btn-outline-secondary"
            }`}
            onClick={() => sortStones("desc")}
          >
            <FaArrowDown />
          </button>
          <button
            className={`btn btn-sm ${
              viewMode === "card" ? "btn-secondary" : "btn-outline-secondary"
            }`}
            onClick={() => setViewMode("card")}
            title="Kart Görünüm"
          >
            <FaTh />
          </button>
          <button
            className={`btn btn-sm ${
              viewMode === "list" ? "btn-secondary" : "btn-outline-secondary"
            }`}
            onClick={() => setViewMode("list")}
            title="Liste Görünüm"
          >
            <FaList />
          </button>
          <button
            className="btn btn-sm "
            style={{ backgroundColor: "#21274a", fontSize: 11 ,color:'white'}}
            onClick={openModal}
          >
            + Yeni Taş Ekle
          </button>
        </div>
      </div>

      {viewMode === "card" ? (
        <div className="container-fluid" style={{padding:0}}>
          <div className="row g-3">
            {stones.map((stone, i) => (
              <div className="col-12 col-sm-6 col-md-4 col-lg-3" key={i}>
                <div className="card shadow-sm border-0 rounded-4">
                  <div className="card-body p-3 custom-font-small">
                    <div className="d-flex align-items-center mb-1">
                      <FaGem color="#6f42c1" size={14} className="me-2" />
                      <span className="mb-0 custom-font-medium">
                        {stone.stok_adi || "Taş Adı Yok"}
                      </span>
                    </div>
                    <small className="text-muted fs-7">{stone.stok_kodu}</small>
                    <hr style={{ marginBlock: 8 }} />
                    <ul className="list-unstyled mb-0 custom-font-small">
                      <li>
                        <strong>Ölçü:</strong> {stone.olcusu}
                      </li>
                      <li>
                        <strong>Şekil:</strong> {stone.sekli}
                      </li>
                      <li>
                        <strong>Renk:</strong> {stone.rengi}
                      </li>
                      <li>
                        <strong>Taş Cinsi:</strong> {stone.tas_cinsi}
                      </li>
                      <li>
                        <strong>Açıklama:</strong> {stone.aciklama}
                      </li>
                      <li>
                        <strong>Gram:</strong> {stone.grami} g
                      </li>
                      <li>
                        <strong>Stok Adet:</strong> {stone.stok_adeti}
                      </li>
                      <li>
                        <strong>Stok Gram:</strong> {stone.stok_grami}
                      </li>
                      <li>
                        <strong>Mıhlama Cinsi:</strong> {stone.mihlama_cinsi}
                      </li>
                      <li>
                        <strong>Mıhlama Gramı:</strong> {stone.mihlama_grami} g
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="table-modern-wrapper">
          <div className="table-modern">
            <div
              className="table-modern-header bg-light rounded-top px-2 py-2"
              style={{ fontSize: 11, fontWeight: 600 }}
            >
              <div>Stok Kodu</div>
              <div>Stok Adı</div>
              <div>Ölçüsü</div>
              <div>Şekli</div>
              <div>Rengi</div>
              <div>Taş Cinsi</div>
              <div>Açıklama</div>
              <div>Gramı</div>
              <div>Stok Adeti</div>
              <div>Stok Gramı</div>
              <div>Mıhlama Cinsi</div>
              <div>Mıhlama Gramı</div>
            </div>

            {stones.map((stone, i) => (
              <div
                className="table-modern-row px-2 py-2 border-bottom"
                key={i}
                style={{ fontSize: 10 }}
              >
                <div>{stone.stok_kodu}</div>
                <div>{stone.stok_adi}</div>
                <div>{stone.olcusu}</div>
                <div>{stone.sekli}</div>
                <div>{stone.rengi}</div>
                <div>{stone.tas_cinsi}</div>
                <div>{stone.aciklama}</div>
                <div>{stone.grami}</div>
                <div>{stone.stok_adeti}</div>
                <div>{stone.stok_grami}</div>
                <div>{stone.mihlama_cinsi}</div>
                <div>{stone.mihlama_grami}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showModal && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content shadow-lg border-0 rounded-4">
              <form onSubmit={handleSubmit}>
                <div className="modal-header border-0 mt-3 px-4">
                  <h5 className="modal-title fw-bold" style={{ fontSize: 15 }}>
                    💎 Yeni Taş Ekle
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowModal(false)}
                  ></button>
                </div>

                <div className="modal-body row g-2 px-4 pb-0">
                  {[
                    "stok_kodu",
                    "stok_adi",
                    "olcusu",
                    "sekli",
                    "rengi",
                    "tas_cinsi",
                    "aciklama",
                    "grami",
                    "stok_adeti",
                    "stok_grami",
                    "mihlama_cinsi",
                    "mihlama_grami",
                  ].map((name) => {
                    const label = name.replace(/_/g, " ").toUpperCase();
                    return (
                      <div className="col-md-6" key={name}>
                        <div className="form-floating">
                          <input
                            type="text"
                            className="form-control rounded-3"
                            id={name}
                            name={name}
                            placeholder={label}
                            value={formData[name]}
                            onChange={handleChange}
                            disabled={name === "stok_kodu"}
                            style={{ fontSize: 13 }}
                          />
                          <label htmlFor={name} style={{ fontSize: 13 }}>
                            {label}
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="modal-footer border-0 p-4">
                  <button
                    type="button"
                    className="btn btn-outline-secondary rounded-pill px-4"
                    style={{ fontSize: 12 }}
                    onClick={() => setShowModal(false)}
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    className="btn rounded-pill px-4"
                    style={{ backgroundColor: "#ee6028",color:'white', fontSize: 11 }}
                  >
                    Kaydet
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </Container>
  );
};

export default Stones;

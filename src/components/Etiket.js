import React, { useEffect, useState } from "react";
import { Container } from "react-bootstrap";

export default function EtiketBasmaSayfasi() {
  const [rows, setRows] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  useEffect(() => {
    document.title = "Etiket";
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");

    fetch("http://localhost:3000/imalat_takip", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        const tamamlanan = data.filter((item) => item.tamamlandi === true);
        setRows(tamamlanan);
      });

    fetch("http://localhost:3000/products", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setProducts(data));
  }, []);

  const toggleSelect = (item) => {
    setSelectedItems((prev) => {
      const exists = prev.find((x) => x.unique_id === item.unique_id);
      return exists
        ? prev.filter((x) => x.unique_id !== item.unique_id)
        : [...prev, item];
    });
  };

const handleYazdir = () => {
  selectedItems.forEach((item) => {
    fetch(`http://localhost:3000/imalat_takip/${item.unique_id}/etiket_basilma`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({
        etiket_basilma_tarihi: new Date().toISOString(),
      }),
    });
  });

  window.print();
};

  const getStones = (urun_kodu) => {
    const product = products.find((p) => p.sku_kodu === urun_kodu);
    return product?.stones || [];
  };

  return (
        <Container style={{ fontFamily: "Poppins, sans-serif",}}>
        <h5
          className="card-title mb-3"
          style={{ color: "#21274a", fontSize: 16 }}
        >
         Etiket Basım
        </h5>
      <div className="row">
        <div className="col-md-4">
          <ul className="list-group">
      {rows.map((item) => {
        const isSelected = selectedItems.some(
          (i) => i.unique_id === item.unique_id
        );
        return (
          <li
            key={item.unique_id}
            className={`list-group-item d-flex justify-content-between align-items-center mb-2 custom-font-medium list-group-item-action ${isSelected ? "active" : ""}`}
            onClick={() => toggleSelect(item)}
            style={{ cursor: "pointer" }}
          >
            <div className="fw-semibold d-flex row gap-2">
              <span className="me-0 text-muted custom-font-small">{item.musteri_adi} {item.sira_no}</span>
              <span className="me-2" style={{color: '#21274a'}}>{item.urun_adi}</span>
              <span className="text-secondary ext-muted custom-font-small">
                {new Date(item.tarih).toLocaleDateString("tr-TR")}
              </span>
            </div>
            {item.etiket_basilma_tarihi && (
              <span className="badge bg-success">Basıldı</span>
            )}
          </li>
        );
      })}
    </ul>
        </div>

        <div className="col-md-8">
          {selectedItems.length > 0 && (
            <>
              <button
                className="btn btn-sm mb-3"
                style={{
                  backgroundColor: "#535879",
                  fontSize: 11,
                  color: "white",
                  border: "none",
                  padding: "7px 15px",
                }}
                onClick={handleYazdir}
              >
                Seçilenleri Yazdır
              </button>

              <div className="etiket-container">
                {selectedItems.map((selected) => {
                  const stones = getStones(selected.urun_kodu);
                  return (
                    <div className="etiket" key={selected.unique_id}>
<table className="table table-bordered" style={{ tableLayout: "fixed", width: "100%" }}>
                        <tbody>
                          {/* 1. Satır */}
                          <tr>
                            <td
                              rowSpan="3"
                              colSpan="2"
                              style={{ verticalAlign: "top" }}
                            >
                              <img
                                src={selected.fotograf}
                                alt="foto"
  style={{ width: "100%", height: "auto", maxHeight: "100px", objectFit: "contain" }}
                              />
                            </td>
                            <td colSpan="2">{selected.sira_no}</td>
                            <td colSpan="2">{selected.tarih}</td>
                          </tr>

                          {/* 2. Satır */}
                          <tr>
                            <td colSpan="3">{selected.musteri_adi}</td>
                            <td colSpan="1">{selected.magazasi}</td>
                          </tr>

                          {/* 3. Satır */}
                          <tr>
                            <td colSpan="2"></td>
                            <td colSpan="2">{selected.kargo}</td>
                          </tr>

                          {/* 4. Satır (Açıklama + Taşlar) */}
                          <tr>
                            <td colSpan="3">{selected.aciklama}</td>
                            <td colSpan="3">
                              Taşlar:
                              {stones.length > 0 ? (
                                <ul
                                  className="m-0 p-0"
                                  style={{ listStyle: "none" }}
                                >
                                  {stones.map((tas, i) => (
                                    <li key={i}>
                                      {tas.stone_type
                                        ? `${tas.stone_type} - `
                                        : ""}
                                      {tas.stone_sekli}, {tas.olcusu},{" "}
                                      {tas.adet} adet
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <span> Taş bilgisi yok</span>
                              )}
                            </td>
                          </tr>

                          {/* 5. Satır (Ürün bilgileri) */}
                          <tr>
                            <td colSpan="2">{selected.urun_kodu}</td>
                            <td colSpan="1">{selected.olcusu}</td>
                            <td colSpan="1">{selected.ayari}</td>
                            <td colSpan="2">{selected.color}</td>
                          </tr>

                          {/* 6. Satır (Kişiselleştirme, Sipariş Kodu, Barkod) */}
                          <tr>
                            <td colSpan="2">{selected.kisellestirme}</td>
                            <td colSpan="2">{selected.siparis_kodu}</td>
                            <td colSpan="2">
                              {selected.barkod && (
                                <img
                                  src={`data:image/png;base64,${selected.barkod}`}
                                  alt="Barkod"
                                  style={{ maxWidth: "90px", marginTop: "5px" }}
                                />
                              )}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </Container>
  );
}

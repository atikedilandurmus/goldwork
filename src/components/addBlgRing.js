import React, { useEffect, useState } from "react";
import axios from "axios";
import { Button, Container, Modal } from "react-bootstrap";

export default function ProductManager() {
  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState({
    sku_kodu: "",
    fotograf: "",
    tip: "",
    adi: "",
    magaza: "",
    karati: "",
    grami: "",
    genislik: "",
    uzunluk: "",
    kalinlik: "",
    kol_olcusu: "",
    tas_agirligi: "",
    stones: [],
  });

  const [stoneInput, setStoneInput] = useState({
    stone_measurement_id: "",
    adet: "",
  });
  const [stonesList, setStonesList] = useState([]);
  const [stoneSizes, setStoneSizes] = useState([]);
  const [selectedStoneId, setSelectedStoneId] = useState("");
  const [stoneTypes, setStoneTypes] = useState([]);
  const [selectedStoneTypeId, setSelectedStoneTypeId] = useState("");

  const [isEditMode, setIsEditMode] = useState(false);
const [editingProductId, setEditingProductId] = useState(null);

const handleEdit = (product) => {
  setFormData({
    ...product,
    fotograf: "", // Fotoğraf yeniden seçilecekse temizlenir
  });
  setIsEditMode(true);
  setEditingProductId(product.id);
  setShow(true);
};
const handleSubmit = async (e) => {
  e.preventDefault();
  try {
    const token = localStorage.getItem("token");

      await axios.post("http://localhost:3000/products", formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

    fetchProducts();
    setFormData({
      sku_kodu: "",
      fotograf: "",
      tip: "",
      adi: "",
      magaza: "",
      karati: "",
      grami: "",
      genislik: "",
      uzunluk: "",
      kalinlik: "",
      kol_olcusu: "",
      tas_agirligi: "",
      stones: [],
    });
    setIsEditMode(false);
    setEditingProductId(null);
    setShow(false);
  } catch (err) {
    console.error(err);
    alert("❌ Hata oluştu");
  }
};

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("http://localhost:3000/products", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProducts(res.data);
    } catch (err) {
      console.error("Error fetching products:", err);
    }
  };

  useEffect(() => {
    const fetchStones = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("http://localhost:3000/stones", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setStonesList(res.data);
      } catch (err) {
        console.error("Taşlar yüklenemedi:", err);
      }
    };

    fetchStones();
  }, []);

  useEffect(() => {
    const fetchStoneTypes = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("http://localhost:3000/stones_types", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setStoneTypes(res.data);
      } catch (err) {
        console.error("Taş cinsleri yüklenemedi:", err);
      }
    };
    fetchStoneTypes();
  }, []);

  useEffect(() => {
    if (selectedStoneId) {
      const fetchSizes = async () => {
        try {
          const token = localStorage.getItem("token");
          const res = await axios.get(
            `http://localhost:3000/stone-sizes/${selectedStoneId}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          setStoneSizes(res.data);
        } catch (err) {
          console.error("Ölçüler yüklenemedi:", err);
        }
      };

      fetchSizes();
    } else {
      setStoneSizes([]);
    }
  }, [selectedStoneId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };


  const [show, setShow] = useState(false);

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  return (
        <Container style={{ fontFamily: "Poppins, sans-serif" }}>
    
      <Modal show={show} onHide={handleClose} dialogClassName="modal-90w">
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: 14 }}>Ürün Ekle</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <form onSubmit={handleSubmit} className="row g-4 p-4 rounded">
            {Object.keys(formData)
              .filter((key) => key !== "stones")
              .map((key) => (
                <div key={key} className="col-md-3">
                  <div className="mb-3">
                    <label className="form-label" style={{ fontSize: 14 }}>
                      {key.replace(/_/g, " ").toUpperCase()}
                    </label>

                    {key === "fotograf" ? (
                      <input
                        type="file"
                        name={key}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            [key]: e.target.files[0],
                          })
                        }
                        className="form-control"
                        style={{ fontSize: 13 }}
                      />
                    ) : (
                      <input
                        type="text"
                        name={key}
                        value={formData[key]}
                        onChange={handleChange}
                        className="form-control"
                        style={{ fontSize: 13 }}
                      />
                    )}
                  </div>
                </div>
              ))}

            {/* Taş Ekleme Alanı */}
            <div className="col-12 border p-3 rounded bg-light">
              <h5
                className="fw-bold mb-3 border-bottom pb-2"
                style={{ fontSize: 14 }}
              >
                💎 Taş Ekle
              </h5>
              <div className="row g-3">
                {/* Taş Şekli */}
                <div className="col-md-6">
                  <label className="form-label" style={{ fontSize: 13 }}>
                    Taş Şekli
                  </label>
                  <select
                    value={selectedStoneId}
                    onChange={(e) => {
                      setSelectedStoneId(e.target.value);
                      setStoneInput((prev) => ({
                        ...prev,
                        stone_measurement_id: "",
                      }));
                    }}
                    className="form-select"
                    style={{ fontSize: 13 }}
                  >
                    <option value="">Seçiniz</option>
                    {stonesList.map((stone) => (
                      <option key={stone.id} value={stone.id}>
                        {stone.sekli}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Taş Ölçüsü */}
                <div className="col-md-6">
                  <label className="form-label" style={{ fontSize: 13 }}>
                    Taş Ölçüsü
                  </label>
                  <select
                    value={stoneInput.stone_measurement_id}
                    onChange={(e) =>
                      setStoneInput({
                        ...stoneInput,
                        stone_measurement_id: e.target.value,
                      })
                    }
                    className="form-select"
                    style={{ fontSize: 13 }}
                    disabled={!stoneSizes.length}
                  >
                    <option value="">Seçiniz</option>
                    {stoneSizes.map((size) => (
                      <option key={size.id} value={size.id}>
                        {size.olcusu}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Taş Cinsi */}
                <div className="col-md-6">
                  <label className="form-label" style={{ fontSize: 13 }}>
                    Taş Cinsi
                  </label>
                  <select
                    value={selectedStoneTypeId}
                    onChange={(e) => setSelectedStoneTypeId(e.target.value)}
                    className="form-select"
                    style={{ fontSize: 13 }}
                  >
                    <option value="">Seçiniz</option>
                    {stoneTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.stone_type}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Adet */}
                <div className="col-md-6">
                  <label className="form-label" style={{ fontSize: 13 }}>
                    Adet
                  </label>
                  <input
                    type="number"
                    name="adet"
                    value={stoneInput.adet}
                    onChange={(e) =>
                      setStoneInput({ ...stoneInput, adet: e.target.value })
                    }
                    className="form-control"
                    placeholder="Adet"
                    style={{ fontSize: 13 }}
                    min={1}
                  />
                </div>

                {/* Taş Ekle Butonu */}
                <div className="col-12 text-end">
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        stoneInput.stone_measurement_id &&
                        stoneInput.adet &&
                        selectedStoneTypeId
                      ) {
                        setFormData((prev) => ({
                          ...prev,
                          stones: [
                            ...prev.stones,
                            {
                              ...stoneInput,
                              stone_type_id: selectedStoneTypeId,
                              stone_sekli: stonesList.find(
                                (s) => s.id === selectedStoneId
                              )?.sekli,
                            },
                          ],
                        }));
                        setStoneInput({ stone_measurement_id: "", adet: "" });
                        setSelectedStoneId("");
                        setSelectedStoneTypeId("");
                      }
                    }}
                    className="btn btn-success"
                    style={{ fontSize: 13 }}
                  >
                    ➕ Taş Ekle
                  </button>
                </div>
              </div>
            </div>

            {/* Kaydet Butonu */}
            <div className="col-12 text-end">
              <button
                type="submit"
                className="btn px-4"
                style={{
                  backgroundColor: "#08007a",
                  color: "#fff",
                  fontSize: 13,
                }}
              >
                💾 Kaydet
              </button>
            </div>
          </form>
        </Modal.Body>
      </Modal>
      <div
        className="d-flex col"
        style={{
          width: "100%",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <h5
          className="card-title mb-0"
          style={{ color: "#21274a", fontSize: 16 }}
        >
          BLG Ürün Listesi
        </h5>
        <Button
          onClick={handleShow}
          className="btn btn-sm"
          style={{ backgroundColor: "#21274a", fontSize: 11, color: "white" , border:'none', padding:'5px 15px'}}
        >
          Ürün Ekle
        </Button>
      </div>
      <div
  className="table-wrapper"
  style={{
    overflow: "hidden",
    borderRadius: 12,
    border: "1px solid #dee2e6", // Bootstrap'ın default border rengi
  }}
>
      <div className="table-responsive">
        <table
          className="table  align-middle "
          style={{ borderColor: "#ccc", minWidth: "100%",
              borderWidth:0.5
           }}
        >
          <thead className="table-light" style={{ fontSize: 11 }}>
            <tr>
              <th className="text-center px-2 py-1"  >Sıra Numarası</th>
              <th className="text-center px-2 py-1">SKU NO</th>
              <th className="text-center px-2 py-1">Fotoğraf</th>
              <th className="text-center px-2 py-1">Tip</th>
              <th className="text-center px-2 py-1">Adı</th>
              <th className="text-center px-2 py-1">Mağaza</th>
              <th className="text-center px-2 py-1">Karat</th>
              <th className="text-center px-2 py-1">Gram</th>
              <th className="text-center px-2 py-1">Genişlik</th>
              <th className="text-center px-2 py-1">Uzunluk</th>
              <th className="text-center px-2 py-1">Kalınlık</th>
              <th className="text-center px-2 py-1">Kol Ölçüsü</th>
              <th className="text-center px-2 py-1">Taş Şekli</th>
              <th className="text-center px-2 py-1">Taş Ölçüsü</th>
              <th className="text-center px-2 py-1">Taş Tipi</th>
              <th className="text-center px-2 py-1">Taş Adedi</th>
              <th></th>
            </tr>
          </thead>
          <tbody >
            {products.map((product, index) => {
              const hasStones = product.stones && product.stones.length > 0;
              const productRows = [];

              if (hasStones) {
                product.stones.forEach((stone, i) => {
                  productRows.push(
                    <tr key={`${product.id}-${i}`} style={{ height: 34, }}>
                      {i === 0 && (
                        <>
                          <td
                            rowSpan={product.stones.length}
                            className="text-center align-middle"
                          >
                            {index + 1}
                          </td>
                          <td
                            rowSpan={product.stones.length}
                            className="text-center align-middle"
                          >
                            {product.sku_kodu}
                          </td>
                          <td
                            rowSpan={product.stones.length}
                            className="text-center align-middle"
                          >
                            {product.fotograf ? (
                              <img
                                src={product.fotograf}
                                alt={product.adi}
                                style={{
                                  width: 64,
                                  height: 64,
                                  objectFit: "cover",
                                  display: "block",
                                  margin: "0 auto",
                                }}
                              />
                            ) : (
                              "Fotoğraf yok"
                            )}
                          </td>
                          <td
                            rowSpan={product.stones.length}
                            className="text-center align-middle"
                          >
                            {product.tip}
                          </td>
                          <td
                            rowSpan={product.stones.length}
                            className="text-center align-middle"
                          >
                            {product.adi}
                          </td>
                          <td
                            rowSpan={product.stones.length}
                            className="text-center align-middle"
                          >
                            {product.magaza}
                          </td>
                          <td
                            rowSpan={product.stones.length}
                            className="text-center align-middle"
                          >
                            {product.karati}
                          </td>
                          <td
                            rowSpan={product.stones.length}
                            className="text-center align-middle"
                          >
                            {product.grami}
                          </td>
                          <td
                            rowSpan={product.stones.length}
                            className="text-center align-middle"
                          >
                            {product.genislik}
                          </td>
                          <td
                            rowSpan={product.stones.length}
                            className="text-center align-middle"
                          >
                            {product.uzunluk}
                          </td>
                          <td
                            rowSpan={product.stones.length}
                            className="text-center align-middle"
                          >
                            {product.kalinlik}
                          </td>
                          <td
                            rowSpan={product.stones.length}
                            className="text-center align-middle"
                          >
                            {product.kol_olcusu}
                          </td>
                          
                        </>
                      )}
                      <td className="text-center align-middle border border-2">
                        {stone.stone_sekli}
                      </td>
                      <td className="text-center align-middle border border-2">
                        {stone.olcusu}
                      </td>
                      <td className="text-center align-middle border border-2">
                        {stone.stone_type || "-"}
                      </td>
                      <td className="text-center align-middle border border-2">
                        {stone.adet}
                      </td>
                        <td>
                <Button onClick={() => handleEdit(product)} size="sm" style={{  backgroundColor: "#ee6028",
              fontSize: 11,
              color: "white",
              border: "none", padding:"5px 10px"}}>
                  Düzenle
                </Button>
              </td>
                    </tr>
                  );
                });
              } else {
                productRows.push(
                  <tr key={product.id} style={{ height: 55 }}>
                    <td className="text-center px-2 py-1">{index + 1}</td>
                    <td className="text-center px-2 py-1">
                      {product.sku_kodu}
                    </td>
                    <td className="text-center px-2 py-1">
                      {product.fotograf ? (
                        <img
                          src={product.fotograf}
                          alt={product.adi}
                          style={{ width: 64, height: 64, objectFit: "cover" }}
                        />
                      ) : (
                        "Fotoğraf yok"
                      )}
                    </td>
                    <td className="text-center px-2 py-1">{product.tip}</td>
                    <td className="text-center px-2 py-1">{product.adi}</td>
                    <td className="text-center px-2 py-1">{product.magaza}</td>
                    <td className="text-center px-2 py-1">{product.karati}</td>
                    <td className="text-center px-2 py-1">{product.grami}</td>
                    <td className="text-center px-2 py-1">
                      {product.genislik}
                    </td>
                    <td className="text-center px-2 py-1">{product.uzunluk}</td>
                    <td className="text-center px-2 py-1">
                      {product.kalinlik}
                    </td>
                    <td className="text-center px-2 py-1">
                      {product.kol_olcusu}
                    </td>
                    <td
                      colSpan={4}
                      className="text-center px-2 py-1 fw-semibold text-muted"
                    >
                      Taş yok
                    </td>
                      <td>
                <Button onClick={() => handleEdit(product)} size="sm" style={{ backgroundColor: "#ee6028",
              fontSize: 11,
              color: "white",
              border: "none",padding:"5px 10px"}}>
                Düzenle
                </Button>
              </td>
                  </tr>
                );
              }

              return productRows;
            })}
          </tbody>
        </table>
      </div>
      </div>
    </Container>
  );
}

import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { Modal, Button, Container } from "react-bootstrap";

export default function ProductsPage() {
  const { shopName } = useParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stonesList, setStonesList] = useState([]);
  const [stoneTypes, setStoneTypes] = useState([]);
  const [stoneSizes, setStoneSizes] = useState([]);
  const [selectedStoneId, setSelectedStoneId] = useState("");
  const [selectedStoneTypeId, setSelectedStoneTypeId] = useState("");

  const [showModal, setShowModal] = useState(false);

  // Yeni ürün bilgileri
  const [newProduct, setNewProduct] = useState({
    sku_kodu: "",
    fotograf: "", // şimdilik string, dosya upload farklı yönetilmeli
    tip: "",
    adi: "",
    karati: "",
    grami: "",
    genislik: "",
    uzunluk: "",
    kalinlik: "",
    kol_olcusu: "",
    tas_agirligi: "",
    magaza: shopName,
    stones: [],
  });

  // Taş eklemek için geçici state
  const [stoneInput, setStoneInput] = useState({
    stone_measurement_id: "",
    adet: "",
    stone_type_id: "",
    stone_sekli: "",
    olcusu: "",
    stone_type: "",
  });

  // Veri çekme fonksiyonu
  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `http://localhost:3000/products/${encodeURIComponent(shopName)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setProducts(res.data);
    } catch (err) {
      console.error("Ürünler yüklenirken hata:", err);
      setError("Ürünler yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [shopName]);

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

  // Modal aç/kapa
  const handleShowModal = () => setShowModal(true);
  const handleCloseModal = () => {
    setShowModal(false);
    setNewProduct({
      sku_kodu: "",
      fotograf: "",
      tip: "",
      adi: "",
      karati: "",
      grami: "",
      genislik: "",
      uzunluk: "",
      kalinlik: "",
      kol_olcusu: "",
      tas_agirligi: "",
      magaza: shopName,
      stones: [],
    });
    setStoneInput({
      stone_measurement_id: "",
      adet: "",
      stone_type_id: "",
      stone_sekli: "",
      olcusu: "",
      stone_type: "",
    });
  };

  // Ürün formu input değişimi
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewProduct((prev) => ({ ...prev, [name]: value }));
  };

  // Taş input değişimi
  const handleStoneInputChange = (e) => {
    const { name, value } = e.target;
    setStoneInput((prev) => ({ ...prev, [name]: value }));
  };

  // Taş ekleme butonu
  const handleAddStone = () => {
    if (!stoneInput.adet || !stoneInput.stone_sekli) {
      alert("Lütfen taş şekli ve adet giriniz");
      return;
    }
    setNewProduct((prev) => ({
      ...prev,
      stones: [...prev.stones, stoneInput],
    }));
    setStoneInput({
      stone_measurement_id: "",
      adet: "",
      stone_type_id: "",
      stone_sekli: "",
      olcusu: "",
      stone_type: "",
    });
  };

  // Ürün gönderme
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");

      // Burada fotograf dosya ise farklı upload gerekir, şu an basit string gibi gönderiyoruz
      await axios.post("http://localhost:3000/products", newProduct, {
        headers: { Authorization: `Bearer ${token}` },
      });

      await fetchProducts();

      handleCloseModal();
    } catch (err) {
      console.error(err);
      alert("❌ Hata oluştu");
    }
  };

  return (
    <Container
      style={{
        fontFamily: "Poppins, sans-serif",
      }}
    >
      <div
        className="d-flex col"
        style={{
          width: "100%",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        {" "}
        <h5
          className="mb-3"
          style={{ color: "#21274a", fontWeight: "600", fontSize: 16 }}
        >
          {shopName} Mağazası Ürünleri
        </h5>
        {/* Ürün Ekle Butonu */}
        <Button
          className="btn btn-sm"
          style={{
            backgroundColor: "#21274a",
            fontSize: 11,
            color: "white",
            border: "none",
            padding: "5px 15px",
          }}
          onClick={handleShowModal}
        >
          Ürün Ekle
        </Button>
      </div>

      {/* Ürün Ekleme Modalı */}
      <Modal
        show={showModal}
        onHide={handleCloseModal}
        dialogClassName="modal-90w"
      >
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: 14 }}>Ürün Ekle</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <form onSubmit={handleSubmit} className="row g-4 p-4 rounded">
            {Object.keys(newProduct)
              .filter((key) => key !== "stones")
              .map((key) => (
                <div key={key} className="col-md-3">
                  <div className="mb-3">
                    <label className="form-label" style={{ fontSize: 14 }}>
                      {key.replace(/_/g, " ").toUpperCase()}
                    </label>

                    {/* Şimdilik fotograf text input */}
                    {key === "fotograf" ? (
                      <input
                        type="text"
                        name={key}
                        value={newProduct[key]}
                        onChange={handleInputChange}
                        className="form-control"
                        style={{ fontSize: 13 }}
                      />
                    ) : (
                      <input
                        type="text"
                        name={key}
                        value={newProduct[key]}
                        onChange={handleInputChange}
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

                {/* Taş Ölçüsü */}
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

                {/* Taş Tipi */}
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

                <div className="col-md-6">
                  <label className="form-label" style={{ fontSize: 13 }}>
                    Adet
                  </label>
                  <input
                    type="number"
                    name="adet"
                    value={stoneInput.adet}
                    onChange={handleStoneInputChange}
                    className="form-control"
                    style={{ fontSize: 13 }}
                    min={1}
                  />
                </div>

                <div className="col-12 text-end">
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        stoneInput.stone_measurement_id &&
                        stoneInput.adet &&
                        selectedStoneTypeId
                      ) {
                        setNewProduct((prev) => ({
                          ...prev,
                          stones: [
                            ...prev.stones,
                            {
                              ...stoneInput,
                              stone_type_id: selectedStoneTypeId,
                              stone_sekli: stonesList.find(
                                (s) => s.id === selectedStoneId
                              )?.sekli,
                              stone_type: stoneTypes.find(
                                (t) => t.id === +selectedStoneTypeId
                              )?.stone_type,
                              olcusu: stoneSizes.find(
                                (s) => s.id === +stoneInput.stone_measurement_id
                              )?.olcusu,
                            },
                          ],
                        }));
                        setStoneInput({
                          stone_measurement_id: "",
                          adet: "",
                          stone_type_id: "",
                          stone_sekli: "",
                          olcusu: "",
                          stone_type: "",
                        });
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

      {/* Ürün Tablosu */}
      <div
        className="table-wrapper"
        style={{
          overflow: "hidden",
          borderRadius: 12,
          border: "1px solid #dee2e6",
        }}
      >
        <div className="table-responsive">
          <table
            className="table align-middle"
            style={{ borderColor: "#ccc", minWidth: "100%", borderWidth: 0.5 }}
          >
            <thead className="table-light" style={{ fontSize: 11 }}>
              <tr>
                <th className="text-center px-2 py-1">Sıra Numarası</th>
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
              </tr>
            </thead>
            <tbody>
              {products.map((product, index) => {
                const hasStones = product.stones && product.stones.length > 0;
                const productRows = [];

                if (hasStones) {
                  product.stones.forEach((stone, i) => {
                    productRows.push(
                      <tr key={`${product.id}-${i}`} style={{ height: 34 }}>
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
                            style={{
                              width: 64,
                              height: 64,
                              objectFit: "cover",
                            }}
                          />
                        ) : (
                          "Fotoğraf yok"
                        )}
                      </td>
                      <td className="text-center px-2 py-1">{product.tip}</td>
                      <td className="text-center px-2 py-1">{product.adi}</td>
                      <td className="text-center px-2 py-1">
                        {product.magaza}
                      </td>
                      <td className="text-center px-2 py-1">
                        {product.karati}
                      </td>
                      <td className="text-center px-2 py-1">{product.grami}</td>
                      <td className="text-center px-2 py-1">
                        {product.genislik}
                      </td>
                      <td className="text-center px-2 py-1">
                        {product.uzunluk}
                      </td>
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

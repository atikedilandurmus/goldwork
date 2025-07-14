import React, { useEffect, useState } from "react";
import { Button, Card, Container, Form } from "react-bootstrap";

function App() {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [rows, setRows] = useState([]);
  const [expandedCells, setExpandedCells] = useState({});
  const [editRowIndex, setEditRowIndex] = useState(null);
  const [editRowData, setEditRowData] = useState({});

  // Örnek admin kontrolü, bunu kendi auth yapına göre ayarla
  const currentUser = { role: "admin" }; // örnek; gerçek kullanıcı bilgisini al
  const isAdmin = currentUser.role === "admin";

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("http://localhost:3000/jsv_editted", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) throw new Error("Veri getirilirken hata oluştu");
        const json = await res.json();
        setData(json);
        setRows(json);
      } catch (error) {
        console.error(error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage("Lütfen bir dosya seçin.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://localhost:3000/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message);
      } else {
        setMessage(data.error || "Yükleme başarısız.");
      }
    } catch (error) {
      setMessage("Sunucu ile bağlantı kurulamadı.");
    }
  };

  const columns = [
    "unique_id",
    "sale_date",
    "item_name",
    "buyer",
    "quantity",
    "price",
    "coupon_code",
    "coupon_details",
    "discount_amount",
    "shipping_discount",
    "order_shipping",
    "order_sales_tax",
    "item_total",
    "currency",
    "transaction_id",
    "listing_id",
    "date_paid",
    "date_shipped",
    "ship_name",
    "ship_address1",
    "ship_address2",
    "ship_city",
    "ship_state",
    "ship_zipcode",
    "ship_country",
    "order_id",
    "variations",
    "order_type",
    "listings_type",
    "payment_type",
    "inperson_discount",
    "inperson_location",
    "vat_paid_by_buyer",
    "sku",
    "shops",
    "gold_carat",
    "color",
    "size",
    "personalization",
    "shipping",
    "name_part_1",
    "name_part_2",
    "name_part_3",
    "name_part_4",
    "name_part_5",
    "fullname_fulladdress",
    "product_features",
  ];

  function formatHeader(str) {
    return str.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }

  const toggleExpand = (rowIndex, col) => {
    const key = `${rowIndex}-${col}`;
    setExpandedCells((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Hücre değeri değiştiğinde editRowData'yı güncelle
  const handleInputChange = (e, col) => {
    setEditRowData((prev) => ({
      ...prev,
      [col]: e.target.value,
    }));
  };

  // Düzenleme moduna geç / çık ve patch isteği yap
  const handleEditToggle = async (rowIndex) => {
    if (editRowIndex === rowIndex) {
      // Düzenleme bittiyse patch gönder
      try {
        const token = localStorage.getItem("token");
        const uniqueId = rows[rowIndex].unique_id;
        const res = await fetch(`http://localhost:3000/jsv_editted/${uniqueId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(editRowData),
        });
        if (!res.ok) throw new Error("Güncelleme başarısız");
        const updatedData = await res.json();

        // rows güncelle
        setRows((prevRows) => {
          const newRows = [...prevRows];
          newRows[rowIndex] = { ...newRows[rowIndex], ...updatedData };
          return newRows;
        });
        setMessage("Güncelleme başarılı.");
      } catch (error) {
        setMessage("Güncelleme sırasında hata oluştu.");
        console.error(error);
      }
      setEditRowIndex(null);
      setEditRowData({});
    } else {
      // Düzenleme moduna geç
      setEditRowIndex(rowIndex);
      setEditRowData(rows[rowIndex]);
    }
  };

  if (loading)
    return <div className="text-center mt-5 text-muted">Yükleniyor...</div>;
  if (error)
    return <div className="text-center mt-5 text-danger">Hata: {error}</div>;

  return (
    <Container style={{ fontFamily: "Poppins, sans-serif", color: "#21274a", width:'100%' }}>
      <Card className="shadow-0 border-0" style={{ backgroundColor: "transparent" }}>
        <Form.Group className="mb-4">
          <Form.Label style={{ fontSize: 14, fontWeight: 500 }}>
            CSV Dosyanızı Seçin
          </Form.Label>
          <div className="d-flex gap-2">
            <Form.Control
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              style={{ fontSize: 13 }}
            />
            <Button
              onClick={handleUpload}
              style={{
                backgroundColor: "#ee6028",
                fontSize: 13,
                border: "none",
              }}
            >
              Yükle
            </Button>
          </div>
        </Form.Group>

        {message && (
          <div className="alert alert-info p-2 mb-4" style={{ fontSize: 13 }}>
            {message}
          </div>
        )}

        {!loading && !error && (
          rows.length > 0 ? (
            <div
              className="table-responsive"
              style={{ borderRadius: 10, boxShadow: "0 0 8px rgba(0,0,0,0.05)" }}
            >
              <table className="table table-sm table-bordered" style={{ margin: 0 }}>
                <thead style={{ backgroundColor: "#f5f7fb", fontSize: 11 }}>
                  <tr>
                    {columns.map((col) => (
                      <th
                        key={col}
                        style={{
                          padding: 10,
                          minWidth: "100px",
                          maxWidth: "150px",
                          fontWeight: 600,
                          color: "#21274a",
                        }}
                      >
                        {formatHeader(col)}
                      </th>
                    ))}
                    {isAdmin && (
                      <th style={{ padding: 10, minWidth: "80px" }}>Düzenle</th>
                    )}
                  </tr>
                </thead>
                <tbody style={{ fontSize: 10 }}>
                  {rows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {columns.map((col) => {
                        const key = `${rowIndex}-${col}`;
                        const isExpanded = expandedCells[key];
                        const isEditing = editRowIndex === rowIndex;
                        return (
                          <td
                            key={col}
                            onClick={() => toggleExpand(rowIndex, col)}
                            style={{
                              verticalAlign: "middle",
                              padding: "8px 10px",
                              whiteSpace: isExpanded ? "normal" : "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              cursor: isEditing ? "auto" : "pointer",
                              userSelect: "text",
                            }}
                            title={row[col]}
                          >
                            {isEditing ? (
                              <Form.Control
                                type="text"
                                value={editRowData[col] || ""}
                                onChange={(e) => handleInputChange(e, col)}
                                style={{ fontSize: 10 }}
                              />
                            ) : (
                              row[col]
                            )}
                          </td>
                        );
                      })}
                      {isAdmin && (
                        <td style={{ verticalAlign: "middle" }}>
                          <Button
                            size="sm"
                            variant={editRowIndex === rowIndex ? "success" : "primary"}
                            onClick={() => handleEditToggle(rowIndex)}
                            style={{ fontSize: 10, backgroundColor:'#21274a' }}
                          >
                            {editRowIndex === rowIndex ? "Kaydet" : "Düzenle"}
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center mt-5 text-muted">Görüntülenecek veri yok.</div>
          )
        )}
      </Card>
    </Container>
  );
}

export default App;

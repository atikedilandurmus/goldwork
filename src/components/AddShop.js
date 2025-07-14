import React, { useEffect, useState } from "react";
import { Container, Form, Button, ListGroup, Alert } from "react-bootstrap";

export default function AddShopForm() {
  const [name, setName] = useState("");
  const [missingSkus, setMissingSkus] = useState([]);
  const [selectedPrefix, setSelectedPrefix] = useState("");
  const [newShopName, setNewShopName] = useState("");
  const [prefix, setPrefix] = useState("");
  const [message, setMessage] = useState("");

;

  useEffect(() => {
    fetch("http://localhost:3000/missing-shops")
      .then((res) => res.json())
      .then(setMissingSkus)
      .catch(console.error);
  }, []);

async function handleSubmit(e) {
  e.preventDefault();
  setMessage("");

  if (!name.trim() || !prefix.trim()) {
    setMessage("Lütfen mağaza adı ve prefix giriniz.");
    return;
  }
  const token = localStorage.getItem("token");

  try {
    const res = await fetch("http://localhost:3000/shops", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify({ name, prefix }),
    });

    if (!res.ok) {
      const data = await res.json();
      setMessage(data.error || "Mağaza eklenirken hata oluştu.");
      return;
    }

    const createdShop = await res.json();

    // Yeni mağazaya ait prefix ile jsv_editted tablosundaki null shops kayıtlarını güncelle
    const updateRes = await fetch("http://localhost:3000/shops/update-missing", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify({ prefix, shopName: createdShop.name }),
    });

    if (!updateRes.ok) {
      const updateData = await updateRes.json();
      setMessage(
        `Mağaza eklendi ancak SKU güncellemesi başarısız oldu: ${updateData.error || ""}`
      );
    } else {
      const updateData = await updateRes.json();
      setMessage(
        `Mağaza başarıyla eklendi: ${createdShop.name}. ${updateData.updatedCount} SKU güncellendi.`
      );

      // Burada missingSkus listesini güncelle
      const refreshed = await fetch("http://localhost:3000/missing-shops");
      if (refreshed.ok) {
        const refreshedData = await refreshed.json();
        setMissingSkus(refreshedData);
      }
    }

    setName("");
    setPrefix("");
  } catch (error) {
    setMessage("Sunucuya bağlanırken hata oluştu.");
  }
}

  return (
    <Container
      style={{
        fontFamily: "Poppins, sans-serif",
      
      }}
    >
     <h5
          className="card-title mb-2"
          style={{ color: "#21274a", fontSize: 16 }}
        >
        Mağazası Atanmamış SKU'lar
      </h5>

      {missingSkus.length === 0 ? (
        <p style={{ color: "#666" }}>Tüm SKU'lar mağazaya atanmış.</p>
      ) : (
        <div
          style={{
            maxHeight: 180,
            overflowY: "auto",
            backgroundColor: "white",
            border: "1px solid #ddd",
            borderRadius: 5,
            padding: "10px 15px",
            marginBottom: 30,
          }}
        >
          <ListGroup variant="flush">
            {missingSkus.map(({ sku }) => (
              <ListGroup.Item
                key={sku}
                style={{ fontSize: 14, color: "#444", padding: "6px 12px" }}
              >
                {sku}
              </ListGroup.Item>
            ))}
          </ListGroup>
        </div>
      )}

      <h5
        className="card-title mb-3"
        style={{ color: "#21274a",  fontSize: 16 }}
      >
        Yeni Mağaza Ekle
      </h5>

      <Form onSubmit={handleSubmit}>
        <Form.Group className="card-title mb-3" controlId="shopName">
          <Form.Label         style={{ color: "#21274a", fontSize: 14 }}
>Mağaza Adı:</Form.Label>
          <Form.Control
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Örnek: IstanbulShop"
                           style={{fontSize:13 }}

            required
          />
        </Form.Group>

        <Form.Group className="card-title mb-4" controlId="shopPrefix">
          <Form.Label         style={{ color: "#21274a", fontSize: 14 }}
>Prefix (SKU'da aranacak):</Form.Label>
          <Form.Control
            type="text"
            value={prefix}
               style={{fontSize:13 }}
            onChange={(e) => setPrefix(e.target.value)}
            placeholder="Örnek: IST"
            required
          />
        </Form.Group>

        <Button
          type="submit"
          variant="primary"
          style={{ width: "20%", fontWeight: "300", fontSize:12, border:'none', backgroundColor:'#21274a' }}
        >
          Kaydet
        </Button>
      </Form>

      {message && (
        <Alert
          variant={message.includes("hata") ? "danger" : "success"}
          className="mt-3"
          style={{ fontSize: 14 }}
        >
          {message}
        </Alert>
      )}
    </Container>
  );
}

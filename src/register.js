import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Form, Card, Container } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";

export default function Register() {
  const [name, setName] = useState("");
  const [store, setStore] = useState("blgjewels");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (name.trim() !== "") {
      const username = name.toLowerCase().replace(/\s+/g, "");
      setEmail(`${username}@${store}.com`);
    } else {
      setEmail("");
    }
  }, [name, store]);

  async function handleRegister(e) {
    e.preventDefault();

    try {
      const res = await fetch("http://localhost:3000/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage(
          "✅ Kayıt başarılı! Giriş sayfasına yönlendiriliyorsunuz..."
        );
        setTimeout(() => navigate("/"), 1500);
      } else {
        setMessage(data.message || "❌ Kayıt başarısız");
      }
    } catch (error) {
      setMessage("❌ Sunucu hatası");
    }
  }

  return (
    <div
      className="d-flex justify-content-center align-items-center vh-100"
      style={{
        backgroundColor: "#08007a",
        fontFamily: "Poppins, sans-serif",
      }}
    >
      <Container>
        <Card
          className="mx-auto p-4 shadow-lg"
          style={{ maxWidth: "400px", borderRadius: "20px" }}
        >
          <h4 className="text-center mb-4">Kayıt Ol</h4>{" "}
          <Form onSubmit={handleRegister}>
            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold custom-font-medium">Adınız</Form.Label>
              <Form.Control
                type="text"
                style={{fontSize:12}}
                placeholder="Adınızı girin"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
                 <Form.Label className="fw-semibold custom-font-medium">Mağaza Seçin</Form.Label>
              <Form.Select
                              style={{fontSize:12}}

                value={store}
                onChange={(e) => setStore(e.target.value)}
              >
                <option value="blgjewels">BLG Jewels</option>
                <option value="jolene">Jolene</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
                <Form.Label className="fw-semibold custom-font-medium">Email</Form.Label>
              <Form.Control                 style={{fontSize:12}}
 type="email" value={email} readOnly />
            </Form.Group>

            <Form.Group className="mb-3">
                <Form.Label className="fw-semibold custom-font-medium">Şifre</Form.Label>
              <Form.Control
                style={{fontSize:12}}
                type="password"
                placeholder="Şifrenizi girin"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </Form.Group>

            <div className="d-grid">
              <Button
                type="submit"
                variant="primary"
   className="btn btn-primary  "
              style={{ backgroundColor: "#08007a", fontSize: 13 }}              >
                Kayıt Ol
              </Button>
            </div>
          </Form>
          {message && (
            <p className="text-center mt-3 small text-muted">{message}</p>
          )}
        </Card>
      </Container>
    </div>
  );
}

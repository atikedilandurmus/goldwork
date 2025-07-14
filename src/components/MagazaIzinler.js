import React, { useEffect, useState } from "react";
import { Button, Form, Container, Row, Col, ListGroup } from "react-bootstrap";

export default function ShopPermissions() {
  const [users, setUsers] = useState([]);
  const [shops, setShops] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedShops, setSelectedShops] = useState([]);
  const [message, setMessage] = useState("");

  // Kullanıcıları getir
  useEffect(() => {
    async function fetchUsers() {
      const res = await fetch("http://localhost:3000/users", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();
      setUsers(data);
    }
    fetchUsers();
  }, []);

  // Mağazaları getir
  useEffect(() => {
    async function fetchShops() {
      const res = await fetch("http://localhost:3000/api/all-shops", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();
      setShops(data);
    }
    fetchShops();
  }, []);

  // Seçilen kullanıcının mevcut yetkilerini getir
  useEffect(() => {
    if (!selectedUser) return;
    async function fetchPermissions() {
      const res = await fetch(
        `http://localhost:3000/api/user_shops/${selectedUser}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      const data = await res.json();
      setSelectedShops(data);
    }
    fetchPermissions();
  }, [selectedUser]);

  const toggleShop = (shop) => {
    if (selectedShops.includes(shop)) {
      setSelectedShops(selectedShops.filter((s) => s !== shop));
    } else {
      setSelectedShops([...selectedShops, shop]);
    }
  };

  const handleSave = async () => {
    const res = await fetch("http://localhost:3000/api/user_shops", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({
        user_email: selectedUser,
        shops: selectedShops,
      }),
    });
    const data = await res.json();
    setMessage(data.message || "Kayıt başarılı.");
  };

  return (
    <Container
      className="mt-4"
      style={{
        fontFamily: "Poppins, sans-serif",
      }}
    >
      {" "}
      <Row>
        <Col md={4}>
          <h5
            className="card-title mb-3"
            style={{ color: "#21274a", fontSize: 14 }}
          >
            Kullanıcılar
          </h5>
          <ListGroup>
            {users.map((user) => (
              <ListGroup.Item
                key={user.email}
                action
                active={selectedUser === user.email}
                onClick={() => setSelectedUser(user.email)}
                style={{ fontSize: 12 }}
              >
                {user.email}
              </ListGroup.Item>
            ))}
          </ListGroup>
        </Col>

        <Col md={8} style={{marginTop:37}}>
          {selectedUser && (
            <>
              <h5
                className="card-title mb-2"
                style={{ color: "#21274a", fontSize: 14 }}
              >
                {selectedUser} için mağaza yetkileri
              </h5>
              <Form>
                {shops.map((shop) => (
                  <Form.Check
                    key={shop}
                    type="checkbox"
                    label={shop}
                    checked={selectedShops.includes(shop)}
                    onChange={() => toggleShop(shop)}
                    style={{ fontSize: 12 }}
                  />
                ))}
                <Button
                  className="mt-1"
                  style={{
                    backgroundColor: "#21274a",
                    fontSize: 11,
                    color: "white",
                    border: "none",
                    padding: "5px 10px",
                  }}
                  onClick={handleSave}
                >
                  Kaydet
                </Button>
              </Form>
              {message && <div className="mt-2 text-success">{message}</div>}
            </>
          )}
        </Col>
      </Row>
    </Container>
  );
}

import React, { useEffect, useState } from "react";
import { Form, Button, Modal, Card, Container } from "react-bootstrap";
import { FaTrashAlt } from "react-icons/fa";
import { useAuth } from "../AuthContext";

export default function UsersTab() {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({
    username: "",
    email: "",
    password: "",
    role_id: null,
  });
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("Token bulunamadı, giriş yapınız.");
      return;
    }

    fetch("http://localhost:3000/users", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Kullanıcılar getirilirken hata oluştu.");
        return res.json();
      })
      .then(setUsers)
      .catch((err) => console.error("Kullanıcıları alma hatası", err));

    fetch("http://localhost:3000/roles", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Roller getirilirken hata oluştu.");
        return res.json();
      })
      .then((data) => {
        setRoles(data);
        if (data.length > 0 && !newUser.role_id) {
          setNewUser((prev) => ({ ...prev, role_id: data[0].id }));
        }
      })
      .catch((err) => console.error("Roller alma hatası", err));
  }, []);

  const isUserRole = currentUser?.role === "user";

  const handleRoleChange = async (userId, roleId) => {
    if (isUserRole) {
      alert("Bu işlemi yapmak için yetkiniz yok.");
      return;
    }
    try {
      const res = await fetch(`http://localhost:3000/users/${userId}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role_id: roleId }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((user) =>
            user.id === userId
              ? {
                  ...user,
                  role_name: roles.find((r) => r.id === parseInt(roleId))
                    ?.role_name,
                }
              : user
          )
        );
      }
    } catch (err) {
      console.error("Rol güncelleme hatası", err);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (isUserRole) {
      alert("Bu işlemi yapmak için yetkiniz yok.");
      return;
    }
    if (!window.confirm("Bu kullanıcıyı silmek istediğinizden emin misiniz?"))
      return;
    try {
      const res = await fetch(`http://localhost:3000/users/${userId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setUsers((prev) => prev.filter((user) => user.id !== userId));
      } else {
        console.error("Silme başarısız");
      }
    } catch (err) {
      console.error("Kullanıcı silme hatası:", err);
    }
  };

  // Modal fonksiyonları
  const openAddModal = () => setShowAddModal(true);
  const closeAddModal = () => {
    setShowAddModal(false);
    setNewUser({
      username: "",
      email: "",
      password: "",
      role_id: roles[0]?.id || null,
    });
  };

  const handleNewUserChange = (field, value) => {
    setNewUser((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddUser = async () => {
    const { username, email, password, role_id } = newUser;

    if (!username || !email || !password || !role_id) {
      alert("Lütfen tüm alanları doldurun.");
      return;
    }

    try {
      const res = await fetch("http://localhost:3000/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      });

      if (res.ok) {
        const createdUser = await res.json();
        setUsers((prev) => [...prev, createdUser]);
        closeAddModal();
      } else {
        const errorData = await res.json();
        alert(
          "Kullanıcı eklenirken hata: " + (errorData.error || res.statusText)
        );
      }
    } catch (err) {
      console.error("Kullanıcı ekleme hatası:", err);
      alert("Kullanıcı ekleme sırasında hata oluştu.");
    }
  };

  return (
    <Container className="mt-4">
      {" "}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="custom-font-medium">Kullanıcılar</h5>
        {!isUserRole && (
          <Button
            size="sm"
            onClick={openAddModal}
            className="btn btn-sm "
            style={{
              backgroundColor: "#21274a",
              fontSize: 11,
              color: "white",
              border: "none",
            }}
          >
            Kullanıcı Ekle
          </Button>
        )}
      </div>
      <div className="table-modern-wrapper">
        <div className="table-modern">
          <div className="table-modern-header d-flex fw-semibold px-3 py-2 border-bottom">
            <div style={{ width: "25%" }}>Ad</div>
            <div style={{ width: "35%" }}>Email</div>
            <div style={{ width: "30%" }}>Rol</div>
            <div style={{ width: "10%", textAlign: "center" }}></div>
          </div>
          <div className="table-modern-body">
            {users.map((u) => (
              <div
                className="table-modern-row d-flex align-items-center px-3 py-2 border-bottom"
                key={u.id}
              >
                <div style={{ width: "25%" }}>{u.username}</div>
                <div style={{ width: "35%" }}>{u.email}</div>
                <div style={{ width: "30%" }}>
                  <Form.Select
                    style={{ fontSize: 10 }}
                    value={
                      roles.find((r) => r.role_name === u.role_name)?.id || ""
                    }
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    disabled={isUserRole}
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.role_name}
                      </option>
                    ))}
                  </Form.Select>
                </div>
                <div style={{ width: "10%", textAlign: "center" }}>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDeleteUser(u.id)}
                    disabled={isUserRole}
                  >
                    <FaTrashAlt />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Kullanıcı Ekleme Modalı */}
      <Modal show={showAddModal} onHide={closeAddModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>Yeni Kullanıcı Ekle</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Card style={{ borderRadius: "20px" }} className="p-3 shadow-sm">
            <Form>
              <Form.Group className="mb-3" controlId="formUsername">
                <Form.Label className="fw-semibold custom-font-medium">
                  Kullanıcı Adı
                </Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Kullanıcı adı girin"
                  value={newUser.username}
                  onChange={(e) =>
                    handleNewUserChange("username", e.target.value)
                  }
                  style={{ fontSize: 12 }}
                  autoFocus
                />
              </Form.Group>
              <Form.Group className="mb-3" controlId="formEmail">
                <Form.Label className="fw-semibold custom-font-medium">
                  Email
                </Form.Label>
                <Form.Control
                  type="email"
                  placeholder="Email girin"
                  value={newUser.email}
                  onChange={(e) => handleNewUserChange("email", e.target.value)}
                  style={{ fontSize: 12 }}
                />
              </Form.Group>
              <Form.Group className="mb-3" controlId="formPassword">
                <Form.Label className="fw-semibold custom-font-medium">
                  Şifre
                </Form.Label>
                <Form.Control
                  type="password"
                  placeholder="Şifre girin"
                  value={newUser.password}
                  onChange={(e) =>
                    handleNewUserChange("password", e.target.value)
                  }
                  style={{ fontSize: 12 }}
                />
              </Form.Group>
              <Form.Group className="mb-3" controlId="formRole">
                <Form.Label className="fw-semibold custom-font-medium">
                  Rol
                </Form.Label>
                <Form.Select
                  value={newUser.role_id || ""}
                  onChange={(e) =>
                    handleNewUserChange("role_id", parseInt(e.target.value))
                  }
                  style={{ fontSize: 12 }}
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.role_name}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Form>
          </Card>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={closeAddModal}
            style={{ fontSize: 13 }}
          >
            İptal
          </Button>
          <Button
            variant="primary"
            onClick={handleAddUser}
            style={{ backgroundColor: "#08007a", fontSize: 13 }}
          >
            Ekle
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

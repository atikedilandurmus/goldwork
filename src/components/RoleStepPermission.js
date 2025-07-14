import React, { useEffect, useState } from "react";
import { Container } from "react-bootstrap";
import { useAuth } from "../AuthContext";

export default function StepUserPermissionsMatrix() {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [steps, setSteps] = useState([]);
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!currentUser) return;

    async function fetchData() {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Token bulunamadı, giriş yapınız.");

        // 1- Kullanıcıları çek
        const usersRes = await fetch("http://localhost:3000/users", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!usersRes.ok) throw new Error("Kullanıcılar getirilirken hata oluştu.");
        const usersData = await usersRes.json();
        setUsers(usersData);

        // 2- İmalat Takip kolonlarını çek (adımlar)
        const columnsRes = await fetch("http://localhost:3000/api/imalat_takip/columns", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!columnsRes.ok) throw new Error("Adımlar (kolonlar) getirilirken hata oluştu.");
        const columnsData = await columnsRes.json();
        setSteps(columnsData);

        // 3- İzinleri çek (user_step_permissions)
        const permsRes = await fetch("http://localhost:3000/user_step_permissions/all", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!permsRes.ok) throw new Error("İzinler getirilirken hata oluştu.");
        const permsData = await permsRes.json();

        // 4- İzinleri adım ve kullanıcı bazında objeye dönüştür
        const permsObj = {};
        for (const step of columnsData) {
          permsObj[step] = {};
          for (const user of usersData) {
            const perm = permsData.find(
              (p) => p.step_name === step && p.user_id === user.id
            );
            permsObj[step][user.id] = perm
              ? { can_edit: perm.can_edit, id: perm.id }
              : { can_edit: false, id: null };
          }
        }
        setPermissions(permsObj);
        setError(null);
      } catch (e) {
        console.error(e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [currentUser]);

  // İzin toggle fonksiyonu (örnek)
  const handleToggle = async (step, userId) => {
    const current = permissions[step][userId];
    const newValue = !current.can_edit;
    const token = localStorage.getItem("token");

    try {
      if (!token) throw new Error("Token bulunamadı");

      if (current.id) {
        await fetch(`http://localhost:3000/user_step_permissions/${current.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ can_edit: newValue }),
        });
      } else {
        await fetch(`http://localhost:3000/user_step_permissions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            step_name: step,
            user_id: userId,
            can_edit: newValue,
          }),
        });
      }

      setPermissions((prev) => ({
        ...prev,
        [step]: {
          ...prev[step],
          [userId]: { ...current, can_edit: newValue },
        },
      }));
    } catch (err) {
      alert("İzin güncellenirken hata oluştu.");
      console.error(err);
    }
  };

  if (loading) return <p style={{ textAlign: "center", marginTop: 30 }}>Yükleniyor...</p>;
  if (error) return <p style={{ textAlign: "center", marginTop: 30, color: "red" }}>{error}</p>;

  return (
    <Container className="mt-4">
      <h5 style={{ color: "#21274a", fontSize: 14, marginBottom: 15 }}>
        İmalat Adımları & Kullanıcı Bazlı İzin Matrisi
      </h5>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: `4fr repeat(${users.length}, 1fr)`,
          alignItems: "center",
          borderRadius: 20,
          userSelect: "none",
          overflowX: "auto",
        }}
      >
        <div
          style={{
            padding: "10px 15px",
            fontWeight: "700",
            fontSize: 12,
            color: "#333",
            backgroundColor: "#f9fafb",
            position: "sticky",
            top: 0,
            zIndex: 10,
            borderRadius: 20,
          }}
        >
          Adım / Kullanıcı
        </div>
        {users.map((user) => (
          <div
            key={user.id}
            title={user.name || user.email}
            style={{
              padding: "10px 0",
              fontWeight: "600",
              fontSize: 10,
              textAlign: "center",
              color: "#34495e",
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
              borderLeft: "1px solid #ddd",
              backgroundColor: "#f9fafb",
              position: "sticky",
              top: 0,
              borderRadius: 20,
              zIndex: 9,
            }}
          >
            {user.name || user.email}
          </div>
        ))}

        {steps.map((step) => (
          <React.Fragment key={step}>
            <div
              style={{
                padding: "10px 15px",
                borderTop: "1px solid #ddd",
                borderRight: "1px solid #ddd",
                fontWeight: "600",
                fontSize: 11,
                textTransform: "uppercase",
                color: "#2c3e50",
                backgroundColor: "#f9fafb",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderRadius: 20,
              }}
            >
              {step.replace(/_/g, " ")}
              {/* İstersen buraya step silme butonu da ekleyebilirsin */}
            </div>

            {users.map((user) => {
              const perm = permissions[step]?.[user.id] || { can_edit: false, id: null };
              return (
                <div
                  key={`${step}-${user.id}`}
                  style={{
                    padding: "10px",
                    borderTop: "1px solid #ddd",
                    borderLeft: "1px solid #ddd",
                    textAlign: "center",
                    cursor: "pointer",
                    backgroundColor: perm.can_edit ? "#a1a5b8" : "#fff",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    borderRadius: 20,
                  }}
                  onClick={() => handleToggle(step, user.id)}
                  title={perm.can_edit ? "Düzenleme izni verildi" : "Düzenleme izni yok"}
                >
                  <input
                    type="checkbox"
                    checked={perm.can_edit}
                    onChange={() => handleToggle(step, user.id)}
                    style={{ cursor: "pointer", width: 15, height: 15 }}
                  />
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </Container>
  );
}

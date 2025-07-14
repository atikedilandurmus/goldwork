import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import { useAuth } from "./AuthContext";
import { Button } from "react-bootstrap";
import axios from "axios";

export default function Login() {
  const location = useLocation();
const params = new URLSearchParams(location.search);
const messageExpired = params.get("message");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

async function handleSubmit(e) {
  e.preventDefault();

  try {
    const res = await axios.post("http://localhost:3000/login", {
      email,
      password
    });

    const data = res.data;

    setMessage(
      `Giriş başarılı! Hoşgeldin, ${data.user.email} (Rol: ${data.user.role})`
    );

    localStorage.setItem("token", data.token);

    login(data.user);

    navigate("/home");
  } catch (error) {
    if (error.response) {
      setMessage(error.response.data?.message || "Giriş başarısız");
    } else {
      setMessage("Sunucuya bağlanırken hata oluştu");
    }
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
      <div
        className="bg-light rounded p-4 shadow"
        style={{ minWidth: 320, width: 350 }}
      >
        <h4 className="text-center mb-4">Giriş Yap</h4>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <input
              type="email"
              className="form-control"
              placeholder="Email"
              value={email}
              style={{ fontSize: 13 }}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="mb-3">
            <input
              type="password"
              className="form-control"
              placeholder="Şifre"
              style={{ fontSize: 13 }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="d-grid">
            <Button
              type="submit"
              className="btn btn-primary  "
              style={{ backgroundColor: "#08007a", fontSize: 13 }}
            >
              Giriş Yap
            </Button>
          </div>
        </form>
        {message && <p className="text-center mt-3 custom-font-medium">{message}</p>}
        {messageExpired === "expired" && (
  <div style={{ color: "red", marginTop: 10 }}>
    Oturum süresi doldu. Lütfen tekrar giriş yapın.
  </div>
)}

        <div className="text-center mt-3">
          <Link to="/register">
            <Button
              size="sm"
              className="btn "
              style={{ border: "1px solid #08007a",  backgroundColor: 'transparent',fontSize: 10, color:' #08007a' }}
            >
              Kayıt Ol
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

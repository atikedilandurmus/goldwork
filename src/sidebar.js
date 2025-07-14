import React, { useEffect, useState } from "react";
import {
  FaHome,
  FaUser,
  FaCog,
  FaTasks,
  FaSignOutAlt,
  FaExclamation,
  FaSadCry,
  FaAngellist,
  FaShopify,
  FaPlusCircle,
} from "react-icons/fa";
import { GiBigDiamondRing } from "react-icons/gi";
import { PiMicrosoftExcelLogoFill } from "react-icons/pi";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import "./index.css";

export default function Sidebar() {
  const { logout, currentUser } = useAuth();
  const navigate = useNavigate();

  const [shops, setShops] = useState([]);
  const [jsvOpen, setJsvOpen] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);

  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
const [jsvEditted, setJsvEditted] = useState([]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };


useEffect(() => {
  async function fetchShops() {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:3000/api/shops", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Mağazalar alınamadı");

      const data = await res.json();

      console.log("Fetched shops from backend:", data);

      // Backend zaten filtreleme yapıyor, direkt kullan
      setShops(data);
    } catch (e) {
      console.error("Mağazalar yüklenirken hata:", e);
    }
  } async function fetchJsvEdittedShops() {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:3000/api/jsv_editted", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Ana CSV  alınamadı");
      const data = await res.json();
      setJsvEditted(data);
    } catch (e) {
      console.error("Ana CSV mağazaları yüklenirken hata:", e);
    }
  }

  if (currentUser?.email) {
    fetchShops();
    fetchJsvEdittedShops();
  }
}, [currentUser]);


  const isAdmin = currentUser?.role === "admin";
  useEffect(() => {
    if (!isSidebarHovered) {
      setJsvOpen(false);
      setProductsOpen(false);
    }
  }, [isSidebarHovered]);

  return (
    <div
      className="sidebar d-flex flex-column p-3 gap-4"
      style={{ fontFamily: "Poppins, sans-serif", overflowY:'auto' }}
      onMouseEnter={() => setIsSidebarHovered(true)}
      onMouseLeave={() => setIsSidebarHovered(false)}
    >
      <Link to="/home" className="nav-link d-flex align-items-center">
        <FaHome className="icon" />
        <span className="link-text">Anasayfa</span>
      </Link>

      {/* Diğer menüler */}
      <Link to="/upload" className="nav-link d-flex align-items-center">
        <PiMicrosoftExcelLogoFill className="icon" />
        <span className="link-text">CSV Yükle</span>
      </Link>
      <Link to="/imalat_takip" className="nav-link d-flex align-items-center">
        <FaTasks className="icon" />
        <span className="link-text">İmalat Takip</span>
      </Link>
      <Link to="/imalat_takip_yeni" className="nav-link d-flex align-items-center">
        <FaTasks className="icon" />
        <span className="link-text">İmalat Takip YENİ</span>
      </Link>

      {isAdmin && (

      <Link
        to="/imalat_takip_log"
        className="nav-link d-flex align-items-center"
      >
        <FaTasks className="icon" />
        <span className="link-text">İmalat Takip Logları</span>
      </Link>
      )}

      {/* MAIN CSV MENÜSÜ - DEĞİŞMEDİ */}
      <div>
        <div
          onClick={() => setJsvOpen(!jsvOpen)}
          className={`nav-link d-flex align-items-center  jsv-toggle ${
            jsvOpen ? "open" : ""
          }`}
          style={{ cursor: "pointer", userSelect: "none" }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") setJsvOpen(!jsvOpen);
          }}
        >
          <FaTasks className="icon" />
          <span className="link-text">CSV Dosyaları</span>
          <span style={{ marginLeft: "auto" }} className="arrow">
            {jsvOpen ? "▲" : "▼"}
          </span>
        </div>

        {jsvOpen && (
          <div
            className="jsv-dropdown-list"
            style={{
              paddingLeft: "1.5rem",
              marginTop: "0.5rem",
              marginBottom: "0.5rem",
            }}
          >
            
            {/* Main CSV Link - mağazalardan önce */}
            <div>
                {isAdmin && (
              <Link
                to="/upload"
                className="nav-link d-flex align-items-center"
                style={{
                  paddingLeft: "1rem",
                  fontSize: "0.8rem",
                  color: "#ddd",
                  display: "block",
                  marginBottom: "0.4rem",
                }}
              >
                <FaTasks style={{ marginRight: "5px" }} />
                Main CSV
              </Link>
                )}
            </div>

            {/* Mağaza Listesi */}
            {shops.length === 0 ? (
              <div
                className="empty-list"
                style={{
                  color: "#777",
                  fontStyle: "italic",
                  fontSize: "0.9rem",
                  paddingLeft: "1rem",
                }}
              >
                Mağaza bulunamadı
              </div>
            ) : (
              shops.map((shop) => (
                <div key={shop}>
                  <Link
                    to={`/jsv/${encodeURIComponent(shop)}`}
                    className="nav-link d-flex align-items-center"
                    style={{
                      paddingLeft: "1rem",
                      fontSize: "0.8rem",
                      color: "#ddd",
                      display: "block",
                      marginBottom: "0.4rem",
                    }}
                  >
                    <FaTasks style={{ marginRight: "5px" }} />
                    {shop}
                  </Link>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* ÜRÜNLER MENÜSÜ - YENİ */}
      <div>
        <div
          onClick={() => setProductsOpen(!productsOpen)}
          className={`nav-link d-flex align-items-center jsv-toggle ${
            productsOpen ? "open" : ""
          }`}
          style={{ cursor: "pointer", userSelect: "none" }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ")
              setProductsOpen(!productsOpen);
          }}
        >
          <GiBigDiamondRing className="icon" />
          <span className="link-text">Ürünler</span>
          <span style={{ marginLeft: "auto" }} className="arrow">
            {productsOpen ? "▲" : "▼"}
          </span>
        </div>

        {productsOpen && (
          <div
            className="jsv-dropdown-list"
            style={{
              paddingLeft: "1.5rem",
              marginTop: "0.5rem",
              marginBottom: "0.1rem",
            }}
          >
            {shops.length === 0 ? (
              <div
                className="empty-list"
                style={{
                  color: "#777",
                  fontStyle: "italic",
                  fontSize: "0.9rem",
                  paddingLeft: "1rem",
                }}
              >
                Mağaza bulunamadı
              </div>
            ) : (
              shops.map((shop) => (
                <div key={shop}>
                  <Link
                    to={`/products/${encodeURIComponent(shop)}`}
                    className="nav-link d-flex align-items-center"
                    style={{
                      paddingLeft: "1rem",
                      fontSize: "0.8rem",
                      color: "#ddd",
                      display: "block",
                      marginBottom: "0.4rem",
                    }}
                  >
                    <GiBigDiamondRing style={{ marginRight: "5px" }} /> {shop}
                  </Link>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <Link to="/etiket" className="nav-link d-flex align-items-center">
        <FaExclamation className="icon" />
        <span className="link-text">Etiket</span>
      </Link>
           <Link to="/atolye" className="nav-link d-flex align-items-center">
        <FaExclamation className="icon" />
        <span className="link-text">Atolye</span>
      </Link>
        <Link to="/addOrder" className="nav-link d-flex align-items-center">
        <FaPlusCircle className="icon" />
        <span className="link-text">Sipariş Oluştur</span>
      </Link>

      <Link to="/stones" className="nav-link d-flex align-items-center">
        <GiBigDiamondRing className="icon" />
        <span className="link-text">Taşlar</span>
      </Link>
   <Link to="/addShop" className="nav-link d-flex align-items-center">
        <GiBigDiamondRing className="icon" />
        <span className="link-text">Mağaza Ekle</span>
      </Link>

      {isAdmin && (
        <Link to="/ayarlar" className="nav-link d-flex align-items-center">
          <FaCog className="icon" />
          <span className="link-text">Ayarlar</span>
        </Link>
      )}

      <button
        className="nav-link d-flex align-items-center btn-logout"
        onClick={handleLogout}
        style={{
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          color: "inherit",
        }}
      >
        <FaSignOutAlt className="icon" />
        <span className="link-text">Çıkış Yap</span>
      </button>

      {currentUser?.email && (
        <div className="user-email">
          <FaUser className="icon" />
          <span style={{ marginLeft: 10 }}>{currentUser.email}</span>
        </div>
      )}
    </div>
  );
}

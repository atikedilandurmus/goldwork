import React from "react";
import { Navbar, Container } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import { useAuth } from "./AuthContext";

export default function CustomNavbar() {
  const { logout, currentUser } = useAuth();

  // Marka adını email'den çıkar (örnek: blgjewels.com → Blgjewels)
  const getBrandName = () => {
    if (currentUser?.email) {
      const domainPart = currentUser.email.split("@")[1];
      const namePart = domainPart?.split(".")[0];
      return namePart.charAt(0).toUpperCase() + namePart.slice(1);
    }
    return "Marka";
  };

  // Kullanıcı adını email'den al (örnek: zafer@blgjewels.com → zafer)
  const getUserName = () => {
    if (currentUser?.email) {
      return currentUser.email.split("@")[0];
    }
    return "";
  };

  return (
    <Navbar
      expand="lg"
      style={{
        fontFamily: "Poppins, sans-serif",
        backgroundColor: "#21274a",
        fontSize: 12,
        paddingInline: "2vw",
      }}
      variant="dark"
    >
      <Container >
        <Navbar.Brand
          href="#"
          style={{
            color: "#ee6028",
            fontWeight: 400,
            fontSize: 14,
            letterSpacing: 2,
            marginLeft:'2vw'
          }}
        >
          {getBrandName()}
        </Navbar.Brand>

        <div style={{ marginLeft: "auto", color: "#fff", fontSize: 12 }}>
          Hoş geldin, <strong>{getUserName()}</strong>
        </div>
      </Container>
    </Navbar>
  );
}

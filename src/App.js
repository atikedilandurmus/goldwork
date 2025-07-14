import React, { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Outlet,
  Link,
} from "react-router-dom";
import CSVUploader from "./components/CSVUploader";
import ProductManager from "./components/addBlgRing";
import ImalatTakipList from "./components/imalat_takip";
import Login from "./login";
import Sidebar from "./sidebar";
import { AuthProvider } from "./AuthContext";
import PrivateRoute from "./PrivateRoute";
import JoleneRings from "./components/joleneRings";
import GemglamRings from "./components/gemglamRings";
import Stones from "./components/Stones";
import AllLogs from "./components/ImalatTakipLog";
import Register from "./register";
import Settings from "./Setting";
import axios from "axios";
import Home from "./components/home";
import CustomNavbar from "./Navbar";
import EtiketBasmaSayfasi from "./components/Etiket";
import AddShopForm from "./components/AddShop";
import JsvShopPage from "./components/ShowJSVForShops";
import ProductsPage from "./components/Product";
import StagingForm from "./components/AddOrder";
import YeniImalat from "./components/YeniImalat";
import AtolyeSayfasi from "./components/AtolyeList";

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    console.log("INTERCEPTOR HATASI:", error?.response?.data);

    if (error.response?.status === 401) {
      const msg = error.response.data?.error;

      if (msg === "Oturum süresi doldu. Lütfen tekrar giriş yapın.") {
        localStorage.removeItem("token");
        window.location.href = "/login?message=expired";
      }
    }

    return Promise.reject(error);
  }
);

function Layout() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        minWidth: "100vw",
      }}
    >
      <CustomNavbar />
      <div style={{ display: "flex", flex: 1, minWidth: "100%" }}>
        <Sidebar style={{ flexShrink: 0 }} />
        <main
          className="main-content"
          style={{
            minHeight: "100vh",
            minWidth: "100vw",
            paddingLeft: 50,
            marginTop: 30,
          }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function App() {
  useEffect(() => {
    const interval = setInterval(() => {
      const token = localStorage.getItem("token");
      if (!token) return;

      axios
        .get("http://localhost:3000/check-token", {
          headers: { Authorization: `Bearer ${token}` },
        })
        .catch((error) => {
          console.log("Token kontrolü sırasında hata:", error.response?.data);
          // INTERCEPTOR burada çalışır
        });
    }, 5000); // Test için 5 saniye yapabilirsin

    return () => clearInterval(interval);
  }, []);

  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Private Routes için Layout kapsayıcı */}
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route index element={<Navigate to="/home" replace />} />
            <Route path="home" element={<Home />} />
            <Route path="upload" element={<CSVUploader />} />
            <Route path="addBlgRing" element={<ProductManager />} />
            <Route path="imalat_takip" element={<ImalatTakipList />} />
            <Route path="imalat_takip_yeni" element={<YeniImalat />} />
            <Route path="imalat_takip_log" element={<AllLogs />} />
            <Route path="jolene_rings" element={<JoleneRings />} />
            <Route path="gemglam_rings" element={<GemglamRings />} />
            <Route path="stones" element={<Stones />} />
            <Route path="addShop" element={<AddShopForm />} />
            <Route path="atolye" element={<AtolyeSayfasi />} />
            <Route path="etiket" element={<EtiketBasmaSayfasi />} />
            <Route path="addOrder" element={<StagingForm />} />
            <Route path="/jsv/:shopName" element={<JsvShopPage />} />
            <Route path="/products/:shopName" element={<ProductsPage />} />

            <Route path="ayarlar" element={<Settings />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

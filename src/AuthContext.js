import React, { createContext, useContext, useState } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null); // kullanıcı bilgisi

  const login = (user) => {
    setIsAuthenticated(true);
    setCurrentUser(user); // user objesi örn: {id, email, role_id, role_name}
    // İstersen burada localStorage kaydet de sayfa yenilense de kalsın
    localStorage.setItem("currentUser", JSON.stringify(user));
  };

  const logout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    localStorage.removeItem("currentUser");
  };

  // Eğer sayfa yenilenirse localStorage'dan geri yükleyebilirsin:
  React.useEffect(() => {
    const storedUser = localStorage.getItem("currentUser");
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
      setIsAuthenticated(true);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, currentUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

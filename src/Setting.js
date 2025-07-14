import React, { useState } from "react";
import { Tabs, Tab, Container } from "react-bootstrap";
import UsersTab from "./components/UsersTab";
import RoleStepPermissionsEditor from "./components/RoleStepPermission";
import HolidayAdmin from "./components/TatilGunleriDuzenleme";
import ShopPermissions from "./components/MagazaIzinler";

export default function Settings() {
  const [key, setKey] = useState("users");

  return (
 <Container
 style={{
        fontFamily: "Poppins, sans-serif",
        padding: "30px 0",
        color: "#21274a",
      }}
    >      <Tabs activeKey={key} onSelect={(k) => setKey(k)} className="mb-3 c">
        <Tab eventKey="users" title="Kullanıcılar" >
          <UsersTab />
        </Tab>
        <Tab eventKey="other" title="İmalat Adımları & Roller">
          <RoleStepPermissionsEditor/>
        </Tab>
        <Tab eventKey="holidays" title="Tatil Günleri Düzenleme">
          <HolidayAdmin/>
        </Tab>
           <Tab eventKey="shops" title="Mağaza Yetkilendirmesi">
          <ShopPermissions/>
        </Tab>
      </Tabs>
    </Container>
  );
}

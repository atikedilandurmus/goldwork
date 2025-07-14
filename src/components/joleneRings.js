import axios from "axios";
import React, { useEffect, useState } from "react";
import { Container } from "react-bootstrap";

const JoleneRings = () => {
  const [joleneList, setJoleneList] = useState([]);

  useEffect(() => {
    const fetchStoneTypes = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("http://localhost:3000/jolene_rings", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setJoleneList(res.data);
      } catch (err) {
        console.error("Taş cinsleri yüklenemedi:", err);
      }
    };
    fetchStoneTypes();
  }, []);

  return (
    <Container
      style={{
        fontFamily: "Poppins, sans-serif",
      }}
    >
      <h5
        className="card-title mb-3"
        style={{ color: "#21274a", fontSize: 16 }}
      >
        Jolene Ürün Listesi
      </h5>{" "}
      <div className="overflow-x-auto w-full">
        <table
          className="min-w-max table-bordered"
          style={{ borderColor: "#ccc" }}
        >
          <thead className="custom-font-small">
            <tr className="bg-gray-100">
              <th className="border px-2 py-1">SKU NO</th>
              <th className="border px-2 py-1">Fotoğraf</th>
              <th className="border px-2 py-1">Adı</th>
            </tr>
          </thead>
          <tbody className="custom-font-small">
            {joleneList.map((product, index) => {
              return (
                <tr key={product.id} style={{ height: 40 }}>
                  <td>{product.sku}</td>
                  <td className="px-2 py-1">
                    {product.fotograf ? (
                      <img
                        src={product.fotograf}
                        alt={product.adi}
                        style={{ width: 64, height: 64, objectFit: "cover" }}
                      />
                    ) : (
                      "Fotoğraf yok"
                    )}
                  </td>
                  <td>{product.adi}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Container>
  );
};

export default JoleneRings;

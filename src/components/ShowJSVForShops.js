import React, { useEffect, useState } from "react";
import { Container } from "react-bootstrap";
import { useParams } from "react-router-dom";

export default function JsvShopPage() {
  const { shopName } = useParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedCells, setExpandedCells] = useState({});

  // Kolon isimleri (senin verdiğin)
  const columns = [
    "unique_id", "sale_date", "item_name", "buyer", "quantity", "price",
    "coupon_code", "coupon_details", "discount_amount", "shipping_discount",
    "order_shipping", "order_sales_tax", "item_total", "currency", "transaction_id",
    "listing_id", "date_paid", "date_shipped", "ship_name", "ship_address1",
    "ship_address2", "ship_city", "ship_state", "ship_zipcode", "ship_country",
    "order_id", "variations", "order_type", "listings_type", "payment_type",
    "inperson_discount", "inperson_location", "vat_paid_by_buyer", "sku",
    "shops", "gold_carat", "color", "size", "personalization", "shipping",
    "name_part_1", "name_part_2", "name_part_3", "name_part_4", "name_part_5",
    "lastname_and_address1", "fullname_fulladdress", "product_features"
  ];

  useEffect(() => {
    async function fetchProducts() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `http://localhost:3000/api/shop-products/${encodeURIComponent(shopName)}`
        );
        if (!res.ok) throw new Error("Ürünler yüklenemedi");
        const data = await res.json();
        setProducts(data);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, [shopName]);

  // Başlıkları daha okunabilir yapmak için (snake_case → Başlık)
  function formatHeader(str) {
    return str
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  // Hücreye tıklanınca uzun metin açılıp kapanır
  function toggleExpand(rowIndex, col) {
    const key = `${rowIndex}-${col}`;
    setExpandedCells((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  if (loading) return <div>Yükleniyor...</div>;
  if (error) return <div style={{ color: "red" }}>Hata: {error}</div>;
  if (products.length === 0) return <div>{shopName} mağazası için ürün bulunamadı.</div>;

  return (
  <Container
      style={{
        fontFamily: "Poppins, sans-serif",
      
      }}
    >   
      <h5
        className="mb-3"
        style={{ color: "#21274a", fontWeight: "600", fontSize: 16 }}
   >{shopName} Mağazası Ürünleri
      </h5>  
     <div style={{ overflowX: "auto" }}>
  <table
    style={{
      width: "100%",
      minWidth: "max-content",  // İçerik kadar genişle
      borderCollapse: "collapse",
      tableLayout: "auto", // otomatik layout
      fontSize: 12,
    }}
    border="1"
    cellPadding="5"
    cellSpacing="0"
  >
    <thead style={{ backgroundColor: "#f5f7fb" }}>
      <tr>
        {columns.map((col) => (
          <th
            key={col}
            style={{
              padding: "8px",
              minWidth: 120,
              maxWidth: 160,
              whiteSpace: "nowrap",  // satır kaymasını önle
              fontWeight: "600",
              color: "#21274a",
              textAlign: "center",
              border: "1px solid #ddd",
            }}
          >
            {formatHeader(col)}
          </th>
        ))}
      </tr>
          </thead>
          <tbody>
            {products.map((row, rowIndex) => (
              <tr key={row.unique_id || rowIndex}>
                {columns.map((col) => {
                  const key = `${rowIndex}-${col}`;
                  const isExpanded = expandedCells[key];
                  const cellValue = row[col] ?? "";

                  return (
                    <td
                      key={col}
                      onClick={() => toggleExpand(rowIndex, col)}
                      style={{
                        padding: "6px 8px",
                        maxWidth: 160,
                        whiteSpace: isExpanded ? "normal" : "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        cursor: "pointer",
                        userSelect: "text",
                        verticalAlign: "top",
                        border: "1px solid #ddd",
                      }}
                      title={cellValue.toString()}
                    >
                      {cellValue.toString()}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Container>
  );
}

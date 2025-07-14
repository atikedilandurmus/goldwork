    import React, { useState } from "react";

    const initialForm = {
    sale_date: "04/17/25", // MM/DD/YY formatı olarak değiştirdim
    item_name:
        "Personalized Roman Numeral Ring 14k Solid Gold, Special Date Ring, Wedding Date Ring, 10k 18k Real Gold Custom Date Ring, Coordinates ring",
    buyer: "Lanie Bourg (laniebourg)",
    quantity: "1",
    price: "226.99",
    coupon_code: "SALE9",
    coupon_details: "SALE9 - % off",
    discount_amount: "45.4",
    shipping_discount: "0.00",
    order_shipping: "0",
    order_sales_tax: "0",
    item_total: "226.99",
    currency: "USD",
    transaction_id: "456196000000",
    listing_id: "1618417878",
    date_paid: "2025-04-17",
    date_shipped: "",
    ship_name: "Lanie w bourg",
    ship_address1: "158 providence ave",
    ship_address2: "",
    ship_city: "Cut off",
    ship_state: "LA",
    ship_zipcode: "70345",
    ship_country: "United States",
    order_id: "3653600000",
    variations: "Material:10k Yellow Gold,Ring size:7 US,Personalization:2026",
    order_type: "online",
    listings_type: "listing",
    payment_type: "online_cc",
    inperson_discount: "",
    inperson_location: "",
    vat_paid_by_buyer: "0",
    sku: "BR007901",
    };

    export default function StagingForm() {
    const [formData, setFormData] = useState(initialForm);
    const [msg, setMsg] = useState("");

    const handleChange = (e) => {
        const { name, value } = e.target;

        // Opsiyonel: sale_date için format kontrolü (MM/DD/YY)
        if (name === "sale_date") {
        if (value === "" || /^[0-1][0-9]\/[0-3][0-9]\/\d{2}$/.test(value)) {
            setFormData((p) => ({ ...p, [name]: value }));
        }
        // regex'e uymuyorsa güncelleme yapma (istersen uyarı ekleyebilirsin)
        } else {
        setFormData((p) => ({ ...p, [name]: value }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMsg("Yükleniyor...");
        const token = localStorage.getItem("token");

        try {
        const res = await fetch("http://localhost:3000/jsv_staging", {
            method: "POST",
            headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(formData),
        });

        const data = await res.json();

        if (res.ok) {
            setMsg("Kayıt başarıyla yapıldı.");
            setFormData(initialForm);
        } else {
            setMsg(data.error || "Bir hata oluştu.");
        }
        } catch (error) {
        setMsg("Sunucuya bağlanılamadı.");
        }
    };

    const fields = [
        ["sale_date", "Sale Date", "text"], // burada type text yapıldı
        ["item_name", "Item Name", "text"],
        ["buyer", "Buyer", "text"],
        ["quantity", "Quantity", "number"],
        ["price", "Price", "number", "0.01"],
        ["coupon_code", "Coupon Code", "text"],
        ["coupon_details", "Coupon Details", "text"],
        ["discount_amount", "Discount Amount", "number", "0.01"],
        ["shipping_discount", "Shipping Discount", "number", "0.01"],
        ["order_shipping", "Order Shipping", "number", "0.01"],
        ["order_sales_tax", "Order Sales Tax", "number", "0.01"],
        ["item_total", "Item Total", "number", "0.01"],
        ["currency", "Currency", "text"],
        ["transaction_id", "Transaction ID", "text"],
        ["listing_id", "Listing ID", "text"],
        ["date_paid", "Date Paid", "date"],
        ["date_shipped", "Date Shipped", "date"],
        ["ship_name", "Ship Name", "text"],
        ["ship_address1", "Ship Address 1", "text"],
        ["ship_address2", "Ship Address 2", "text"],
        ["ship_city", "Ship City", "text"],
        ["ship_state", "Ship State", "text"],
        ["ship_zipcode", "Ship Zipcode", "text"],
        ["ship_country", "Ship Country", "text"],
        ["order_id", "Order ID", "text"],
        ["variations", "Variations", "text"],
        ["order_type", "Order Type", "text"],
        ["listings_type", "Listings Type", "text"],
        ["payment_type", "Payment Type", "text"],
        ["inperson_discount", "Inperson Discount", "number", "0.01"],
        ["inperson_location", "Inperson Location", "text"],
        ["vat_paid_by_buyer", "VAT Paid by Buyer", "number", "0.01"],
        ["sku", "SKU", "text"],
    ];

    return (
        <div className="container my-4">
        <h3 className="mb-4">Staging Form</h3>
        <form onSubmit={handleSubmit}>
            <div className="row g-3">
            {fields.map(([name, label, type = "text", step]) => (
                <div key={name} className="col-md-1">
                <label htmlFor={name} className="form-label custom-font-small">
                    {label} {name === "sale_date" ? <span className="text-danger">*</span> : null}
                </label>
                <input
                    type={type}
                    id={name}
                    name={name}
                    className="form-control custom-font-small"
                    style={{ fontSize: 10 }}
                    value={formData[name]}
                    onChange={handleChange}
                    step={step || undefined}
                    required={name === "sale_date"}
                    placeholder={name === "sale_date" ? "MM/DD/YY" : undefined}
                    maxLength={name === "sale_date" ? 8 : undefined}
                />
                </div>
            ))}
            </div>

            <button type="submit" className="btn btn-primary w-100 mt-4">
            Kaydet
            </button>

            {msg && (
            <div className="alert alert-info mt-3" role="alert">
                {msg}
            </div>
            )}
        </form>
        </div>
    );
    }

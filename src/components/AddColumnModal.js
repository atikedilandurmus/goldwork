// components/AddColumnModal.js
import React from "react";
import { Modal, Card } from "react-bootstrap";

export default function AddColumnModal({
  show,
  onClose,
  newColumnTitle,
  setNewColumnTitle,
  newColumnType,
  setNewColumnType,
  allUsers,
  selectedUsers,
  setSelectedUsers,
  handleAddColumn,
  insertAfterColumn,
  setInsertAfterColumn,
  headers,
  formatHeader
}) {
  return (
    <Modal show={show} centered onHide={onClose}>
      <Modal.Header closeButton>
        <Modal.Title>Yeni Sipariş Durumu Ekle</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <Card style={{ borderRadius: "20px" }} className="p-3 shadow-sm">
          <label>Başlık:</label>
          <input
            className="form-control"
            value={newColumnTitle}
            onChange={(e) => setNewColumnTitle(e.target.value)}
          />

          <label className="mt-3">Tipi:</label>
          <select
            className="form-control"
            value={newColumnType}
            onChange={(e) => setNewColumnType(e.target.value)}
          >
            <option value="checkbox">Checkbox</option>
            <option value="date">Tarih</option>
            <option value="text">Yazı</option>
          </select>

<label className="mt-3">Yeni Sütunu Hangi Sütunun Yanına Eklemek İstersiniz?</label>
<select
  className="form-control"
  value={insertAfterColumn || ""}
  onChange={(e) => setInsertAfterColumn(e.target.value || null)}
>
  <option value="">(Sütunların sonuna ekle)</option>
  {headers.map((header) => (
    <option key={header} value={header}>
      {formatHeader(header)} {/* header'ı okunabilir yap */}
    </option>
  ))}
</select>
          <label className="mt-3">Erişim İzni Verilecek Kullanıcılar:</label>
          <div
            style={{
              maxHeight: 200,
              overflowY: "auto",
              border: "1px solid #ccc",
              padding: 10,
              borderRadius: 6,
            }}
          >
            {allUsers.map((user) => (
              <div key={user.id}>
                <input
                  type="checkbox"
                  id={`user-${user.id}`}
                  checked={selectedUsers.includes(user.id)}
                  onChange={() =>
                    setSelectedUsers((prev) =>
                      prev.includes(user.id)
                        ? prev.filter((id) => id !== user.id)
                        : [...prev, user.id]
                    )
                  }
                />
                <label htmlFor={`user-${user.id}`} style={{ marginLeft: 8 }}>
                  {user.name || user.email}
                </label>
              </div>
            ))}
          </div>

          <div className="d-flex justify-content-end mt-4 gap-2">
            <button className="btn btn-secondary" onClick={onClose}>
              İptal
            </button>
            <button className="btn btn-primary" onClick={handleAddColumn}>
              Ekle
            </button>
          </div>
        </Card>
      </Modal.Body>
    </Modal>
  );
}

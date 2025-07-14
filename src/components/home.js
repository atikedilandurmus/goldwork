import React, { useEffect, useState } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Spinner,
  Form,
  Badge,
} from "react-bootstrap";

const Home = () => {
  const [summary, setSummary] = useState();
  const [lastUpload, setLastUpload] = useState(null);
  const [loadingUpdate, setLoadingUpdate] = useState(false);

  useEffect(() => {
    fetch("http://localhost:3000/summary")
      .then((res) => res.json())
      .then((data) => setSummary(data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetch("http://localhost:3000/last-upload")
      .then((res) => res.json())
      .then((data) => setLastUpload(data))
      .catch(console.error);
  }, []);

  const toggleCompleted = async (unique_id, currentValue) => {
    setLoadingUpdate(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:3000/imalat_takip/${unique_id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({ tamamlandi: !currentValue }),
      });

      if (!res.ok) throw new Error("Güncelleme başarısız");
      const updatedRecord = await res.json();

      setSummary((prev) => {
        if (!prev) return prev;
        const newDueToday = prev.dueToday.map((item) =>
          item.unique_id === unique_id ? { ...item, tamamlandi: updatedRecord.tamamlandi } : item
        );
        return { ...prev, dueToday: newDueToday };
      });
    } catch (error) {
      console.error(error);
      alert("Güncelleme başarısız oldu.");
    } finally {
      setLoadingUpdate(false);
    }
  };

  const themeColor = "#21274a";

  return (
    <Container style={{ fontFamily: "Poppins, sans-serif", }}>
      <Row className="mb-4">
        <Col>
          <Card style={{ borderLeft: `6px solid ${themeColor}` }} className="shadow-sm">
            <Card.Header style={{ backgroundColor: themeColor, color: "white", fontSize:14 }}>
              Genel Durum
            </Card.Header>
            <Card.Body>
              {!summary ? (
                <Spinner animation="border" />
              ) : (
                <Row className="text-center justify-content-between " style={{fontSize:13}}>
                  {[
                    { label: "Toplam Sipariş", value: summary.totalOrders },
                    { label: "STL'de", value: summary.stl },
                    { label: "Cila'da", value: summary.cila ?? 0 },
                    { label: "Tamamlanan", value: summary.tamamlandi },
                    { label: "Bugün Teslim", value: summary.dueToday?.length ?? 0 },
                  ].map((item, idx) => (
                    <Col key={idx} md={2} xs={6} className="mb-3">
                      <div className="text-secondary">{item.label}</div>
                      <div className="fs-5 fw-bold" style={{ color: themeColor }}>{item.value}</div>
                    </Col>
                  ))}
                </Row>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col md={6} className="mb-4">
          <Card className="shadow-sm">
            <Card.Header style={{ backgroundColor: themeColor, color: "white",fontSize:14  }}>
              Bugün Teslimatlar
            </Card.Header>
            <Card.Body style={{ maxHeight: 300, overflowY: "auto" ,fontSize:13}}>
              {!summary ? (
                <Spinner animation="border" />
              ) : summary.dueToday?.length === 0 ? (
                <div className="text-muted">Bugün teslimat yok.</div>
              ) : (
                summary.dueToday.map((task) => (
                  <div
                    key={task.unique_id}
                    className="d-flex justify-content-between align-items-center border-bottom py-2"
                   
                  >
                    <div>
                      <div style={{ fontWeight: 500 }}>{task.siparis_kodu} - {task.urun_adi}</div>
                      <div className="d-flex row">  <small className="text-muted">
                        {task.kargo_adresi}
                      </small>
                      <small className="text-muted" >
                         {new Date(task.tarih).toLocaleDateString()}
                      </small></div>
                    
                    </div>
                    <Form.Check
                      type="checkbox"
                      checked={task.tamamlandi ?? false}
                      onChange={() => toggleCompleted(task.unique_id, task.tamamlandi)}
                      disabled={loadingUpdate}
                    />
                  </div>
                ))
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col md={6} className="mb-4">
          <Card className="shadow-sm">
            <Card.Header style={{ backgroundColor: themeColor, color: "white",fontSize:14  }}>
              Son Yükleme
            </Card.Header>
            <Card.Body style={{fontSize:13}}>
              {lastUpload ? (
                <>
                  <p><strong>Dosya:</strong> {lastUpload.file_name}</p>
                  <p><strong>Tarih:</strong> {new Date(lastUpload.uploaded_at).toLocaleString()}</p>
                </>
              ) : (
                <div className="text-muted">Henüz dosya yüklenmedi.</div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Home;

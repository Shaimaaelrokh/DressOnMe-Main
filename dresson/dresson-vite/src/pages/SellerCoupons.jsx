import React, { useState, useEffect } from "react";
import { getSellerCoupons, createSellerCoupon, deleteSellerCoupon } from "../api/api";
import { useAuth } from "../context/AuthContext";

export default function SellerCoupons({ darkMode }) {
  const { user } = useAuth();
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [code, setCode] = useState("");
  const [discount, setDiscount] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [validUntil, setValidUntil] = useState("");
  
  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      const data = await getSellerCoupons();
      setCoupons(data.results || data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!code || !discount) return;
    try {
      await createSellerCoupon({
        code,
        discount_percentage: parseInt(discount),
        valid_from: validFrom || null,
        valid_until: validUntil || null,
        active: true
      });
      setCode("");
      setDiscount("");
      setValidFrom("");
      setValidUntil("");
      fetchCoupons();
    } catch (err) {
      alert("Failed to create coupon. Maybe the code already exists?");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this coupon?")) return;
    try {
      await deleteSellerCoupon(id);
      fetchCoupons();
    } catch (err) {
      alert("Failed to delete coupon.");
    }
  };

  return (
    <div className="card shadow-sm mt-4 border-0" style={{ background: darkMode ? "#242526" : "#fff", color: darkMode ? "#f8f9fa" : "#000" }}>
      <div className="card-header border-bottom-0" style={{ background: darkMode ? "#1a1a2e" : "#f1f5f9" }}>
        <h5 className="mb-0 fw-bold">🎫 My Coupons</h5>
      </div>
      <div className="card-body">
        
        {/* Create Form */}
        <form onSubmit={handleCreate} className="row g-2 mb-4 align-items-end">
          <div className="col-md-3">
            <label className="form-label" style={{fontSize: "0.85rem"}}>Code</label>
            <input type="text" className="form-control" placeholder="e.g. SUMMER20" value={code} onChange={e => setCode(e.target.value)} required />
          </div>
          <div className="col-md-2">
            <label className="form-label" style={{fontSize: "0.85rem"}}>Discount (%)</label>
            <input type="number" className="form-control" placeholder="10" min="1" max="100" value={discount} onChange={e => setDiscount(e.target.value)} required />
          </div>
          <div className="col-md-3">
            <label className="form-label" style={{fontSize: "0.85rem"}}>Valid From (Optional)</label>
            <input type="datetime-local" className="form-control" value={validFrom} onChange={e => setValidFrom(e.target.value)} />
          </div>
          <div className="col-md-3">
            <label className="form-label" style={{fontSize: "0.85rem"}}>Valid Until (Optional)</label>
            <input type="datetime-local" className="form-control" value={validUntil} onChange={e => setValidUntil(e.target.value)} />
          </div>
          <div className="col-md-1">
            <button type="submit" className="btn btn-primary w-100 fw-bold">+</button>
          </div>
        </form>

        {/* Coupons List */}
        {loading ? (
          <p>Loading coupons...</p>
        ) : coupons.length === 0 ? (
          <p className="text-muted text-center my-3">You haven't created any coupons yet.</p>
        ) : (
          <div className="table-responsive">
            <table className={`table align-middle ${darkMode ? "table-dark" : ""}`}>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Discount</th>
                  <th>Valid From</th>
                  <th>Expires</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map(c => (
                  <tr key={c.id}>
                    <td className="fw-bold text-success">{c.code}</td>
                    <td>{c.discount_percentage}%</td>
                    <td style={{fontSize: "0.85rem"}}>{c.valid_from ? new Date(c.valid_from).toLocaleString() : "Always"}</td>
                    <td style={{fontSize: "0.85rem"}}>{c.valid_until ? new Date(c.valid_until).toLocaleString() : "Never"}</td>
                    <td>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(c.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
}

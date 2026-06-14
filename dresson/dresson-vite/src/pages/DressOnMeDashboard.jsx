import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios"; 
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis
} from "recharts";

// ─────────────────────── HELPERS ───────────────────────
const fmt = n => n >= 1e9 ? `${(n/1e9).toFixed(2)}B` : n >= 1e6 ? `${(n/1e6).toFixed(2)}M` : n >= 1e3 ? `${(n/1e3).toFixed(1)}K` : String(n);

const oppColor = stab => {
  if (stab < 45) return "#ff2828";
  if (stab < 65) return "#ff8800";
  if (stab < 80) return "#ffcc00";
  return "#4488ff";
};

const project = (lat, lng, rot, cx, cy, r) => {
  const lngR = ((lng + rot) * Math.PI) / 180;
  const latR = (lat * Math.PI) / 180;
  if (Math.cos(lngR) < 0) return null;
  return { x: cx + r * Math.cos(latR) * Math.sin(lngR), y: cy - r * Math.sin(latR), d: Math.cos(lngR) };
};

const initCurr = (meta = {}) => Object.fromEntries(
  Object.entries(meta).map(([k, v]) => [k, { ...v, rate: v.base, change: 0, history: [v.base] }])
);

// ─────────────────────── SPARKLINE ───────────────────────
function Sparkline({ data, color, width = 60, height = 24 }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
    </svg>
  );
}

// ─────────────────────── MAIN COMPONENT ───────────────────────
export default function DressOnMe() {
  const [curr, setCurr] = useState({});
  const [period, setPeriod] = useState("monthly");
  const [selected, setSelected] = useState(null);
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [globeSpeed, setGlobeSpeed] = useState(0.14);
  const [searchQ, setSearchQ] = useState("");
  const [sortBy, setSortBy] = useState("revenue");
  const [notifications, setNotifications] = useState([]);
  const [showNotif, setShowNotif] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(!!localStorage.getItem('dashboard_pin'));
  const [authPin, setAuthPin] = useState("");
  const [authError, setAuthError] = useState("");
  const canvasRef = useRef(null);
  const rotRef = useRef(0);
  const rafRef = useRef(null);
  const currRef = useRef(curr);
  const notifTimeoutRef = useRef(null);
  useEffect(() => { currRef.current = curr; }, [curr]);

  // Live currency simulation and backend fetch
  useEffect(() => {
    let isMounted = true;

    const fetchBackendStats = async () => {
      try {
        const pin = localStorage.getItem('dashboard_pin');
        const res = await api.get('analytics/dashboard/', {
          headers: pin ? { 'X-Dashboard-Pin': pin } : {}
        });
        if (isMounted && res.data) {
          setStats(res.data);
          setCurr(prev => {
            if (Object.keys(prev).length === 0 && res.data.currency_meta) {
              return initCurr(res.data.currency_meta);
            }
            return prev;
          });
        }
      } catch (err) {
        if (err.response && err.response.status === 403) {
          if (isMounted) setIsAuthorized(false);
        }
        console.error("Failed to fetch dashboard stats", err);
      }
    };

    fetchBackendStats();
    const intervalId = setInterval(fetchBackendStats, 60000);

    const fetchRealRates = async () => {
      try {
        const res = await fetch("http://localhost:3001/api/forex/latest");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!isMounted) return;
        if (data.success && data.rates) {
          setCurr(prevCurr => {
            if (Object.keys(prevCurr).length === 0) return prevCurr;
            const newCurr = {};
            Object.keys(prevCurr).forEach(currencyCode => {
              const old = prevCurr[currencyCode];
              const newRate = data.rates[currencyCode];
              if (newRate) {
                const change = ((newRate - old.rate) / old.rate) * 100;
                const history = [...(old.history || [old.rate]), newRate].slice(-20);
                newCurr[currencyCode] = {
                  ...old,
                  rate: newRate,
                  change: +change.toFixed(2),
                  history,
                };
              } else {
                newCurr[currencyCode] = old;
              }
            });
            return newCurr;
          });
        }
      } catch (err) {
        console.error("❌ فشل جلب أسعار الصرف الحقيقية:", err);
      }
    };

    // جلب أول مرة ثم التحديث كل 5 دقائق
    setTimeout(fetchRealRates, 2000);
    const forexInterval = setInterval(fetchRealRates, 5 * 60 * 1000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
      clearInterval(forexInterval);
    };
  }, []);

  // Globe canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const draw = () => {
      const ctx = canvas.getContext("2d");
      const W = canvas.width, H = canvas.height;
      const cx = W / 2, cy = H / 2, r = Math.min(W, H) / 2 - 8;
      ctx.clearRect(0, 0, W, H);

      // Outer glow rings
      for (let ring = 3; ring > 0; ring--) {
        ctx.beginPath();
        ctx.arc(cx, cy, r + ring * 7, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(200,0,0,${0.04 * ring})`;
        ctx.lineWidth = 6;
        ctx.stroke();
      }

      const bg = ctx.createRadialGradient(cx - r*.28, cy - r*.28, 0, cx, cy, r);
      bg.addColorStop(0, "#1a0104"); bg.addColorStop(.5, "#0c0001"); bg.addColorStop(1, "#040000");
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.fillStyle = bg; ctx.fill();
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r - 1, 0, Math.PI*2); ctx.clip();

      // Latitude/Longitude grid
      ctx.strokeStyle = "rgba(180,0,0,0.12)"; ctx.lineWidth = .5;
      for (let lat = -80; lat <= 80; lat += 20) {
        ctx.beginPath(); let f = true;
        for (let lng = -180; lng <= 180; lng += 3) {
          const p = project(lat, lng, rotRef.current, cx, cy, r);
          if (p) { f ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y); f = false; } else f = true;
        } ctx.stroke();
      }
      for (let lng = -180; lng <= 180; lng += 20) {
        ctx.beginPath(); let f = true;
        for (let lat = -90; lat <= 90; lat += 3) {
          const p = project(lat, lng, rotRef.current, cx, cy, r);
          if (p) { f ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y); f = false; } else f = true;
        } ctx.stroke();
      }

      // Country dots sorted by depth
      const cc = currRef.current;
      [...(stats.countries || [])].sort((a, b) => {
        const pA = project(a.lat, a.lng, rotRef.current, cx, cy, r);
        const pB = project(b.lat, b.lng, rotRef.current, cx, cy, r);
        return (pA?.d || 0) - (pB?.d || 0);
      }).forEach(c => {
        const p = project(c.lat, c.lng, rotRef.current, cx, cy, r);
        if (!p) return;
        const stab = (stats.currency_meta && stats.currency_meta[c.currency])?.stability || 70;
        const chg = cc[c.currency]?.change || 0;
        let rgb, pulse;
        if (stab < 45) { rgb = "255,40,40"; pulse = true; }
        else if (stab < 65) { rgb = "255,136,0"; pulse = stab < 55; }
        else if (stab < 80) { rgb = "220,200,0"; pulse = false; }
        else { rgb = "60,140,220"; pulse = false; }
        const alpha = chg > 0.1 ? .95 : chg < -.1 ? .6 : .82;
        const sz = Math.max(4.5, Math.sqrt((c.sellers + c.buyers) / 70));
        // Glow aura
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, sz * 5.5);
        g.addColorStop(0, `rgba(${rgb},${alpha*.5})`); g.addColorStop(1, "transparent");
        ctx.beginPath(); ctx.arc(p.x, p.y, sz * 5.5, 0, Math.PI*2); ctx.fillStyle = g; ctx.fill();
        // Core dot
        ctx.beginPath(); ctx.arc(p.x, p.y, sz, 0, Math.PI*2);
        const dotG = ctx.createRadialGradient(p.x - sz*.3, p.y - sz*.3, 0, p.x, p.y, sz);
        dotG.addColorStop(0, `rgba(${rgb},1)`);
        dotG.addColorStop(1, `rgba(${rgb},${alpha})`);
        ctx.fillStyle = dotG; ctx.fill();
        // Ring
        ctx.beginPath(); ctx.arc(p.x, p.y, sz + 3.5, 0, Math.PI*2);
        ctx.strokeStyle = `rgba(${rgb},${alpha*.45})`; ctx.lineWidth = 1.5; ctx.stroke();
        // Label for selected
        if (selected && selected.code === c.code) {
          ctx.fillStyle = `rgba(${rgb},0.95)`;
          ctx.font = `bold 10px Cairo, sans-serif`;
          ctx.textAlign = "center";
          ctx.fillText(c.flag + " " + c.name, p.x, p.y - sz - 7);
        }
      });
      ctx.restore();

      // Specular highlight
      const hl = ctx.createRadialGradient(cx - r*.38, cy - r*.38, 0, cx, cy, r);
      hl.addColorStop(0, "rgba(255,255,255,.08)"); hl.addColorStop(.4, "transparent"); hl.addColorStop(1, "rgba(0,0,0,.6)");
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.fillStyle = hl; ctx.fill();
      // Rim light
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2);
      ctx.strokeStyle = "rgba(210,20,20,.6)"; ctx.lineWidth = 2; ctx.stroke();
    };
    const loop = () => {
      rotRef.current = (rotRef.current + globeSpeed) % 360;
      draw();
      rafRef.current = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(rafRef.current);
  }, [selected, globeSpeed]);

  // AI analysis (Connected to real Node Server)
  const analyze = async c => {
    setSelected(c);
    setAiLoading(true);
    setAiText("");
    setActiveTab("ai");

    const currencyRate = curr[c.currency]?.rate || "غير متوفر";
    const stability = (stats.currency_meta && stats.currency_meta[c.currency])?.stability || 70;
    
    const promptText = `
      حلل سوق ${c.name} لصالح منصة DRESS ON ME (منصة أزياء إلكترونية).
      البيانات المتاحة:
      - العملة: ${c.currency}
      - سعر الصرف الحالي مقابل USD: ${currencyRate}
      - استقرار العملة (مؤشر 0-100): ${stability}
      - الإيرادات السنوية: ${c.revenue} دولار أمريكي
      - معدل النمو السنوي: ${c.growth || 0}%
      - عدد البائعين النشطين: ${c.sellers}
      - عدد المشترين النشطين: ${c.buyers}
      - نسبة المرتجعات: ${c.returns || 0}%

      المطلوب:
      1. تقييم فرص التوسع في هذا السوق.
      2. ذكر التحديات المحتملة (خاصة المتعلقة بتقلبات العملة إن وجدت).
      3. تقديم نصيحة عملية واحدة لإدارة المبيعات أو التسويق.
      4. توقع الأداء خلال الـ 12 شهراً القادمة بناءً على النمو الحالي واستقرار العملة.

      أجب باللغة العربية في فقرات قصيرة وواضحة.
    `;

    try {
      const res = await fetch("http://localhost:3001/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: promptText }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setAiText(data.text || "لم يتم الحصول على رد من الذكاء الاصطناعي.");
    } catch (error) {
      console.error("❌ تحليل AI فشل:", error);
      setAiText(`⚠️ فشل التحليل: ${error.message}\nتأكد من تشغيل الخادم (node server.js) وصحة مفتاح الـ API.`);
    } finally {
      setAiLoading(false);
    }
  };

  const [stats, setStats] = useState({
     kpis: { total_users: 0, total_sellers: 0, total_buyers: 0, total_orders: 0, total_revenue: 0, total_profit: 0 },
     monthly_data: [], weekly_data: [], yearly_data: [], best_selling: [], recent_orders: [], top_sellers: [], countries: [], currency_meta: {}, radar_data: []
  });

  // Computed stats from real backend API
  const totalSellers = stats.kpis.total_sellers || 0;
  const totalBuyers  = stats.kpis.total_buyers || 0;
  const totalUsers   = stats.kpis.total_users || 0;
  const totalRev     = stats.kpis.total_revenue || 0;
  const totalProfit  = stats.kpis.total_profit || 0;
  const cList = stats.countries || [];
  const avgRet = cList.length > 0 ? (cList.reduce((s, c) => s + (c.returns || 0), 0) / cList.length).toFixed(1) : "0.0";
  const gross12      = stats.kpis.total_revenue || 0;
  const chartData    = period === "weekly" ? stats.weekly_data : period === "yearly" ? stats.yearly_data : stats.monthly_data;

  const filteredCountries = [...cList]
    .filter(c => !searchQ || c.name.includes(searchQ) || (c.code && c.code.toLowerCase().includes(searchQ.toLowerCase())))
    .sort((a, b) => {
      if (sortBy === "revenue") return b.revenue - a.revenue;
      if (sortBy === "growth") return b.growth - a.growth;
      if (sortBy === "sellers") return b.sellers - a.sellers;
      if (sortBy === "buyers") return b.buyers - a.buyers;
      if (sortBy === "returns") return a.returns - b.returns;
      return 0;
    });

  const [dynamicCountries, setDynamicCountries] = useState([]);

  useEffect(() => {
    const updated = cList.map(country => {
      const rate = curr[country.currency]?.rate || 1;
      const revenueLocal = country.revenue * rate;
      return { ...country, revenueLocal: Math.round(revenueLocal) };
    });
    setDynamicCountries(updated);
  }, [curr, cList]);

  const oppCountries = [...cList].sort((a, b) =>
    ((stats.currency_meta && stats.currency_meta[a.currency]?.stability) || 70) - ((stats.currency_meta && stats.currency_meta[b.currency]?.stability) || 70)
  ).slice(0, 6);

  const S = {
    page: { background: "#03000a", minHeight: "100vh", color: "#eee", fontFamily: "'Cairo', 'Segoe UI', sans-serif", direction: "rtl", overflowX: "hidden" },
    card: {
     background: "linear-gradient(145deg,#0e0002 0%,#150006 60%,#0a0002 100%)",
     border: "1px solid rgba(200,0,0,.2)",
     borderRadius: 16,
     padding: 16,
     position: "relative",
     overflow: "hidden",
     minWidth: 0,
     minHeight: 0,
  },
    label: { fontSize: 11, color: "#cc0000", fontWeight: 700, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 },
    tt: { background: "#1a0008", border: "1px solid #cc000088", borderRadius: 8, fontSize: 12, color: "#eee" },
  };

  const tabs = [
    { id: "overview", label: "نظرة عامة", icon: "📊" },
    { id: "globe", label: "الخريطة العالمية", icon: "🌍" },
    { id: "finance", label: "المالية", icon: "💹" },
    { id: "sellers", label: "أعلى البائعين", icon: "🏆" },
    { id: "ai", label: "تحليل AI", icon: "🤖" },
  ];

  const submitPin = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('users/verify-dashboard-pin/', { pin: authPin });
      if (res.data.success) {
        localStorage.setItem('dashboard_pin', authPin);
        setIsAuthorized(true);
        setAuthError("");
        window.location.reload();
      } else {
        setAuthError("Invalid PIN");
      }
    } catch (err) {
      setAuthError("Invalid PIN");
    }
  };

  if (!isAuthorized) {
    return (
      <div style={{
        minHeight: "100vh", backgroundColor: "#0b0f19", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', sans-serif"
      }}>
        <div style={{
          background: "rgba(30, 41, 59, 0.7)", backdropFilter: "blur(12px)", padding: "40px", borderRadius: "16px",
          border: "1px solid rgba(255,255,255,0.1)", width: "100%", maxWidth: "400px", textAlign: "center", boxShadow: "0 20px 40px rgba(0,0,0,0.5)"
        }}>
          <h2 style={{ color: "#fff", fontWeight: 800, marginBottom: "20px" }}>Admin Access</h2>
          <p style={{ color: "#94a3b8", marginBottom: "30px" }}>Please enter the dashboard PIN to continue.</p>
          <form onSubmit={submitPin}>
            <input 
              type="password" 
              placeholder="Enter PIN" 
              value={authPin}
              onChange={(e) => setAuthPin(e.target.value)}
              style={{
                width: "100%", padding: "14px 20px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(0,0,0,0.2)", color: "#fff", fontSize: "16px", marginBottom: "15px", outline: "none",
                textAlign: "center", letterSpacing: "2px"
              }}
              autoFocus
            />
            {authError && <p style={{ color: "#ef4444", fontSize: "14px", marginBottom: "15px", fontWeight: 500 }}>{authError}</p>}
            <button 
              type="submit"
              style={{
                width: "100%", padding: "14px", borderRadius: "8px", border: "none",
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff", fontWeight: 700, fontSize: "16px",
                cursor: "pointer", transition: "transform 0.2s, box-shadow 0.2s"
              }}
              onMouseOver={(e) => e.target.style.transform = "translateY(-2px)"}
              onMouseOut={(e) => e.target.style.transform = "none"}
            >
              Verify & Enter
            </button>
            <Link to="/home" style={{ display: "block", marginTop: "20px", color: "#94a3b8", textDecoration: "none", fontSize: "14px" }}>
              &larr; Return to Home
            </Link>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={S.page}>
           <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;900&family=Orbitron:wght@500;700;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:4px;background:#04000a;}::-webkit-scrollbar-thumb{background:#880000;border-radius:2px;}
        .card-shine::before{content:'';position:absolute;top:0;left:0;right:0;height:1.5px;background:linear-gradient(90deg,transparent,#cc0000 30%,#ff4444 50%,#cc0000 70%,transparent);}
        .card-shine:hover{border-color:rgba(200,0,0,.5)!important;box-shadow:0 0 30px rgba(200,0,0,.08)!important;transition:all .3s;}
        .crow{padding:8px 10px;border-bottom:1px solid rgba(200,0,0,.07);cursor:pointer;border-radius:8px;display:flex;align-items:center;justify-content:space-between;transition:all .18s;}
        .crow:hover{background:rgba(200,0,0,.12);transform:translateX(-3px);}
        .crow.active{background:rgba(200,0,0,.18);border-color:rgba(200,0,0,.3);}
        .tab-btn{padding:8px 18px;border-radius:8px;border:1px solid rgba(200,0,0,.25);background:rgba(200,0,0,.04);color:#888;cursor:pointer;font-family:'Cairo',sans-serif;font-size:12px;transition:all .22s;white-space:nowrap;}
        .tab-btn.on{background:linear-gradient(135deg,#aa0000,#880000);color:#fff;border-color:#cc0000;box-shadow:0 0 20px rgba(200,0,0,.3);}
        .tab-btn:hover:not(.on){background:rgba(200,0,0,.1);color:#ddd;}
        .pbtn{padding:5px 13px;border-radius:6px;border:1px solid rgba(200,0,0,.25);background:transparent;color:#888;cursor:pointer;font-family:'Cairo',sans-serif;font-size:11px;transition:all .2s;}
        .pbtn.on{background:#aa0000;color:#fff;border-color:#cc0000;}
        .pbtn:hover:not(.on){background:rgba(200,0,0,.12);}
        @keyframes pulse{0%,100%{opacity:1;}50%{opacity:.4;}}
        @keyframes glow-pulse{0%,100%{box-shadow:0 0 8px rgba(255,0,0,.4);}50%{box-shadow:0 0 20px rgba(255,0,0,.8);}}
        @keyframes scroll{0%{transform:translateX(0);}100%{transform:translateX(-50%);}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(-8px);}to{opacity:1;transform:translateY(0);}}
        @keyframes slideIn{from{opacity:0;transform:translateX(30px);}to{opacity:1;transform:translateX(0);}}
        @keyframes float{0%,100%{transform:translateY(0);}50%{transform:translateY(-4px);}}
        .dot3 span{display:inline-block;width:7px;height:7px;border-radius:50%;background:#cc0000;margin:0 3px;animation:pulse 1.4s ease-in-out infinite;}
        .dot3 span:nth-child(2){animation-delay:.28s;}.dot3 span:nth-child(3){animation-delay:.56s;}
        .ai-box{background:rgba(0,0,0,.5);border:1px solid rgba(200,0,0,.25);border-radius:10px;padding:16px;white-space:pre-wrap;font-size:13px;line-height:2;max-height:360px;overflow-y:auto;color:#ccc;animation:fadeIn .4s ease;}
        .opp-badge{display:inline-flex;align-items:center;gap:5px;padding:5px 12px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;transition:all .2s;}
        .opp-badge:hover{transform:scale(1.05);}
        .ticker-inner{display:flex;gap:0;animation:scroll 35s linear infinite;white-space:nowrap;}
        .ticker-inner:hover{animation-play-state:paused;}
        .titem{display:inline-flex;align-items:center;gap:8px;padding:5px 18px;border-right:1px solid rgba(200,0,0,.12);cursor:pointer;transition:background .2s;}
        .titem:hover{background:rgba(200,0,0,.12);}
        .kpi-card{background:linear-gradient(145deg,#100002,#180005);border:1px solid rgba(200,0,0,.18);border-radius:14px;padding:16px 18px;position:relative;overflow:hidden;transition:all .25s;}
        .kpi-card:hover{border-color:rgba(200,0,0,.45);transform:translateY(-2px);box-shadow:0 8px 30px rgba(200,0,0,.12);}
        .kpi-card::after{content:'';position:absolute;bottom:-20px;right:-20px;width:80px;height:80px;border-radius:50%;background:radial-gradient(circle,rgba(200,0,0,.1),transparent);}
        .notif-toast{position:fixed;top:70px;left:20px;z-index:999;animation:slideIn .3s ease;}
        .search-inp{background:rgba(200,0,0,.06);border:1px solid rgba(200,0,0,.2);border-radius:8px;padding:6px 12px;color:#eee;font-family:'Cairo',sans-serif;font-size:12px;outline:none;width:100%;transition:border-color .2s;}
        .search-inp:focus{border-color:rgba(200,0,0,.5);}
        .search-inp::placeholder{color:#555;}
        .globe-ctrl{background:rgba(200,0,0,.08);border:1px solid rgba(200,0,0,.2);border-radius:6px;padding:3px 10px;color:#aaa;font-family:monospace;font-size:11px;cursor:pointer;transition:all .2s;}
        .globe-ctrl:hover{background:rgba(200,0,0,.15);color:#fff;}
        @media (max-width: 1024px) {
          .dash-header { flex-direction: column !important; align-items: center !important; gap: 15px !important; }
          .dash-header > div { justify-content: center !important; }
          .grid-globe { grid-template-columns: 1fr !important; }
          .grid-3 { grid-template-columns: repeat(2, 1fr) !important; }
          .grid-2 { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 768px) {
          .grid-3 { grid-template-columns: 1fr !important; }
          .header-kpis { flex-wrap: wrap !important; justify-content: center !important; gap: 10px !important; }
          .globe-canvas-wrap canvas { width: 100% !important; height: auto !important; max-width: 350px !important; }
          .tab-btn { font-size: 11px !important; padding: 8px 12px !important; }
          .kpi-row { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 480px) {
          .kpi-row { grid-template-columns: 1fr !important; }
          .header-kpis > div { width: 45% !important; margin-bottom: 5px; }
        }
      `}</style>
      {/* ── HEADER ── */}
      <div className="dash-header" style={{ background: "linear-gradient(180deg,#120003 0%,#08000188 100%)", borderBottom: "1px solid rgba(200,0,0,.3)", padding: "10px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, position: "sticky", top: 0, zIndex: 100, backdropFilter: "blur(10px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
  <Link to="/Home" style={{ color: "#cc0000", textDecoration: "none", fontSize: 28, display: "flex", alignItems: "center", transition: "0.2s" }} title="الرئيسية">
    🏠
  </Link>
  <div style={{ animation: "float 3s ease-in-out infinite" }}>
    <span style={{ fontFamily: "'Orbitron',monospace", fontSize: 22, fontWeight: 900, background: "linear-gradient(135deg,#ff2222,#ff8888,#ff4444)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: 2 }}>
      DRESS ON ME
    </span>
  </div>
  <span style={{ background: "rgba(200,0,0,.15)", border: "1px solid rgba(200,0,0,.4)", borderRadius: 4, padding: "2px 10px", fontSize: 10, color: "#ff8888", fontFamily: "monospace", animation: "glow-pulse 2.5s infinite" }}>
    ⚡ AI LIVE DASHBOARD
  </span>
</div>

        <div className="header-kpis" style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center" }}>
          {[
            { lbl: "المستخدمون", val: fmt(totalUsers), icon: "👥", clr: "#fff" },
            { lbl: "البائعون", val: fmt(totalSellers), icon: "🏪", clr: "#ff6060" },
            { lbl: "المشترون", val: fmt(totalBuyers), icon: "🛍️", clr: "#ffaa44" },
            { lbl: "الإيرادات", val: `$${fmt(totalRev)}`, icon: "💰", clr: "#44ffaa" },
            { lbl: "صافي الربح", val: `$${fmt(totalProfit)}`, icon: "📊", clr: "#66aaff" },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "#666", marginBottom: 1 }}>{s.icon} {s.lbl}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: s.clr }}>{s.val}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ position: "relative" }}>
            <button onClick={() => setShowNotif(!showNotif)} style={{ background: "none", border: "1px solid rgba(200,0,0,.3)", borderRadius: 8, padding: "5px 10px", color: "#cc0000", cursor: "pointer", fontSize: 14 }}>
              🔔 {notifications.length > 0 && <span style={{ background: "#cc0000", color: "#fff", borderRadius: "50%", fontSize: 9, padding: "1px 5px", marginRight: 4 }}>{notifications.length}</span>}
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#00ff88", boxShadow: "0 0 10px #00ff88", animation: "pulse 2s infinite" }} />
            <span style={{ fontSize: 11, color: "#00ff88", fontFamily: "monospace" }}>LIVE</span>
          </div>
        </div>
      </div>

      {/* Notifications panel */}
      {showNotif && notifications.length > 0 && (
        <div className="notif-toast" style={{ background: "#100002", border: "1px solid rgba(200,0,0,.4)", borderRadius: 12, padding: 12, width: 280, maxHeight: 260, overflowY: "auto" }}>
          <div style={{ fontSize: 11, color: "#cc0000", fontWeight: 700, marginBottom: 8 }}>🚨 تنبيهات العملات</div>
          {notifications.map(n => (
            <div key={n.id} style={{ fontSize: 11, padding: "5px 0", borderBottom: "1px solid rgba(200,0,0,.1)", color: n.type === "opp" ? "#ff8844" : "#ff4444" }}>
              {n.msg} <span style={{ color: "#555", fontSize: 10 }}>· {n.time}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── CURRENCY TICKER ── */}
      <div style={{ background: "#07000188", borderBottom: "1px solid rgba(200,0,0,.15)", padding: "4px 0", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <span style={{ fontSize: 10, color: "#cc0000", fontWeight: 700, padding: "0 14px", borderLeft: "1px solid rgba(200,0,0,.3)", whiteSpace: "nowrap", flexShrink: 0 }}>💱 أسعار مباشرة</span>
          <div style={{ overflow: "hidden", flex: 1 }}>
            <div className="ticker-inner">
              {[...Object.entries(curr), ...Object.entries(curr)].map(([k, v], i) => {
                const up = v.change > 0;
                const opp = (stats.currency_meta && stats.currency_meta[k])?.stability < 60;
                return (
                  <div key={i} className="titem" style={{ background: opp ? "rgba(200,0,0,.06)" : "transparent" }}
                    onClick={() => { const c = (stats.countries || []).find(x => x.currency === k); if (c) analyze(c); }}>
                    <span style={{ fontSize: 13 }}>{v.flag}</span>
                    <span style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 600 }}>{k}</span>
                    <span style={{ fontFamily: "monospace", fontSize: 11, color: "#ccc" }}>{v.rate.toFixed(3)}</span>
                    <Sparkline data={v.history} color={up ? "#ff5555" : "#44ff88"} width={40} height={18} />
                    <span style={{ fontSize: 10, color: up ? "#ff5555" : "#44ff88", fontWeight: 700 }}>{up ? "▲" : "▼"}{Math.abs(v.change).toFixed(2)}%</span>
                    {opp && <span style={{ fontSize: 9, color: "#ff3333", fontWeight: 700, border: "1px solid rgba(255,50,50,.35)", borderRadius: 3, padding: "0 4px", animation: "pulse 2s infinite" }}>فرصة</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── TABS ── */}
      <div style={{ display: "flex", gap: 8, padding: "12px 16px", borderBottom: "1px solid rgba(200,0,0,.12)", overflowX: "auto" }}>
        {tabs.map(t => (
          <button key={t.id} className={`tab-btn${activeTab === t.id ? " on" : ""}`} onClick={() => setActiveTab(t.id)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === "overview" && (
        <div style={{ padding: 16 }}>
          {/* KPI row */}
          <div className="kpi-row" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 16 }}>
            {[
              { lbl: "إجمالي الطلبات",   val: stats ? fmt(stats.kpis?.total_orders || 0) : "47,284", icon: "📦", clr: "#ff6666", sub: stats ? `من ${stats.kpis?.total_buyers || 0} مشترين` : "+12.4% هذا الشهر" },
              { lbl: "إجمالي الأرباح", val: stats ? `$${fmt(stats.kpis?.total_profit || 0)}` : "$1,420", icon: "💎", clr: "#ffaa44", sub: "هامش ربح تقريبي" },
              { lbl: "مستخدمين نشطين",   val: stats ? fmt(stats.kpis?.total_users || 0) : "8,940", icon: "👥", clr: "#44ff88", sub: stats ? `بائعون: ${stats.kpis?.total_sellers || 0}` : "تفاعل عالي" },
              { lbl: "دول مسجلة",         val: stats ? `${stats.kpis?.total_countries || cList.length || 0} دولة` : "15 دولة", icon: "🌍", clr: "#44aaff", sub: `${cList.length} دولة نشطة` },
              { lbl: "معدل المرتجعات",    val: `${avgRet}%`,       icon: "🔄", clr: avgRet > 6 ? "#ff4444" : "#ffcc44", sub: avgRet > 6 ? "⚠️ أعلى من المتوسط" : "✅ أقل من المتوسط العالمي" },
              { lbl: "إجمالي الإيرادات",  val: `$${fmt(stats ? (stats.kpis?.total_revenue || 0) : gross12)}`, icon: "💹", clr: "#ff88ff", sub: "حتى الآن" },
            ].map((k, i) => (
              <div key={i} className="kpi-card">
                <div style={{ fontSize: 22, marginBottom: 6 }}>{k.icon}</div>
                <div style={{ fontSize: 11, color: "#666", marginBottom: 2 }}>{k.lbl}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: k.clr, fontFamily: "'Orbitron',monospace" }}>{k.val}</div>
                <div style={{ fontSize: 10, color: "#555", marginTop: 4 }}>{k.sub}</div>
              </div>
            ))}
          </div>

          <div className="grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 14 }}>
            {/* Users pie */}
            <div style={S.card} className="card-shine">
              <div style={S.label}>📊 توزيع المستخدمين</div>
              <div style={{ height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      data={(totalSellers === 0 && totalBuyers === 0) ? [{ n: "لا يوجد بيانات", v: 1 }] : [{ n: "بائعون", v: totalSellers }, { n: "مشترون", v: totalBuyers }]} 
                      cx="50%" cy="50%" innerRadius={50} outerRadius={72} dataKey="v" paddingAngle={5} nameKey="n"
                    >
                      {((totalSellers === 0 && totalBuyers === 0) ? [{ n: "لا يوجد بيانات", v: 1 }] : [{ n: "بائعون", v: totalSellers }, { n: "مشترون", v: totalBuyers }]).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={(totalSellers === 0 && totalBuyers === 0) ? "#444" : ["#cc0000", "#ff6600"][index]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={v => fmt(v)} contentStyle={S.tt} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: "flex", gap: 16, justifyContent: "center", fontSize: 12 }}>
                {[["بائعون", "#cc0000", totalSellers], ["مشترون", "#ff6600", totalBuyers]].map(([n, c, v]) => (
                  <div key={n} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: c }} />
                    <span style={{ color: "#888" }}>{n}</span>
                    <span style={{ color: "#fff", fontWeight: 700 }}>{fmt(v)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Radar */}
            <div style={S.card} className="card-shine">
              <div style={S.label}>⚡ معدلات التفاعل</div>
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={(stats.radar_data || [])}>
                    <PolarGrid stroke="rgba(200,0,0,.2)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: "#888", fontSize: 11 }} />
                    <Radar dataKey="A" stroke="#cc0000" fill="#cc0000" fillOpacity={0.25} strokeWidth={2} />
                    <Tooltip contentStyle={S.tt} formatter={v => [`${v}%`, "المعدل"]} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Returns */}
            <div style={S.card} className="card-shine">
              <div style={S.label}>🔄 نسبة المرتجعات بالدول</div>
              <div style={{ textAlign: "center", padding: "6px 0 8px" }}>
                <div style={{ fontSize: 42, fontWeight: 900, color: "#ff7744", fontFamily: "'Orbitron',monospace" }}>{avgRet}%</div>
                <div style={{ fontSize: 10, color: "#666" }}>المتوسط العالمي للمنصة</div>
              </div>
              <div style={{ fontSize: 11 }}>
                {filteredCountries.slice(0, 7).map(c => (
                  <div key={c.code} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 0", borderBottom: "1px solid rgba(200,0,0,.07)" }}>
                    <span style={{ color: "#999" }}>{c.flag} {c.name}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 60, height: 4, background: "rgba(255,255,255,.06)", borderRadius: 2 }}>
                        <div style={{ width: `${(c.returns / 10) * 100}%`, height: "100%", background: c.returns > 6 ? "#ff4444" : c.returns > 4 ? "#ff8844" : "#44ff88", borderRadius: 2 }} />
                      </div>
                      <span style={{ color: c.returns > 6 ? "#ff4444" : "#888", fontWeight: c.returns > 6 ? 700 : 400, width: 30, textAlign: "right" }}>{c.returns}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── GLOBE TAB ── */}
      {activeTab === "globe" && (
        <div className="grid-globe" style={{ padding: 16, display: "grid",gridTemplateColumns: "minmax(0,1fr) 320px", gap: 16 }}>
          <div style={S.card} className="card-shine">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={S.label}>🌍 خريطة المبيعات العالمية التفاعلية</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 10, color: "#666" }}>سرعة الدوران:</span>
                <button className="globe-ctrl" onClick={() => setGlobeSpeed(s => Math.max(0, s - 0.04))}>−</button>
                <button className="globe-ctrl" onClick={() => setGlobeSpeed(0)}>⏸</button>
                <button className="globe-ctrl" onClick={() => setGlobeSpeed(0.14)}>▶</button>
                <button className="globe-ctrl" onClick={() => setGlobeSpeed(s => Math.min(0.5, s + 0.04))}>+</button>
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12, fontSize: 10, color: "#777" }}>
              {[["#ff2828", "فرصة عالية (استقرار < 45%)"], ["#ff8800", "فرصة متوسطة (45-65%)"], ["#ffcc00", "مستقر نسبياً (65-80%)"], ["#4488ff", "مستقر جداً (> 80%)"]].map(([c, l]) => (
                <span key={l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ display: "inline-block", width: 9, height: 9, borderRadius: "50%", background: c, boxShadow: `0 0 6px ${c}` }} />
                  {l}
                </span>
              ))}
            </div>

            <div className="globe-canvas-wrap" style={{ display: "flex", justifyContent: "center", position: "relative" }}>
              <canvas ref={canvasRef} width={420} height={420} style={{ borderRadius: "50%", display: "block", cursor: "pointer" }} />
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", textAlign: "center", pointerEvents: "none" }}>
                <div style={{ fontFamily: "'Orbitron',monospace", fontSize: 28, fontWeight: 900, background: "linear-gradient(135deg,#ff4444,#ff9966)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  ${fmt(totalRev)}
                </div>
                <div style={{ fontSize: 9, color: "#ff8888", marginTop: 3 }}>إجمالي المبيعات</div>
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 11, color: "#cc0000", fontWeight: 700, marginBottom: 8 }}>🚨 تنبيهات الفرص — انقر للتحليل الذكي</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {oppCountries.map(c => {
                  const stab = (stats.currency_meta && stats.currency_meta[c.currency])?.stability || 70;
                  const oc = oppColor(stab);
                  return (
                    <div key={c.code} className="opp-badge"
                      style={{ background: `${oc}18`, color: oc, border: `1px solid ${oc}44`, animation: stab < 50 ? "pulse 2s infinite" : "none" }}
                      onClick={() => analyze(c)}>
                      {c.flag} {c.name} · {curr[c.currency]?.rate?.toFixed(2)}
                      {stab < 50 && <span style={{ fontSize: 9 }}>🔥</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Country list */}
          <div style={S.card} className="card-shine">
            <div style={{ ...S.label, justifyContent: "space-between" }}>
              <span>🌐 البلدان</span>
              <select onChange={e => setSortBy(e.target.value)} value={sortBy}
                style={{ background: "#0e0002", border: "1px solid rgba(200,0,0,.3)", borderRadius: 6, color: "#cc0000", fontSize: 10, padding: "2px 6px", cursor: "pointer" }}>
                <option value="revenue">إيرادات</option>
                <option value="growth">نمو</option>
                <option value="sellers">بائعون</option>
                <option value="buyers">مشترون</option>
                <option value="returns">مرتجعات</option>
              </select>
            </div>
            <input className="search-inp" placeholder="🔍 ابحث عن دولة..." value={searchQ} onChange={e => setSearchQ(e.target.value)} style={{ marginBottom: 10 }} />
            <div style={{ overflowY: "auto", maxHeight: 560 }}>
              {filteredCountries.map(c => {
                const pct = ((c.revenue / totalRev) * 100).toFixed(1);
                const stab = (stats.currency_meta && stats.currency_meta[c.currency])?.stability || 70;
                const oc = oppColor(stab);
                const cv = curr[c.currency];
                return (
                  <div key={c.code} className={`crow${selected?.code === c.code ? " active" : ""}`} onClick={() => analyze(c)}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                      <span style={{ fontSize: 18 }}>{c.flag}</span>
                      <div>
                        <div style={{ color: "#ddd", fontWeight: 500, fontSize: 12 }}>{c.name}</div>
                        <div style={{ fontSize: 10, color: "#555", display: "flex", gap: 6 }}>
                          <span>🏪{c.sellers}</span><span>🛍️{c.buyers}</span>
                          <span style={{ color: oc }}>★{stab}%</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: "left", direction: "ltr" }}>
                      <div style={{ fontSize: 11, fontWeight: 600 }}>${fmt(c.revenue)}</div>
                      <div style={{ fontSize: 10, color: oc, fontWeight: 700 }}>{pct}%</div>
                      <div style={{ fontSize: 9, color: cv?.change > 0 ? "#ff5555" : "#44ff88" }}>
                        {cv?.change > 0 ? "▲" : "▼"}{Math.abs(cv?.change || 0).toFixed(2)}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── FINANCE TAB ── */}
      {activeTab === "finance" && (
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Period selector + chart */}
          <div style={S.card} className="card-shine">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={S.label}>📈 الأرباح والإيرادات</div>
              <div style={{ display: "flex", gap: 6 }}>
                {["weekly", "monthly", "yearly"].map(p => (
                  <button key={p} className={`pbtn${period === p ? " on" : ""}`} onClick={() => setPeriod(p)}>
                    {p === "weekly" ? "أسبوعي" : p === "yearly" ? "سنوي" : "شهري"}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ height: 240, width: "100%", minWidth: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="ga" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#cc0000" stopOpacity={.45} /><stop offset="95%" stopColor="#cc0000" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gb" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ff6600" stopOpacity={.3} /><stop offset="95%" stopColor="#ff6600" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(200,0,0,.1)" />
                  <XAxis dataKey="m" tick={{ fontSize: 10, fill: "#666" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#666" }} tickFormatter={fmt} />
                  <Tooltip contentStyle={S.tt} formatter={(v, n) => [fmt(v), n === "profit" ? "صافي الربح" : n === "gross" ? "الربح الإجمالي" : "الإيرادات"]} />
                  <Area type="monotone" dataKey="revenue" stroke="#ff440033" fill="url(#gb)" strokeWidth={1} />
                  <Area type="monotone" dataKey="gross" stroke="#ff6600" fill="url(#gb)" strokeWidth={1.5} />
                  <Line type="monotone" dataKey="profit" stroke="#ff3333" strokeWidth={2.5} dot={{ fill: "#ff3333", r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gross profit bar + currency stability */}
          <div className="grid-2" style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 14 }}>
            <div style={S.card} className="card-shine">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={S.label}>💹 Gross Profit Tracker</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#ff8844" }}>${fmt(gross12)} <span style={{ fontSize: 10, color: "#555" }}>/ سنة</span></div>
              </div>
              <div style={{ height: 160 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={(stats.monthly_data || [])} margin={{ top: 0, right: 4, left: -14, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(71, 44, 44, 0.08)" />
                    <XAxis dataKey="m" tick={{ fontSize: 9, fill: "#555" }} />
                    <YAxis tick={{ fontSize: 9, fill: "#555" }} tickFormatter={fmt} />
                    <Tooltip contentStyle={S.tt} formatter={v => [fmt(v), "الربح الإجمالي"]} />
                    <Bar dataKey="gross" radius={[4, 4, 0, 0]}>
                      {(stats.monthly_data || []).map((_, i) => <Cell key={i} fill={`hsl(${8 + i * 3},90%,${30 + i * 2.5}%)`} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={S.card} className="card-shine">
              <div style={S.label}>💱 استقرار العملات الحية</div>
              <div style={{ overflowY: "auto", maxHeight: 200 }}>
                {Object.entries(stats.currency_meta || {}).sort((a, b) => a[1].stability - b[1].stability).map(([k, v]) => {
                  const cv = curr[k];
                  const oc = oppColor(v.stability);
                  return (
                    <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: "1px solid rgba(200,0,0,.07)" }}>
                      <span style={{ fontSize: 14 }}>{v.flag}</span>
                      <span style={{ fontFamily: "monospace", fontSize: 11, color: "#aaa", width: 35 }}>{k}</span>
                      <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,.06)", borderRadius: 2 }}>
                        <div style={{ width: `${v.stability}%`, height: "100%", background: oc, borderRadius: 2 }} />
                      </div>
                      <span style={{ fontSize: 10, color: oc, fontWeight: 700, width: 30, textAlign: "right" }}>{v.stability}%</span>
                      <span style={{ fontFamily: "monospace", fontSize: 10, color: cv?.change > 0 ? "#ff5555" : "#44ff88", width: 52, textAlign: "right" }}>
                        {cv?.change > 0 ? "▲" : "▼"}{Math.abs(cv?.change || 0).toFixed(2)}%
                      </span>
                      <Sparkline data={cv?.history || [v.base]} color={oppColor(v.stability)} width={45} height={20} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SELLERS TAB ── */}
      {activeTab === "sellers" && (
        <div style={{ padding: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 14, marginBottom: 14 }}>
            <div style={S.card} className="card-shine">
              <div style={S.label}>🏆 أعلى 5 حسابات تجارية</div>
              {(stats.top_sellers || []).map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: i < 4 ? "1px solid rgba(200,0,0,.1)" : "none" }}>
                  <div style={{ width: 34, height: 34, borderRadius: "50%", background: `linear-gradient(135deg,${["#cc0000", "#dd2200", "#ee4400", "#ff6600", "#ff8800"][i]},#440000)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 900, flexShrink: 0, boxShadow: `0 0 12px ${["#cc000055", "#dd220055", "#ee440055", "#ff660055", "#ff880055"][i]}` }}>
                    {["🥇", "🥈", "🥉", "4", "5"][i]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: "#eee", fontWeight: 600 }}>{s.country} {s.name}</div>
                    <div style={{ fontSize: 10, color: "#666" }}>{s.cat} · {s.orders.toLocaleString()} طلب</div>
                    <div style={{ height: 3, background: "rgba(255,255,255,.06)", borderRadius: 2, marginTop: 5 }}>
                      <div style={{ width: `${(s.revenue / (stats.top_sellers?.[0]?.revenue || 1)) * 100}%`, height: "100%", background: `linear-gradient(90deg,${["#cc0000", "#dd2200", "#ee4400", "#ff6600", "#ff8800"][i]},transparent)`, borderRadius: 2 }} />
                    </div>
                  </div>
                  <div style={{ textAlign: "left", direction: "ltr" }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>${fmt(s.revenue)}</div>
                    <div style={{ fontSize: 11, color: "#44ff88", fontWeight: 700 }}>+{s.growth}%</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={S.card} className="card-shine">
              <div style={S.label}>📊 مقارنة إيرادات أعلى البائعين</div>
              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={(stats.top_sellers || [])} layout="vertical" margin={{ top: 5, right: 20, left: 80, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(200,0,0,.08)" horizontal={false} />
                    <XAxis type="number" tickFormatter={fmt} tick={{ fontSize: 10, fill: "#666" }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#aaa" }} />
                    <Tooltip contentStyle={S.tt} formatter={v => [`$${fmt(v)}`, "الإيرادات"]} />
                    <Bar dataKey="revenue" radius={[0, 6, 6, 0]}>
                      {(stats.top_sellers || []).map((_, i) => <Cell key={i} fill={`hsl(${i * 12},90%,${40 + i * 5}%)`} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* All countries revenue */}
          <div style={S.card} className="card-shine">
            <div style={S.label}>🌐 إيرادات جميع الدول</div>
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[...(stats.countries || [])].sort((a, b) => b.revenue - a.revenue)} margin={{ top: 5, right: 10, left: -5, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(200,0,0,.08)" />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#666" }} angle={-30} textAnchor="end" interval={0} />
                  <YAxis tickFormatter={fmt} tick={{ fontSize: 9, fill: "#666" }} />
                  <Tooltip contentStyle={S.tt} formatter={v => [`$${fmt(v)}`, "الإيرادات"]}
                    labelFormatter={(l) => { const c = (stats.countries || []).find(x => x.name === l); return c ? `${c.flag} ${c.name}` : l; }} />
                  <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                    {[...(stats.countries || [])].sort((a, b) => b.revenue - a.revenue).map((c, i) => {
                      const stab = (stats.currency_meta && stats.currency_meta[c.currency])?.stability || 70;
                      return <Cell key={i} fill={oppColor(stab)} opacity={0.7 + i * 0.02} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ── AI TAB ── */}
      {activeTab === "ai" && (
        <div style={{ padding: 16 }}>
          <div style={S.card} className="card-shine">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 14, color: "#cc0000", fontWeight: 700 }}>المحلل الذكي للأسواق</div>
              {selected && (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 24 }}>{selected.flag}</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{selected.name}</div>
                    <div style={{ fontSize: 11, color: "#888" }}>
                      {selected.currency} = {curr[selected.currency]?.rate?.toFixed(4)} $
                      <span style={{ marginRight: 8, color: (stats.currency_meta || {})[selected.currency]?.stability < 60 ? "#ff4444" : "#44ff88" }}>
                        {(stats.currency_meta || {})[selected.currency]?.stability < 60 ? "🔴 فرصة!" : "🟢 مستقر"}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {!selected ? (
              <div style={{ textAlign: "center", padding: "50px 20px", color: "#555", fontSize: 13 }}>
                <div style={{ fontSize: 52, marginBottom: 14, animation: "float 3s infinite" }}>🌍</div>
                <div style={{ color: "#888", marginBottom: 20 }}>اختر دولة من تبويب الخريطة أو من الأزرار أدناه</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                  {oppCountries.map(c => {
                    const oc = oppColor((stats.currency_meta && stats.currency_meta[c.currency])?.stability || 70);
                    return (
                      <button key={c.code} onClick={() => analyze(c)} className="opp-badge"
                        style={{ background: `${oc}18`, color: oc, border: `1px solid ${oc}44`, padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontFamily: "'Cairo',sans-serif" }}>
                        {c.flag} {c.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 16 }}>
                <div>
                  <div style={{ fontSize: 11, color: "#888", marginBottom: 10 }}>📊 إحصائيات تفصيلية</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
                    {[
                      { lbl: "البائعون", val: fmt(selected.sellers), clr: "#ff6060" },
                      { lbl: "المشترون", val: fmt(selected.buyers), clr: "#ffaa44" },
                      { lbl: "الإيرادات", val: `$${fmt(selected.revenue)}`, clr: "#44ffaa" },
                      { lbl: "المرتجعات", val: `${selected.returns}%`, clr: selected.returns > 6 ? "#ff4444" : "#ffdd44" },
                      { lbl: "النمو", val: `+${selected.growth}%`, clr: "#44aaff" },
                      { lbl: "سعر الصرف", val: curr[selected.currency]?.rate?.toFixed(3), clr: "#ffaa44" },
                      { lbl: "استقرار العملة", val: `${(stats.currency_meta || {})[selected.currency]?.stability}%`, clr: oppColor((stats.currency_meta || {})[selected.currency]?.stability || 70) },
                      { lbl: "تغير اليوم", val: `${curr[selected.currency]?.change > 0 ? "+" : ""}${curr[selected.currency]?.change?.toFixed(2)}%`, clr: curr[selected.currency]?.change > 0 ? "#ff5555" : "#44ff88" },
                    ].map((s, i) => (
                      <div key={i} style={{ background: "rgba(200,0,0,.08)", borderRadius: 9, padding: "10px 12px", border: "1px solid rgba(200,0,0,.15)" }}>
                        <div style={{ fontSize: 10, color: "#666" }}>{s.lbl}</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: s.clr }}>{s.val}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 11, color: "#888", marginBottom: 6 }}>📈 تطور سعر {selected.currency}</div>
                    <div style={{ background: "rgba(200,0,0,.06)", borderRadius: 8, padding: 10 }}>
                      <Sparkline data={curr[selected.currency]?.history || []} color={oppColor((stats.currency_meta || {})[selected.currency]?.stability || 70)} width={280} height={50} />
                    </div>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11, color: "#888", marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
                     تحليل AI
                    {aiLoading && <span className="dot3"><span /><span /><span /></span>}
                  </div>
                  {aiLoading
                    ? <div style={{ textAlign: "center", padding: "60px 20px", color: "#555" }}>
                        <div style={{ fontSize: 13, color: "#cc0000", marginBottom: 12 }}>⏳ جاري التحليل الذكي لسوق {selected.name}...</div>
                        <div className="dot3" style={{ justifyContent: "center", display: "flex" }}><span /><span /><span /></div>
                      </div>
                    : <div className="ai-box">{aiText || "⬅ انتظر انتهاء التحليل..."}</div>
                  }

                  {!aiLoading && aiText && (
                    <button onClick={() => analyze(selected)} style={{ marginTop: 10, background: "rgba(200,0,0,.15)", border: "1px solid rgba(200,0,0,.3)", borderRadius: 8, padding: "8px 16px", color: "#cc0000", cursor: "pointer", fontFamily: "'Cairo',sans-serif", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                      🔄 تحديث التحليل
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── FOOTER ── */}
      <div style={{ borderTop: "1px solid rgba(200,0,0,.15)", padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 10, color: "#444" }}>
        <span style={{ fontFamily: "'Orbitron',monospace", color: "#660000", letterSpacing: 2 }}>DRESS ON ME © 2025</span>
        <span>البيانات تُحدَّث كل 3.2 ثانية · مدعوم بـ Claude AI</span>
        <span style={{ color: "#00ff8888" }}>● جميع الأسعار تجريبية للعرض فقط</span>
      </div>
    </div>
  );
}
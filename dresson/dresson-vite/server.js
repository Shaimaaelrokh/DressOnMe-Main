import express from "express";
import cors from "cors";
import axios from "axios";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ----------------------------- قراءة .env يدويًا -----------------------------
function loadEnv() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) {
    console.error("❌ ملف .env غير موجود في:", envPath);
    return;
  }
  const content = fs.readFileSync(envPath, "utf8");
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    if (line.trim() && !line.startsWith("#")) {
      const [key, ...valueParts] = line.split("=");
      const value = valueParts.join("=").trim();
      if (key && value) {
        process.env[key.trim()] = value;
      }
    }
  }
}

loadEnv();

// ----------------------------- التحقق من المفاتيح -----------------------------
const EXCHANGE_API_KEY = process.env.EXCHANGE_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const PORT = process.env.PORT || 3001;

console.log("📁 EXCHANGE_API_KEY موجود؟", EXCHANGE_API_KEY ? "✅" : "❌");
console.log("📁 GROQ_API_KEY موجود؟", GROQ_API_KEY ? "✅" : "❌");
console.log("📁 PORT =", PORT);

const app = express();
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

// ----------------------------- أسعار الصرف (تخزين مؤقت) -----------------------------
let cachedRates = null;
let cacheTimestamp = 0;
const CACHE_DURATION_MS = 5 * 60 * 1000;

async function fetchExchangeRates() {
  const now = Date.now();
  if (cachedRates && (now - cacheTimestamp) < CACHE_DURATION_MS) return cachedRates;
  try {
    if (!EXCHANGE_API_KEY) throw new Error("EXCHANGE_API_KEY مفقود");
    const url = `https://v6.exchangerate-api.com/v6/${EXCHANGE_API_KEY}/latest/USD`;
    const response = await axios.get(url, { timeout: 8000 });
    if (response.data?.result === "success") {
      cachedRates = response.data.conversion_rates;
      cacheTimestamp = now;
      console.log("✅ أسعار الصرف محدثة");
      return cachedRates;
    }
    throw new Error("رد غير صالح من API");
  } catch (error) {
    console.error("❌ خطأ في جلب أسعار الصرف:", error.message);
    return {
      USD: 1, EUR: 0.92, GBP: 0.79, SAR: 3.75, AED: 3.67,
      EGP: 48.5, TRY: 32.1, JPY: 149.5, CNY: 7.24, INR: 83.2,
      BRL: 4.97, KWD: 0.31, MAD: 10.1, AUD: 1.53
    };
  }
}

app.get("/api/forex/latest", async (req, res) => {
  try {
    const rates = await fetchExchangeRates();
    res.json({ success: true, rates, timestamp: Date.now() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ----------------------------- Groq API (النموذج الصحيح) -----------------------------
async function askGroq(prompt) {
  if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY غير موجود");
  
  // محاولة استخدام النماذج المتاحة مجاناً (الأحدث والأكثر استقراراً)
  const models = [
    "llama-3.3-70b-versatile",
    "mixtral-8x7b-32768",
    "llama3-70b-8192"
  ];
  
  let lastError = null;
  for (const model of models) {
    try {
      const response = await axios.post(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          model: model,
          messages: [
            {
              role: "system",
              content: "أنت محلل أعمال خبير في التجارة الإلكترونية والأسواق العالمية. أجب باللغة العربية بوضوح واحترافية، وركز على الفرص والتحديات والنصائح العملية."
            },
            { role: "user", content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 800,
        },
        {
          headers: {
            "Authorization": `Bearer ${GROQ_API_KEY}`,
            "Content-Type": "application/json",
          },
          timeout: 15000,
        }
      );
      console.log(`✅ تم استخدام النموذج: ${model}`);
      return response.data.choices[0].message.content;
    } catch (err) {
      lastError = err;
      console.warn(`⚠️ فشل النموذج ${model}: ${err.response?.data?.error?.message || err.message}`);
      // استمر في تجربة النموذج التالي
    }
  }
  throw lastError || new Error("جميع النماذج فشلت");
}

app.post("/api/analyze", async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt is required" });
  try {
    const analysis = await askGroq(prompt);
    res.json({ text: analysis });
  } catch (err) {
    console.error("❌ Groq error:", err.message);
    let msg = "⚠️ خدمة التحليل غير متاحة حالياً.\n";
    if (!GROQ_API_KEY) {
      msg += "مفتاح Groq مفقود. أضف GROQ_API_KEY في ملف .env";
    } else {
      const detail = err.response?.data?.error?.message || err.message;
      msg += `حدث خطأ في الاتصال بـ Groq: ${detail}\nتأكد من صحة المفتاح واتصال الإنترنت.`;
    }
    res.json({ text: `🔍 **تعذر إجراء التحليل**\n\n${msg}` });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 الخادم يعمل على المنفذ ${PORT}`);
  console.log(`   - GET  /api/forex/latest`);
  console.log(`   - POST /api/analyze`);
});
import express from "express";
import cors from "cors";
import { BetaAnalyticsDataClient } from "@google-analytics/data";

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Health check (so Render knows the app is alive)
app.get("/", (req, res) => {
  res.send("✅ Velzai GA4 backend is live and running on Render");
});

// ✅ Load GA4 service account credentials from Base64
let serviceAccount = null;
try {
  if (process.env.GA4_SERVICE_ACCOUNT_KEY) {
    serviceAccount = JSON.parse(
      Buffer.from(process.env.GA4_SERVICE_ACCOUNT_KEY, "base64").toString("utf-8")
    );
    console.log("✅ GA4 credentials loaded successfully");
  } else {
    console.warn("⚠️ No GA4_SERVICE_ACCOUNT_KEY found in environment variables");
  }
} catch (err) {
  console.error("❌ Failed to parse GA4 credentials:", err.message);
}

// ✅ Initialize GA4 client
let analytics = null;
if (serviceAccount) {
  analytics = new BetaAnalyticsDataClient({
    credentials: serviceAccount,
  });
}

// ✅ Endpoint to fetch real GA4 metrics
app.get("/refresh", async (_req, res) => {
  if (!analytics) {
    return res.status(500).json({ error: "GA4 client not initialized" });
  }

  try {
    const [report] = await analytics.runReport({
      property: "properties/515522755",
      dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
      metrics: [
        { name: "activeUsers" },
        { name: "averageSessionDuration" },
        { name: "screenPageViews" },
      ],
      dimensions: [{ name: "country" }, { name: "pagePath" }],
    });

    const result = {
      totalUsers: report.rows?.[0]?.metricValues?.[0]?.value || 0,
      avgEngagementTime:
        (parseFloat(report.rows?.[0]?.metricValues?.[1]?.value) || 0).toFixed(1) + "s",
      topPages: report.rows?.slice(0, 5)?.map((r) => ({
        path: r.dimensionValues[1]?.value || "N/A",
        views: r.metricValues[2]?.value || 0,
      })),
      trafficByCountry: report.rows?.slice(0, 5)?.map((r) => ({
        country: r.dimensionValues[0]?.value || "Unknown",
        users: r.metricValues[0]?.value || 0,
      })),
    };

    console.log("✅ GA4 data fetched successfully");
    res.json(result);
  } catch (e) {
    console.error("❌ GA4 API error:", e.message);
    res.status(500).json({ error: "Failed to fetch GA4 data" });
  }
});

// ✅ Server listen
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Velzai GA4 backend running on port ${PORT}`);
});

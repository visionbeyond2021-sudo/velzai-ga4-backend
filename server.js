import express from "express";
import cors from "cors";
import { BetaAnalyticsDataClient } from "@google-analytics/data";

const app = express();
app.use(cors());
app.use(express.json());

// decode Base64 service-account key from Render environment
let serviceAccount = null;
try {
  serviceAccount = JSON.parse(
    Buffer.from(process.env.GA4_SERVICE_ACCOUNT_KEY, "base64").toString("utf-8")
  );
  console.log("✅ GA4 credentials loaded");
} catch (err) {
  console.error("❌ Unable to parse GA4 key:", err.message);
}

const analytics = new BetaAnalyticsDataClient({ credentials: serviceAccount });

app.get("/", (req, res) => res.send("✅ Velzai GA4 backend is live!"));

app.get("/refresh", async (_req, res) => {
  try {
    const [report] = await analytics.runReport({
      property: "properties/515522755",
      dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
      metrics: [
        { name: "activeUsers" },
        { name: "averageSessionDuration" },
        { name: "screenPageViews" }
      ],
      dimensions: [{ name: "country" }, { name: "pagePath" }]
    });

    const result = {
      totalUsers: report.rows?.[0]?.metricValues?.[0]?.value || 0,
      avgEngagementTime:
        (parseFloat(report.rows?.[0]?.metricValues?.[1]?.value) || 0).toFixed(1) + "s",
      topPages: report.rows.slice(0, 5).map(r => ({
        path: r.dimensionValues[1].value,
        views: r.metricValues[2].value
      })),
      trafficByCountry: report.rows.slice(0, 5).map(r => ({
        country: r.dimensionValues[0].value,
        users: r.metricValues[0].value
      }))
    };

    res.json(result);
  } catch (e) {
    console.error("❌ GA4 API error:", e.message);
    res.status(500).json({ error: "Failed to fetch GA4 data" });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 GA4 backend running on port ${PORT}`));

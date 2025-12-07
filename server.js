import express from "express";
import { google } from "googleapis";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 8080;

app.get("/ga4/overview", async (req, res) => {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(
        Buffer.from(process.env.GA4_KEY_BASE64, "base64").toString("utf8")
      ),
      scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
    });

    const analyticsDataClient = google.analyticsdata({ version: "v1beta", auth });
    const propertyId = process.env.GA4_PROPERTY_ID;

    const [response] = await analyticsDataClient.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        metrics: [
          { name: "totalUsers" },
          { name: "newUsers" },
          { name: "screenPageViews" },
          { name: "averageSessionDuration" },
        ],
        dimensions: [{ name: "country" }],
        dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
      },
    });

    res.json({ success: true, propertyId, data: response.data });
  } catch (err) {
    console.error("GA4 API Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(port, () =>
  console.log(`✅ Velzai GA4 backend running on port ${port}`)
);

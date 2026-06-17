import { google } from "googleapis";
import path from "path";
import { readFileSync } from "fs";
import logger from "../../config/logger.js";

// ── helpers ──────────────────────────────────────────────────────────
const PROPERTY_ID = process.env.GA_PROPERTY_ID;
const KEY_PATH = process.env.GA_SERVICE_ACCOUNT_KEY_PATH;

let _analyticsData = null;

function getClient() {
  if (_analyticsData) return _analyticsData;

  if (!PROPERTY_ID || !KEY_PATH) {
    throw new Error(
      "GA_PROPERTY_ID and GA_SERVICE_ACCOUNT_KEY_PATH must be set in .env"
    );
  }

  const resolvedPath = path.resolve(KEY_PATH);
  const keyFile = JSON.parse(readFileSync(resolvedPath, "utf-8"));

  const auth = new google.auth.GoogleAuth({
    credentials: keyFile,
    scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
  });

  _analyticsData = google.analyticsdata({ version: "v1beta", auth });
  return _analyticsData;
}

// ── date helpers ─────────────────────────────────────────────────────
function getDateRange(range) {
  const today = new Date();
  const fmt = (d) => d.toISOString().split("T")[0]; // YYYY-MM-DD

  switch (range) {
    case "today":
      return { startDate: "today", endDate: "today" };
    case "7days":
      return { startDate: "7daysAgo", endDate: "today" };
    case "30days":
      return { startDate: "30daysAgo", endDate: "today" };
    case "90days":
      return { startDate: "90daysAgo", endDate: "today" };
    default:
      return { startDate: "7daysAgo", endDate: "today" };
  }
}

function getPreviousDateRange(range) {
  switch (range) {
    case "today":
      return { startDate: "2daysAgo", endDate: "2daysAgo" };
    case "7days":
      return { startDate: "14daysAgo", endDate: "8daysAgo" };
    case "30days":
      return { startDate: "60daysAgo", endDate: "31daysAgo" };
    case "90days":
      return { startDate: "180daysAgo", endDate: "91daysAgo" };
    default:
      return { startDate: "14daysAgo", endDate: "8daysAgo" };
  }
}

// ── row parser helpers ───────────────────────────────────────────────
const dimVal = (row, idx = 0) =>
  row.dimensionValues?.[idx]?.value ?? "";
const metVal = (row, idx = 0) =>
  Number(row.metricValues?.[idx]?.value ?? 0);

// ── public service methods ───────────────────────────────────────────
export class AnalyticsService {
  /**
   * Fetches overview KPI stats + comparison with previous period.
   */
  static async getOverviewStats(range = "7days") {
    const client = getClient();
    const dateRange = getDateRange(range);
    const prevRange = getPreviousDateRange(range);

    // Current period
    const [current, previous] = await Promise.all([
      client.properties.runReport({
        property: `properties/${PROPERTY_ID}`,
        requestBody: {
          dateRanges: [dateRange],
          metrics: [
            { name: "screenPageViews" },
            { name: "totalUsers" },
            { name: "averageSessionDuration" },
            { name: "bounceRate" },
            { name: "sessions" },
          ],
        },
      }),
      client.properties.runReport({
        property: `properties/${PROPERTY_ID}`,
        requestBody: {
          dateRanges: [prevRange],
          metrics: [
            { name: "screenPageViews" },
            { name: "totalUsers" },
            { name: "averageSessionDuration" },
            { name: "bounceRate" },
            { name: "sessions" },
          ],
        },
      }),
    ]);

    const curRow = current.data.rows?.[0];
    const prevRow = previous.data.rows?.[0];

    const pageviews = metVal(curRow, 0);
    const users = metVal(curRow, 1);
    const avgDuration = metVal(curRow, 2);
    const bounceRate = metVal(curRow, 3);
    const sessions = metVal(curRow, 4);

    const prevPageviews = metVal(prevRow, 0);
    const prevUsers = metVal(prevRow, 1);
    const prevDuration = metVal(prevRow, 2);
    const prevBounce = metVal(prevRow, 3);

    const pctChange = (cur, prev) =>
      prev === 0 ? 0 : Math.round(((cur - prev) / prev) * 1000) / 10;

    // Format duration
    const mins = Math.floor(avgDuration / 60);
    const secs = Math.round(avgDuration % 60);

    return {
      pageviews,
      pageviewsTrend: pctChange(pageviews, prevPageviews),
      users,
      usersTrend: pctChange(users, prevUsers),
      sessions,
      sessionDuration: `${mins}m ${secs}s`,
      sessionDurationTrend: pctChange(avgDuration, prevDuration),
      bounceRate: `${(bounceRate * 100).toFixed(1)}%`,
      bounceRateTrend: pctChange(bounceRate, prevBounce),
    };
  }

  /**
   * Traffic trend data (pageviews + users over time).
   */
  static async getTrafficTrend(range = "7days") {
    const client = getClient();
    const dateRange = getDateRange(range);

    const dimension =
      range === "today"
        ? { name: "dateHour" }
        : { name: "date" };

    const res = await client.properties.runReport({
      property: `properties/${PROPERTY_ID}`,
      requestBody: {
        dateRanges: [dateRange],
        dimensions: [dimension],
        metrics: [
          { name: "screenPageViews" },
          { name: "totalUsers" },
        ],
        orderBys: [{ dimension: { dimensionName: dimension.name } }],
      },
    });

    return (res.data.rows || []).map((row) => {
      const raw = dimVal(row, 0);
      let label;
      if (range === "today") {
        // dateHour format: YYYYMMDDHH
        const hour = raw.slice(-2);
        label = `${hour}:00`;
      } else {
        // date format: YYYYMMDD
        const day = raw.slice(6, 8);
        const month = raw.slice(4, 6);
        label = `${parseInt(day)}/${parseInt(month)}`;
      }

      return {
        label,
        views: metVal(row, 0),
        users: metVal(row, 1),
      };
    });
  }

  /**
   * Top pages by pageviews.
   */
  static async getTopPages(range = "7days") {
    const client = getClient();
    const dateRange = getDateRange(range);

    const res = await client.properties.runReport({
      property: `properties/${PROPERTY_ID}`,
      requestBody: {
        dateRanges: [dateRange],
        dimensions: [{ name: "pagePath" }],
        metrics: [
          { name: "screenPageViews" },
          { name: "bounceRate" },
        ],
        orderBys: [
          {
            metric: { metricName: "screenPageViews" },
            desc: true,
          },
        ],
        limit: 10,
      },
    });

    return (res.data.rows || []).map((row) => {
      const pagePath = dimVal(row, 0);
      return {
        path: pagePath,
        views: metVal(row, 0),
        bounceRate: Math.round(metVal(row, 1) * 100),
      };
    });
  }

  /**
   * Traffic channels breakdown (Direct, Organic Search, Social, Referral, etc.)
   */
  static async getChannels(range = "7days") {
    const client = getClient();
    const dateRange = getDateRange(range);

    const res = await client.properties.runReport({
      property: `properties/${PROPERTY_ID}`,
      requestBody: {
        dateRanges: [dateRange],
        dimensions: [{ name: "sessionDefaultChannelGroup" }],
        metrics: [{ name: "sessions" }],
        orderBys: [
          { metric: { metricName: "sessions" }, desc: true },
        ],
        limit: 8,
      },
    });

    const rows = res.data.rows || [];
    const total = rows.reduce((s, r) => s + metVal(r, 0), 0);

    const CHANNEL_COLORS = {
      "Direct": "#a855f7",
      "Organic Search": "#06b6d4",
      "Organic Social": "#10b981",
      "Referral": "#f59e0b",
      "Paid Search": "#ef4444",
      "Paid Social": "#ec4899",
      "Email": "#8b5cf6",
      "Display": "#f97316",
    };
    const DEFAULT_COLORS = ["#a855f7", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#8b5cf6", "#f97316"];

    return rows.map((row, idx) => {
      const name = dimVal(row, 0);
      const sessions = metVal(row, 0);
      return {
        name,
        value: total > 0 ? Math.round((sessions / total) * 100) : 0,
        sessions,
        color: CHANNEL_COLORS[name] || DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
      };
    });
  }

  /**
   * Device category breakdown (desktop, mobile, tablet).
   */
  static async getDevices(range = "7days") {
    const client = getClient();
    const dateRange = getDateRange(range);

    const res = await client.properties.runReport({
      property: `properties/${PROPERTY_ID}`,
      requestBody: {
        dateRanges: [dateRange],
        dimensions: [{ name: "deviceCategory" }],
        metrics: [{ name: "sessions" }],
        orderBys: [
          { metric: { metricName: "sessions" }, desc: true },
        ],
      },
    });

    const rows = res.data.rows || [];
    const total = rows.reduce((s, r) => s + metVal(r, 0), 0);

    const DEVICE_COLORS = {
      desktop: "#a855f7",
      mobile: "#06b6d4",
      tablet: "#10b981",
    };

    return rows.map((row) => {
      const name = dimVal(row, 0);
      const sessions = metVal(row, 0);
      return {
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value: total > 0 ? Math.round((sessions / total) * 100) : 0,
        sessions,
        color: DEVICE_COLORS[name] || "#94a3b8",
      };
    });
  }

  /**
   * Locations (city) breakdown.
   */
  static async getLocations(range = "7days") {
    const client = getClient();
    const dateRange = getDateRange(range);

    const res = await client.properties.runReport({
      property: `properties/${PROPERTY_ID}`,
      requestBody: {
        dateRanges: [dateRange],
        dimensions: [{ name: "city" }],
        metrics: [{ name: "sessions" }],
        orderBys: [
          { metric: { metricName: "sessions" }, desc: true },
        ],
        limit: 8,
      },
    });

    const rows = res.data.rows || [];
    const total = rows.reduce((s, r) => s + metVal(r, 0), 0);

    return rows.map((row) => {
      const city = dimVal(row, 0);
      const sessions = metVal(row, 0);
      return {
        city: city === "(not set)" ? "Không xác định" : city,
        count: sessions,
        percent: total > 0 ? Math.round((sessions / total) * 100) : 0,
      };
    });
  }

  /**
   * Real-time active users count.
   */
  static async getActiveUsers() {
    const client = getClient();

    try {
      const res = await client.properties.runRealtimeReport({
        property: `properties/${PROPERTY_ID}`,
        requestBody: {
          metrics: [{ name: "activeUsers" }],
        },
      });

      const row = res.data.rows?.[0];
      return {
        activeUsers: row ? metVal(row, 0) : 0,
      };
    } catch (err) {
      logger.warn({ err: err.message }, "[Analytics] Realtime report failed, returning 0");
      return { activeUsers: 0 };
    }
  }

  /**
   * Aggregated analytics report — single API call from frontend.
   */
  static async getFullReport(range = "7days") {
    const [overview, trafficTrend, topPages, channels, devices, locations, realtime] =
      await Promise.allSettled([
        this.getOverviewStats(range),
        this.getTrafficTrend(range),
        this.getTopPages(range),
        this.getChannels(range),
        this.getDevices(range),
        this.getLocations(range),
        this.getActiveUsers(),
      ]);

    return {
      overview: overview.status === "fulfilled" ? overview.value : null,
      trafficTrend: trafficTrend.status === "fulfilled" ? trafficTrend.value : [],
      topPages: topPages.status === "fulfilled" ? topPages.value : [],
      channels: channels.status === "fulfilled" ? channels.value : [],
      devices: devices.status === "fulfilled" ? devices.value : [],
      locations: locations.status === "fulfilled" ? locations.value : [],
      activeUsers: realtime.status === "fulfilled" ? realtime.value.activeUsers : 0,
    };
  }

  /**
   * Check if GA is configured.
   */
  static isConfigured() {
    return !!(PROPERTY_ID && KEY_PATH);
  }
}

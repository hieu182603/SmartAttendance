import { UserModel } from "./user.model.js";

export class AnalyticsService {
  /**
   * Get comprehensive trial analytics
   */
  static async getTrialAnalytics() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get all trial-related users
    const trialUsers = await UserModel.find({
      $or: [
        { isTrial: true },
        { trialConvertedAt: { $exists: true } }
      ]
    }).select('createdAt trialExpiresAt trialConvertedAt isTrial role').lean();

    // Calculate metrics
    const totalTrialSignups = trialUsers.length;

    const activeTrials = trialUsers.filter(user =>
      user.isTrial && user.trialExpiresAt && user.trialExpiresAt > now
    ).length;

    const expiredTrials = trialUsers.filter(user =>
      user.isTrial && user.trialExpiresAt && user.trialExpiresAt <= now
    ).length;

    const convertedTrials = trialUsers.filter(user =>
      user.trialConvertedAt
    ).length;

    const conversionRate = totalTrialSignups > 0 ? (convertedTrials / totalTrialSignups * 100).toFixed(2) : 0;

    // Daily signups for last 30 days
    const dailySignups = await this.getDailyTrialSignups(thirtyDaysAgo);

    // Conversion by plan
    const conversionByPlan = await this.getConversionByPlan();

    // Trial duration analysis
    const trialDurationStats = await this.getTrialDurationStats();

    // User engagement metrics (mock for now)
    const engagementMetrics = await this.getEngagementMetrics();

    return {
      overview: {
        totalTrialSignups,
        activeTrials,
        expiredTrials,
        convertedTrials,
        conversionRate: `${conversionRate}%`,
        timestamp: now
      },
      trends: {
        dailySignups,
        conversionTrend: await this.getConversionTrend(thirtyDaysAgo)
      },
      conversion: {
        byPlan: conversionByPlan,
        averageTimeToConvert: await this.getAverageTimeToConvert()
      },
      engagement: engagementMetrics,
      trialDuration: trialDurationStats
    };
  }

  /**
   * Get daily trial signups for the last 30 days
   */
  static async getDailyTrialSignups(sinceDate) {
    const pipeline = [
      {
        $match: {
          isTrial: true,
          createdAt: { $gte: sinceDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { "_id": 1 }
      }
    ];

    const result = await UserModel.aggregate(pipeline);

    // Fill in missing dates with 0
    const dailyMap = new Map(result.map(item => [item._id, item.count]));

    const dates = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dates.push({
        date: dateStr,
        count: dailyMap.get(dateStr) || 0
      });
    }

    return dates;
  }

  /**
   * Get conversion statistics by plan
   */
  static async getConversionByPlan() {
    const pipeline = [
      {
        $match: {
          trialConvertedAt: { $exists: true }
        }
      },
      {
        $group: {
          _id: "$role",
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ];

    const result = await UserModel.aggregate(pipeline);

    return result.map(item => ({
      plan: item._id,
      conversions: item.count
    }));
  }

  /**
   * Get average time to convert from trial to paid
   */
  static async getAverageTimeToConvert() {
    const convertedUsers = await UserModel.find({
      trialConvertedAt: { $exists: true }
    }).select('createdAt trialConvertedAt').lean();

    if (convertedUsers.length === 0) return 0;

    const totalTime = convertedUsers.reduce((sum, user) => {
      const trialStart = user.createdAt;
      const conversionTime = user.trialConvertedAt;
      return sum + (conversionTime.getTime() - trialStart.getTime());
    }, 0);

    const averageMs = totalTime / convertedUsers.length;
    const averageDays = Math.round(averageMs / (1000 * 60 * 60 * 24));

    return averageDays;
  }

  /**
   * Get conversion trend over time
   */
  static async getConversionTrend(sinceDate) {
    const pipeline = [
      {
        $match: {
          trialConvertedAt: { $gte: sinceDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$trialConvertedAt" }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { "_id": 1 }
      }
    ];

    const result = await UserModel.aggregate(pipeline);
    return result.map(item => ({
      date: item._id,
      conversions: item.count
    }));
  }

  /**
   * Get trial duration statistics
   */
  static async getTrialDurationStats() {
    const convertedUsers = await UserModel.find({
      trialConvertedAt: { $exists: true }
    }).select('createdAt trialConvertedAt').lean();

    if (convertedUsers.length === 0) {
      return { average: 0, median: 0, distribution: [] };
    }

    const durations = convertedUsers.map(user => {
      const trialStart = user.createdAt;
      const conversionTime = user.trialConvertedAt;
      return Math.ceil((conversionTime.getTime() - trialStart.getTime()) / (1000 * 60 * 60 * 24));
    });

    // Calculate average
    const average = durations.reduce((sum, duration) => sum + duration, 0) / durations.length;

    // Calculate median
    const sortedDurations = durations.sort((a, b) => a - b);
    const median = sortedDurations.length % 2 === 0
      ? (sortedDurations[sortedDurations.length / 2 - 1] + sortedDurations[sortedDurations.length / 2]) / 2
      : sortedDurations[Math.floor(sortedDurations.length / 2)];

    // Duration distribution
    const distribution = [
      { range: "1-3 days", count: durations.filter(d => d <= 3).length },
      { range: "4-7 days", count: durations.filter(d => d > 3 && d <= 7).length },
      { range: "8-14 days", count: durations.filter(d => d > 7 && d <= 14).length },
      { range: "15+ days", count: durations.filter(d => d > 14).length }
    ];

    return {
      average: Math.round(average),
      median: Math.round(median),
      distribution
    };
  }

  /**
   * Get user engagement metrics (mock data for demo)
   */
  static async getEngagementMetrics() {
    // In a real implementation, this would track actual usage events
    // For demo purposes, we'll return mock data based on user counts

    const totalTrialUsers = await UserModel.countDocuments({
      $or: [
        { isTrial: true },
        { trialConvertedAt: { $exists: true } }
      ]
    });

    // Mock engagement rates (in real app, track actual events)
    const loginRate = 0.75; // 75% of trial users log in
    const featureUsageRate = 0.60; // 60% use features
    const requestCreationRate = 0.30; // 30% create requests

    return {
      loginRate: `${(loginRate * 100).toFixed(1)}%`,
      featureUsageRate: `${(featureUsageRate * 100).toFixed(1)}%`,
      requestCreationRate: `${(requestCreationRate * 100).toFixed(1)}%`,
      averageSessionDuration: "12.5 minutes",
      mostUsedFeatures: [
        { feature: "Chấm công", usage: Math.round(totalTrialUsers * 0.8) },
        { feature: "Xem lịch sử", usage: Math.round(totalTrialUsers * 0.6) },
        { feature: "Tạo yêu cầu", usage: Math.round(totalTrialUsers * 0.3) },
        { feature: "Xem lịch làm việc", usage: Math.round(totalTrialUsers * 0.4) }
      ]
    };
  }

  /**
   * Track user activity (would be called from various endpoints)
   */
  static async trackUserActivity(userId, activityType, metadata = {}) {
    // In a real implementation, this would store activity events
    // For demo, we'll just log it
    console.log(`User ${userId} performed ${activityType}:`, metadata);

    // Could store in a separate analytics collection
    // const activity = {
    //   userId,
    //   activityType,
    //   metadata,
    //   timestamp: new Date()
    // };
    // await ActivityModel.create(activity);
  }
}

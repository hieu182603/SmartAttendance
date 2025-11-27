import api from "./api";

export interface Event {
  _id: string;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  type: "holiday" | "meeting" | "event" | "deadline" | "training";
  location?: string;
  attendees?: Array<{ _id: string; name: string; email: string }>;
  attendeeCount?: number;
  color?: string;
  visibility?: "public" | "department" | "branch" | "private";
  branchId?: string;
  departmentId?: string;
  createdBy?: { _id: string; name: string; email: string };
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface EventStats {
  total: number;
  upcoming: number;
  holidays: number;
  meetingsAndTraining: number;
}

interface EventParams {
  type?: string;
  month?: number;
  year?: number;
  startDate?: string;
  endDate?: string;
  visibility?: string;
  isActive?: boolean;
}

const eventService = {
  /**
   * Lấy tất cả events với filter
   */
  getAllEvents: async (params?: EventParams): Promise<Event[]> => {
    try {
      const response = await api.get("/events", { params });
      return response.data.data || [];
    } catch (error) {
      console.error("Error fetching events:", error);
      return [];
    }
  },

  /**
   * Lấy events trong 7 ngày tới
   */
  getUpcomingEvents: async (): Promise<Event[]> => {
    try {
      const response = await api.get("/events/upcoming");
      return response.data.data || [];
    } catch (error) {
      console.error("Error fetching upcoming events:", error);
      return [];
    }
  },

  /**
   * Lấy events trong tháng
   */
  getMonthEvents: async (month?: number, year?: number): Promise<Event[]> => {
    try {
      const params: any = {};
      if (month) params.month = month;
      if (year) params.year = year;
      const response = await api.get("/events/month", { params });
      return response.data.data || [];
    } catch (error) {
      console.error("Error fetching month events:", error);
      return [];
    }
  },

  /**
   * Lấy event theo ID
   */
  getEventById: async (id: string): Promise<Event | null> => {
    try {
      const response = await api.get(`/events/${id}`);
      return response.data.data || null;
    } catch (error) {
      console.error("Error fetching event:", error);
      return null;
    }
  },

  /**
   * Tạo event mới
   */
  createEvent: async (eventData: Partial<Event>): Promise<Event> => {
    const response = await api.post("/events", eventData);
    return response.data.data;
  },

  /**
   * Cập nhật event
   */
  updateEvent: async (id: string, eventData: Partial<Event>): Promise<Event> => {
    const response = await api.put(`/events/${id}`, eventData);
    return response.data.data;
  },

  /**
   * Xóa event
   */
  deleteEvent: async (id: string): Promise<void> => {
    await api.delete(`/events/${id}`);
  },

  /**
   * Lấy thống kê events
   */
  getEventStats: async (month?: number, year?: number): Promise<EventStats> => {
    try {
      const params: any = {};
      if (month) params.month = month;
      if (year) params.year = year;
      const response = await api.get("/events/stats", { params });
      return response.data.data || {
        total: 0,
        upcoming: 0,
        holidays: 0,
        meetingsAndTraining: 0,
      };
    } catch (error) {
      console.error("Error fetching event stats:", error);
      return {
        total: 0,
        upcoming: 0,
        holidays: 0,
        meetingsAndTraining: 0,
      };
    }
  },
};

export default eventService;


import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import {
  Calendar as CalendarIcon,
  Plus,
  ChevronLeft,
  ChevronRight,
  Users,
  Clock,
  MapPin,
  FileText,
  Tag,
  Bell,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { Calendar } from "../../ui/calendar";
import { Tabs, TabsList, TabsTrigger } from "../../ui/tabs";
import { toast } from "sonner";
import eventService, { Event } from "../../../services/eventService";
import { CreateEventDialog } from "../dialogs/CreateEventDialog";
import { useAuth } from "../../../context/AuthContext";
import { hasMinimumLevel, UserRole } from "../../../utils/roles";

type EventType = "holiday" | "meeting" | "event" | "deadline" | "training";

// Map backend color to Tailwind class
const getColorClass = (color?: string): string => {
  if (!color) return "bg-blue-500";
  // If it's a hex color, convert to Tailwind class
  const colorMap: Record<string, string> = {
    "#3B82F6": "bg-blue-500",
    "#EF4444": "bg-red-500",
    "#F59E0B": "bg-orange-500",
    "#10B981": "bg-green-500",
    "#8B5CF6": "bg-purple-500",
    "#EC4899": "bg-pink-500",
  };
  return colorMap[color] || "bg-blue-500";
};

// Convert backend Event to frontend Event format
const mapEvent = (event: Event) => {
  const eventDate = new Date(event.date);
  const dateStr = eventDate.toISOString().split("T")[0];

  return {
    id: event._id,
    title: event.title,
    description: event.description || "",
    date: dateStr,
    startTime: event.startTime || "",
    endTime: event.endTime || "",
    type: event.type,
    location: event.location,
    attendees: event.attendeeCount || event.attendees?.length || 0,
    color: getColorClass(event.color),
    isAllDay: event.isAllDay || false,
    originalEvent: event, // Keep original for reference
  };
};

interface StatCard {
  label: string;
  value: number;
  color: string;
  icon: string;
  delay: number;
}

const CompanyCalendarPage: React.FC = () => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [filterType, setFilterType] = useState<string>("all");
  const [events, setEvents] = useState<ReturnType<typeof mapEvent>[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<
    ReturnType<typeof mapEvent>[]
  >([]);
  const [monthEvents, setMonthEvents] = useState<ReturnType<typeof mapEvent>[]>(
    []
  );
  const [stats, setStats] = useState({
    total: 0,
    upcoming: 0,
    holidays: 0,
    meetingsAndTraining: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Check if user can create events (HR_MANAGER and above)
  const canCreateEvent = user ? hasMinimumLevel(user.role, UserRole.HR_MANAGER) : false;

  // Fetch data on mount and when month changes
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const currentMonth = selectedDate.getMonth() + 1;
        const currentYear = selectedDate.getFullYear();

        // Fetch upcoming events (next 7 days)
        const upcoming = await eventService.getUpcomingEvents();
        setUpcomingEvents(upcoming.map(mapEvent));

        // Fetch month events
        const month = await eventService.getMonthEvents(
          currentMonth,
          currentYear
        );
        setMonthEvents(month.map(mapEvent));

        // Fetch stats
        const eventStats = await eventService.getEventStats(
          currentMonth,
          currentYear
        );
        setStats(eventStats);

        // Set all events for filtering
        setEvents(month.map(mapEvent));
      } catch (error) {
        console.error("Error fetching events:", error);
        toast.error("Không thể tải dữ liệu sự kiện");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedDate]);

  const filteredEvents = events.filter((event) => {
    if (filterType !== "all" && event.type !== filterType) return false;
    return true;
  });

  // Get events for selected date
  const selectedDateEvents = selectedDate
    ? events.filter(
        (event) => event.date === selectedDate.toISOString().split("T")[0]
      )
    : [];

  const getTypeLabel = (type: EventType): string => {
    switch (type) {
      case "holiday":
        return "Ngày lễ";
      case "meeting":
        return "Họp";
      case "event":
        return "Sự kiện";
      case "deadline":
        return "Deadline";
      case "training":
        return "Đào tạo";
      default:
        return type;
    }
  };

  const getTypeIcon = (type: EventType): ReactNode => {
    switch (type) {
      case "holiday":
        return <CalendarIcon className="h-4 w-4" />;
      case "meeting":
        return <Users className="h-4 w-4" />;
      case "event":
        return <Tag className="h-4 w-4" />;
      case "deadline":
        return <Clock className="h-4 w-4" />;
      case "training":
        return <FileText className="h-4 w-4" />;
      default:
        return <CalendarIcon className="h-4 w-4" />;
    }
  };

  const handleCreateEvent = (): void => {
    setIsCreateDialogOpen(true);
  };

  const handleCreateSuccess = (): void => {
    // Refresh data after creating event
    const currentMonth = selectedDate.getMonth() + 1;
    const currentYear = selectedDate.getFullYear();
    
    Promise.all([
      eventService.getUpcomingEvents(),
      eventService.getMonthEvents(currentMonth, currentYear),
      eventService.getEventStats(currentMonth, currentYear),
    ]).then(([upcoming, month, eventStats]) => {
      setUpcomingEvents(upcoming.map(mapEvent));
      setMonthEvents(month.map(mapEvent));
      setEvents(month.map(mapEvent));
      setStats(eventStats);
    });
  };

  const handleViewEvent = (event: ReturnType<typeof mapEvent>): void => {
    toast.success(`👁️ Xem chi tiết: ${event.title}`);
    // TODO: Open event detail modal/dialog
  };

  const statCards: StatCard[] = [
    {
      label: "Tổng sự kiện",
      value: stats.total,
      color: "primary",
      icon: "📋",
      delay: 0.1,
    },
    {
      label: "Sắp tới (7 ngày)",
      value: stats.upcoming,
      color: "warning",
      icon: "⏰",
      delay: 0.2,
    },
    {
      label: "Ngày lễ",
      value: stats.holidays,
      color: "error",
      icon: "🎉",
      delay: 0.3,
    },
    {
      label: "Họp & Đào tạo",
      value: stats.meetingsAndTraining,
      color: "accent-cyan",
      icon: "👥",
      delay: 0.4,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] bg-clip-text text-transparent">
            Lịch công ty
          </h1>
          <p className="text-[var(--text-sub)] mt-2">
            Theo dõi các sự kiện, cuộc họp và ngày lễ
          </p>
        </div>
        {canCreateEvent && (
          <Button
            onClick={handleCreateEvent}
            className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Tạo sự kiện
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <Card className="bg-[var(--surface)] border-[var(--border)]">
        <CardContent className="p-6">
          <Tabs value={filterType} onValueChange={(v) => setFilterType(v)}>
            <TabsList className="grid w-full grid-cols-6 mt-4">
              <TabsTrigger value="all">Tất cả</TabsTrigger>
              <TabsTrigger value="holiday">Ngày lễ</TabsTrigger>
              <TabsTrigger value="meeting">Họp</TabsTrigger>
              <TabsTrigger value="event">Sự kiện</TabsTrigger>
              <TabsTrigger value="deadline">Deadline</TabsTrigger>
              <TabsTrigger value="training">Đào tạo</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Summary Stats - 4 KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: stat.delay }}
            whileHover={{ scale: 1.05, y: -5 }}
          >
            <Card className="bg-[var(--surface)] border-[var(--border)] hover:border-[var(--accent-cyan)] transition-all">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mt-3">
                  <div>
                    <p className="text-sm text-[var(--text-sub)]">
                      {stat.label}
                    </p>
                    <motion.p
                      className={`text-2xl mt-1 text-[var(--${stat.color})]`}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        delay: stat.delay + 0.2,
                        type: "spring",
                      }}
                    >
                      {stat.value}
                    </motion.p>
                  </div>
                  <motion.div
                    className="text-3xl"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    {stat.icon}
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Main Content - Calendar (4) + Upcoming Events (8) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Calendar - 4 columns */}
        <motion.div
          className="lg:col-span-4"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="bg-[var(--surface)] border-[var(--border)]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-[var(--text-sub)] hover:text-[var(--text-main)]"
                  onClick={() => {
                    const newDate = new Date(selectedDate);
                    newDate.setMonth(newDate.getMonth() - 1);
                    setSelectedDate(newDate);
                  }}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h3 className="text-base font-medium text-[var(--text-main)]">
                  {selectedDate.toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-[var(--text-sub)] hover:text-[var(--text-main)]"
                  onClick={() => {
                    const newDate = new Date(selectedDate);
                    newDate.setMonth(newDate.getMonth() + 1);
                    setSelectedDate(newDate);
                  }}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="rounded-md w-full p-0"
                month={selectedDate}
                onMonthChange={(date) => setSelectedDate(date)}
              />

              {/* Selected Date Info */}
              {selectedDate && (
                <div className="mt-4 p-3 rounded-lg bg-[var(--shell)] border border-[var(--border)]">
                  <p className="text-xs text-[var(--text-sub)] mb-1">
                    Ngày đã chọn
                  </p>
                  <p className="text-sm text-[var(--text-main)] mb-2">
                    {selectedDate.toLocaleDateString("vi-VN", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                  {selectedDateEvents.length > 0 ? (
                    <div className="space-y-2">
                      <Badge className="bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)] border-[var(--accent-cyan)]/40">
                        {selectedDateEvents.length} sự kiện
                      </Badge>
                      <div className="space-y-1">
                        {selectedDateEvents.map((event) => (
                          <div
                            key={event.id}
                            className="text-xs p-2 rounded bg-[var(--surface)] border border-[var(--border)] cursor-pointer hover:border-[var(--accent-cyan)] transition-colors"
                            onClick={() => handleViewEvent(event)}
                          >
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${event.color}`} />
                              <span className="text-[var(--text-main)] font-medium truncate">
                                {event.title}
                              </span>
                            </div>
                            {!event.isAllDay && (
                              <div className="text-[var(--text-sub)] ml-4 mt-1">
                                {event.startTime} - {event.endTime}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--text-sub)]">
                      Không có sự kiện
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Upcoming Events - 8 columns */}
        <motion.div
          className="lg:col-span-8"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="bg-[var(--surface)] border-[var(--border)]">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-[var(--accent-cyan)]" />
                <CardTitle className="text-[var(--text-main)]">
                  Sự kiện sắp tới (7 ngày tới)
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 border-4 border-[var(--accent-cyan)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-[var(--text-sub)]">Đang tải sự kiện...</p>
                </div>
              ) : upcomingEvents.length > 0 ? (
                upcomingEvents.map((event, index) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 + index * 0.05 }}
                    whileHover={{ x: 5 }}
                  >
                    <Card
                      className="bg-[var(--shell)] border-[var(--border)] hover:border-[var(--accent-cyan)] transition-all cursor-pointer"
                      onClick={() => handleViewEvent(event)}
                    >
                      <CardContent className="p-4 mt-4">
                        <div className="flex items-start gap-4">
                          {/* Icon */}
                          <div
                            className={`h-12 w-12 rounded-lg ${event.color} bg-opacity-20 flex items-center justify-center flex-shrink-0`}
                          >
                            <span
                              className={`${event.color.replace(
                                "bg-",
                                "text-"
                              )}`}
                            >
                              {getTypeIcon(event.type)}
                            </span>
                          </div>

                          {/* Event Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h4 className="text-[var(--text-main)]">
                                  {event.title}
                                </h4>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge
                                    className={`${event.color} bg-opacity-20 text-black`}
                                    style={{
                                      color: event.color.replace("bg-", ""),
                                    }}
                                  >
                                    {getTypeLabel(event.type)}
                                  </Badge>
                                  {event.isAllDay && (
                                    <Badge
                                      variant="outline"
                                      className="border-[var(--border)] text-[var(--text-sub)] text-xs"
                                    >
                                      Cả ngày
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <Badge className="bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)] text-xs whitespace-nowrap">
                                {new Date(event.date).toLocaleDateString(
                                  "vi-VN",
                                  { day: "numeric", month: "short" }
                                )}
                              </Badge>
                            </div>

                            <p className="text-sm text-[var(--text-sub)] mb-3">
                              {event.description}
                            </p>

                            <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--text-sub)]">
                              {!event.isAllDay && (
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-[var(--accent-cyan)]" />
                                  <span>
                                    {event.startTime} - {event.endTime}
                                  </span>
                                </div>
                              )}
                              {event.location && (
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4 text-[var(--success)]" />
                                  <span>{event.location}</span>
                                </div>
                              )}
                              {event.attendees && (
                                <div className="flex items-center gap-2">
                                  <Users className="h-4 w-4 text-[var(--primary)]" />
                                  <span>{event.attendees} người</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-12"
                >
                  <div className="text-6xl mb-4">📅</div>
                  <p className="text-[var(--text-sub)]">
                    Không có sự kiện sắp tới trong 7 ngày tới
                  </p>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* All Events List */}
      <Card className="bg-[var(--surface)] border-[var(--border)]">
        <CardHeader>
          <CardTitle className="text-[var(--text-main)]">
            Tất cả sự kiện ({filteredEvents.length}) - Tháng{" "}
            {selectedDate.toLocaleDateString("vi-VN", {
              month: "long",
              year: "numeric",
            })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 border-4 border-[var(--accent-cyan)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-[var(--text-sub)]">Đang tải sự kiện...</p>
              </div>
            ) : filteredEvents.length > 0 ? (
              filteredEvents
                .sort(
                  (a, b) =>
                    new Date(a.date).getTime() - new Date(b.date).getTime()
                )
                .map((event, index) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="p-4 rounded-lg bg-[var(--shell)] border border-[var(--border)] cursor-pointer hover:border-[var(--primary)] transition-all"
                    onClick={() => handleViewEvent(event)}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`h-12 w-12 rounded-lg ${event.color} bg-opacity-20 flex items-center justify-center flex-shrink-0`}
                      >
                        <span
                          className={`${event.color.replace("bg-", "text-")}`}
                        >
                          {getTypeIcon(event.type)}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-[var(--text-main)]">
                            {event.title}
                          </h3>
                          <Badge
                            className={`${event.color} bg-opacity-20 text-black`}
                            style={{ color: event.color.replace("bg-", "") }}
                          >
                            {getTypeLabel(event.type)}
                          </Badge>
                          {event.isAllDay && (
                            <Badge
                              variant="outline"
                              className="border-[var(--border)] text-[var(--text-sub)]"
                            >
                              Cả ngày
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-[var(--text-sub)] mb-3">
                          {event.description}
                        </p>
                        <div className="flex items-center gap-6 text-sm text-[var(--text-sub)]">
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4" />
                            <span>
                              {new Date(event.date).toLocaleDateString("vi-VN")}
                            </span>
                          </div>
                          {!event.isAllDay && (
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              <span>
                                {event.startTime} - {event.endTime}
                              </span>
                            </div>
                          )}
                          {event.location && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              <span>{event.location}</span>
                            </div>
                          )}
                          {event.attendees && (
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              <span>{event.attendees} người tham gia</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📅</div>
                <p className="text-[var(--text-sub)]">
                  Không có sự kiện nào trong tháng này
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create Event Dialog */}
      <CreateEventDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={handleCreateSuccess}
        initialDate={selectedDate}
      />
    </div>
  );
};

export default CompanyCalendarPage;

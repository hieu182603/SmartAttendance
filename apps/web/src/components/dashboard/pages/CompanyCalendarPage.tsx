import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
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
  Pencil,
  Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import eventService, { Event } from "@/services/eventService";
import { CreateEventDialog } from "@/components/dashboard/dialogs/CreateEventDialog";
import { UpdateEventDialog } from "@/components/dashboard/dialogs/UpdateEventDialog";
import { useAuth } from "@/context/AuthContext";
import { hasMinimumLevel, UserRole, type UserRoleType } from "@/utils/roles";

type EventType = "holiday" | "meeting" | "event" | "deadline" | "training";

const getFixedColorClass = (type: string): string => {
  const colorMap: Record<string, string> = {
    holiday: "bg-red-500",
    meeting: "bg-blue-500",
    event: "bg-green-500",
    deadline: "bg-orange-500",
    training: "bg-purple-500",
  };
  return colorMap[type] || "bg-blue-500";
};

const mapEvent = (event: Event) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  let dateStr: string;
  if (typeof event.date === "string" && event.date.includes("T")) {
    dateStr = event.date.split("T")[0];
  } else if (typeof event.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(event.date)) {
    dateStr = event.date;
  } else {
    const eventDate = new Date(event.date);
    dateStr = `${eventDate.getFullYear()}-${pad(eventDate.getMonth() + 1)}-${pad(eventDate.getDate())}`;
  }

  return {
    id: event._id,
    title: event.title,
    description: event.description || "",
    date: dateStr,
    startTime: event.startTime || "",
    endTime: event.endTime || "",
    type: event.type as EventType,
    location: event.location,
    attendees: event.attendeeCount || event.attendees?.length || 0,
    color: getFixedColorClass(event.type),
    isAllDay: event.isAllDay || false,
    originalEvent: event,
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
  const { t } = useTranslation(["dashboard", "common"]);
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [events, setEvents] = useState<ReturnType<typeof mapEvent>[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<ReturnType<typeof mapEvent>[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    upcoming: 0,
    holidays: 0,
    meetingsAndTraining: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [eventToDelete, setEventToDelete] = useState<ReturnType<typeof mapEvent> | null>(null);

  // Filters State
  const [activeFilters, setActiveFilters] = useState({
    holiday: true,
    meeting: true,
    event: true,
    deadline: true,
    training: true,
  });

  const canCreateEvent = user ? hasMinimumLevel(user.role as UserRoleType, UserRole.HR_MANAGER) : false;

  const getCalendarDays = useCallback(() => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const startDayIndex = firstDayOfMonth.getDay();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const calendarDays = [];

    // Padding previous month
    for (let i = startDayIndex - 1; i >= 0; i--) {
      calendarDays.push({
        day: daysInPrevMonth - i,
        month: month === 0 ? 11 : month - 1,
        year: month === 0 ? year - 1 : year,
        isCurrentMonth: false,
      });
    }

    // Current month
    for (let i = 1; i <= daysInMonth; i++) {
      calendarDays.push({
        day: i,
        month: month,
        year: year,
        isCurrentMonth: true,
      });
    }

    // Padding next month
    const remainingDays = 42 - calendarDays.length;
    for (let i = 1; i <= remainingDays; i++) {
      calendarDays.push({
        day: i,
        month: month === 11 ? 0 : month + 1,
        year: month === 11 ? year + 1 : year,
        isCurrentMonth: false,
      });
    }

    return calendarDays;
  }, [selectedDate]);

  const refreshCalendarData = useCallback(async () => {
    try {
      setLoading(true);
      const calendarDays = getCalendarDays();
      const firstCell = calendarDays[0];
      const lastCell = calendarDays[calendarDays.length - 1];

      const startStr = `${firstCell.year}-${String(firstCell.month + 1).padStart(2, "0")}-${String(firstCell.day).padStart(2, "0")}`;
      const endStr = `${lastCell.year}-${String(lastCell.month + 1).padStart(2, "0")}-${String(lastCell.day).padStart(2, "0")}`;

      const [upcoming, fetchedEvents, eventStats] = await Promise.all([
        eventService.getUpcomingEvents(),
        eventService.getAllEvents({ startDate: startStr, endDate: endStr }),
        eventService.getEventStats(selectedDate.getMonth() + 1, selectedDate.getFullYear()),
      ]);

      setUpcomingEvents(upcoming.map(mapEvent));
      setEvents(fetchedEvents.map(mapEvent));
      setStats(eventStats);
    } catch (error) {
      console.error("Error fetching events:", error);
      toast.error(t("dashboard:companyCalendar.loadError"));
    } finally {
      setLoading(false);
    }
  }, [selectedDate, getCalendarDays, t]);

  useEffect(() => {
    void refreshCalendarData();
  }, [refreshCalendarData]);

  const filteredEvents = useMemo(() => {
    return events.filter(e => activeFilters[e.type as keyof typeof activeFilters]);
  }, [events, activeFilters]);

  const selectedDateStr = useMemo(() => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${selectedDate.getFullYear()}-${pad(selectedDate.getMonth() + 1)}-${pad(selectedDate.getDate())}`;
  }, [selectedDate]);

  const selectedDateEvents = useMemo(() => {
    return filteredEvents.filter(e => e.date === selectedDateStr);
  }, [filteredEvents, selectedDateStr]);

  const getTypeLabel = (type: EventType): string => {
    const labels: Record<EventType, string> = {
      holiday: "Ngày lễ toàn quốc",
      meeting: "Lịch họp nội bộ",
      event: "Sinh nhật/Sự kiện",
      deadline: "Deadline dự án",
      training: "Đào tạo",
    };
    return labels[type] || type;
  };

  const getTypeIcon = (type: EventType): ReactNode => {
    switch (type) {
      case "holiday": return <CalendarIcon className="h-4 w-4" />;
      case "meeting": return <Users className="h-4 w-4" />;
      case "event": return <Tag className="h-4 w-4" />;
      case "deadline": return <Clock className="h-4 w-4" />;
      case "training": return <FileText className="h-4 w-4" />;
      default: return <CalendarIcon className="h-4 w-4" />;
    }
  };

  const currentMonthLabel = `Th ${selectedDate.getMonth() + 1}`;

  const statCards: StatCard[] = [
    {
      label: `Tổng sự kiện (${currentMonthLabel})`,
      value: stats.total,
      color: "primary",
      icon: "📋",
      delay: 0.1,
    },
    {
      label: "Sắp diễn ra",
      value: stats.upcoming,
      color: "warning",
      icon: "⏰",
      delay: 0.2,
    },
    {
      label: `Ngày lễ (${currentMonthLabel})`,
      value: stats.holidays,
      color: "error",
      icon: "🎉",
      delay: 0.3,
    },
    {
      label: `Họp & Đào tạo (${currentMonthLabel})`,
      value: stats.meetingsAndTraining,
      color: "accent-cyan",
      icon: "👥",
      delay: 0.4,
    },
  ];

  const handleUpdateEvent = (event: ReturnType<typeof mapEvent>, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedEvent(event.originalEvent);
    setIsUpdateDialogOpen(true);
  };

  const handleDeleteEvent = (event: ReturnType<typeof mapEvent>, e: React.MouseEvent) => {
    e.stopPropagation();
    setEventToDelete(event);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async (): Promise<void> => {
    if (!eventToDelete) return;
    try {
      await eventService.deleteEvent(eventToDelete.id);
      toast.success(t("dashboard:companyCalendar.deleteSuccess"));
      void refreshCalendarData();
      setIsDeleteDialogOpen(false);
      setEventToDelete(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || t("dashboard:companyCalendar.deleteError"));
    }
  };

  const handleSetToday = () => {
    setSelectedDate(new Date());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] bg-clip-text text-transparent">
            Lịch Công ty
          </h1>
          <p className="text-[var(--text-sub)] mt-2">
            Quản lý và theo dõi các sự kiện, ngày lễ, cuộc họp
          </p>
        </div>
        {canCreateEvent && (
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] text-white font-medium shadow-md"
          >
            <Plus className="h-4 w-4 mr-2" />
            Thêm sự kiện
          </Button>
        )}
      </div>

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
            <Card className="bg-[var(--surface)] border-[var(--border)] hover:border-[var(--accent-cyan)] transition-all h-full shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mt-3">
                  <div>
                    <p className="text-sm font-medium text-[var(--text-sub)]">
                      {stat.label}
                    </p>
                    <motion.p
                      className={`text-4xl font-bold mt-2 text-[var(--${stat.color})]`}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: stat.delay + 0.2, type: "spring" }}
                    >
                      {stat.value}
                    </motion.p>
                  </div>
                  <div className="text-3xl">{stat.icon}</div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col - Calendar Grid (65%) */}
        <motion.div
          className="lg:col-span-8"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="bg-[var(--surface)] border-[var(--border)] shadow-sm">
            <CardHeader className="pb-4 border-b border-[var(--border)]">
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                {/* Month/Year Nav */}
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    className="h-9 border-[var(--border)] text-[var(--text-main)] hover:bg-[var(--shell)] font-medium"
                    onClick={handleSetToday}
                  >
                    Hôm nay
                  </Button>
                  <div className="flex items-center bg-[var(--shell)] rounded-md border border-[var(--border)]">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-[var(--text-sub)] hover:text-[var(--text-main)] rounded-none rounded-l-md"
                      onClick={() => {
                        const newDate = new Date(selectedDate);
                        newDate.setMonth(newDate.getMonth() - 1);
                        setSelectedDate(newDate);
                      }}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <h3 className="text-sm font-semibold text-[var(--text-main)] min-w-[140px] text-center px-2">
                      Tháng {selectedDate.getMonth() + 1} Năm {selectedDate.getFullYear()}
                    </h3>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-[var(--text-sub)] hover:text-[var(--text-main)] rounded-none rounded-r-md"
                      onClick={() => {
                        const newDate = new Date(selectedDate);
                        newDate.setMonth(newDate.getMonth() + 1);
                        setSelectedDate(newDate);
                      }}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Event Filters */}
                <div className="flex flex-wrap gap-2">
                  {(["holiday", "meeting", "event", "deadline", "training"] as EventType[]).map(type => (
                    <button
                      key={type}
                      onClick={() => setActiveFilters(prev => ({ ...prev, [type]: !prev[type as keyof typeof activeFilters] }))}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                        activeFilters[type as keyof typeof activeFilters] 
                        ? `bg-[var(--shell)] border-transparent text-[var(--text-main)] shadow-sm` 
                        : "bg-transparent border-[var(--border)] text-[var(--text-sub)] opacity-50 hover:opacity-100"
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full ${getFixedColorClass(type)}`} />
                      {getTypeLabel(type).split(" ")[0]} 
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {/* Custom CSS Grid Calendar */}
              <div className="border border-[var(--border)] rounded-lg overflow-hidden bg-[var(--border)]">
                {/* Weekdays Row */}
                <div className="grid grid-cols-7 bg-[var(--shell)] border-b border-[var(--border)]">
                  {["CN", "Th 2", "Th 3", "Th 4", "Th 5", "Th 6", "Th 7"].map(day => (
                    <div key={day} className="py-3 text-center text-xs font-semibold text-[var(--text-sub)] uppercase">
                      {day}
                    </div>
                  ))}
                </div>
                
                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-px">
                  {getCalendarDays().map((cell, idx) => {
                    const cellDateStr = `${cell.year}-${String(cell.month + 1).padStart(2, "0")}-${String(cell.day).padStart(2, "0")}`;
                    const isSelected = cellDateStr === selectedDateStr;
                    const cellEvents = filteredEvents.filter(e => e.date === cellDateStr);
                    const todayObj = new Date();
                    const realTodayStr = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;
                    const isActualToday = cellDateStr === realTodayStr;

                    return (
                      <div
                        key={idx}
                        onClick={() => setSelectedDate(new Date(cell.year, cell.month, cell.day))}
                        className={`min-h-[100px] p-2 cursor-pointer transition-colors relative bg-[var(--surface)] hover:bg-[var(--shell)] flex flex-col items-center ${
                          !cell.isCurrentMonth ? "opacity-40" : ""
                        } ${isSelected ? "ring-2 ring-[var(--accent-cyan)] ring-inset z-10" : ""}`}
                      >
                        <div className={`w-7 h-7 mt-1 rounded-full flex items-center justify-center text-sm font-medium ${
                          isSelected 
                            ? "bg-[var(--accent-cyan)] text-white" 
                            : isActualToday
                              ? "bg-[var(--primary)] text-white"
                              : "text-[var(--text-main)]"
                        }`}>
                          {cell.day}
                        </div>
                        
                        {/* Dot Indicators */}
                        {cellEvents.length > 0 && (
                          <div className="mt-auto pt-2 pb-1 flex justify-center gap-1 px-1 flex-wrap w-full">
                            {cellEvents.slice(0, 4).map((evt, eIdx) => (
                              <div
                                key={eIdx}
                                title={evt.title}
                                className={`w-2 h-2 rounded-full ${evt.color}`}
                              />
                            ))}
                            {cellEvents.length > 4 && (
                              <div className="w-2 h-2 rounded-full bg-[var(--text-sub)] flex items-center justify-center" title={`${cellEvents.length - 4} sự kiện khác`}>
                                <span className="text-[10px] leading-none text-[var(--surface)] font-bold absolute transform scale-[0.6]">+</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Right Col - Details & Upcoming (35%) */}
        <motion.div
          className="lg:col-span-4 space-y-6"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
        >
          {/* Selected Date Details */}
          <Card className="bg-[var(--surface)] border-[var(--border)] shadow-sm">
            <CardHeader className="pb-3 border-b border-[var(--border)]">
              <CardTitle className="text-lg font-semibold text-[var(--text-main)] flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-[var(--primary)]" /> Chi tiết ngày
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="p-4 rounded-xl bg-[var(--shell)] border border-[var(--border)]">
                <p className="text-sm text-[var(--text-main)] mb-4 font-semibold text-center border-b border-[var(--border)] pb-2">
                  {selectedDate.toLocaleDateString("vi-VN", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
                {selectedDateEvents.length > 0 ? (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                    {selectedDateEvents.map((event) => (
                      <div
                        key={event.id}
                        className="text-sm p-3 rounded-lg bg-[var(--surface)] border border-[var(--border)] shadow-sm group hover:border-[var(--accent-cyan)] transition-all relative"
                      >
                        <div className="flex items-center gap-2 mb-1.5 pr-14">
                          <div className={`w-2.5 h-2.5 rounded-full ${event.color} shrink-0 shadow-sm`} />
                          <span className="text-[var(--text-main)] font-semibold truncate flex-1" title={event.title}>
                            {event.title}
                          </span>
                        </div>
                        <div className="text-[var(--text-sub)] ml-5 text-xs space-y-1">
                          {!event.isAllDay && (
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5" /> {event.startTime} - {event.endTime}
                            </div>
                          )}
                          {event.location && (
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5" /> <span className="truncate" title={event.location}>{event.location}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* HR Actions */}
                        {canCreateEvent && (
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity bg-[var(--shell)] p-0.5 rounded-md shadow-sm border border-[var(--border)]">
                            <button className="p-1.5 text-[var(--text-sub)] hover:text-[var(--primary)] hover:bg-[var(--surface)] rounded" onClick={(e) => handleUpdateEvent(event, e)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button className="p-1.5 text-[var(--text-sub)] hover:text-red-500 hover:bg-[var(--surface)] rounded" onClick={(e) => handleDeleteEvent(event, e)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 text-center text-[var(--text-sub)] opacity-70">
                    <div className="text-4xl mb-2 grayscale opacity-50">🏝️</div>
                    <p className="text-sm italic">Không có sự kiện nào.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Events */}
          <Card className="bg-[var(--surface)] border-[var(--border)] shadow-sm">
            <CardHeader className="pb-3 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-[var(--accent-cyan)]" />
                <CardTitle className="text-lg font-semibold text-[var(--text-main)]">
                  {t("dashboard:companyCalendar.upcomingEvents")}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {loading ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-2 border-[var(--accent-cyan)] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-sm text-[var(--text-sub)]">Đang tải...</p>
                </div>
              ) : upcomingEvents.length > 0 ? (
                upcomingEvents.slice(0, 5).map((event, index) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + index * 0.05 }}
                    className="p-3 rounded-lg border border-[var(--border)] bg-[var(--shell)] hover:bg-[var(--surface)] transition-colors flex items-center gap-3 cursor-pointer"
                    onClick={() => setSelectedDate(new Date(event.date))}
                  >
                    <div className={`w-10 h-10 rounded-lg ${event.color} bg-opacity-20 flex items-center justify-center flex-shrink-0 shadow-inner`}>
                      <span className={`text-${event.color.replace('bg-', '')}`}>
                        {getTypeIcon(event.type)}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[var(--text-main)] truncate block" title={event.title}>
                        {event.title}
                      </p>
                      <p className="text-xs text-[var(--text-sub)] mt-1 flex items-center gap-1.5">
                        <CalendarIcon className="w-3.5 h-3.5" />
                        {new Date(event.date).toLocaleDateString("vi-VN", { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </p>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-8 text-[var(--text-sub)] text-sm">
                  Không có sự kiện sắp tới
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <CreateEventDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} onSuccess={refreshCalendarData} />
      {selectedEvent && <UpdateEventDialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen} event={selectedEvent} onSuccess={refreshCalendarData} />}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="bg-[var(--surface)] border-[var(--border)] text-[var(--text-main)] w-[90vw] sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Xóa sự kiện</DialogTitle>
            <DialogDescription className="text-[var(--text-sub)]">
              Bạn có chắc chắn muốn xóa sự kiện này?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} className="border-[var(--border)] text-[var(--text-main)]">
              Hủy
            </Button>
            <Button onClick={confirmDelete} className="bg-red-500 hover:bg-red-600 text-white">
              Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CompanyCalendarPage;

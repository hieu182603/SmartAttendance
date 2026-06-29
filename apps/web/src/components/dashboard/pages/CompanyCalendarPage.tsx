import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
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
  Coffee
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import eventService, { Event } from "@/services/eventService";
import { CreateEventDialog } from "@/components/dashboard/dialogs/CreateEventDialog";
import { UpdateEventDialog } from "@/components/dashboard/dialogs/UpdateEventDialog";
import { useAuth } from "@/context/AuthContext";
import { hasMinimumLevel, UserRole, type UserRoleType } from "@/utils/roles";
import { cn } from "@/components/ui/utils";

type EventType = "holiday" | "meeting" | "event" | "deadline" | "training";

const getEventTypeColorClass = (type: string): string => {
  switch (type) {
    case "holiday": return "bg-red-500";
    case "meeting": return "bg-blue-500";
    case "event": return "bg-green-500";
    case "deadline": return "bg-orange-500";
    case "training": return "bg-purple-500";
    default: return "bg-blue-500";
  }
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
    type: event.type,
    location: event.location,
    attendees: event.attendeeCount || event.attendees?.length || 0,
    color: getEventTypeColorClass(event.type),
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
  bgClass: string;
}

const CompanyCalendarPage: React.FC = () => {
  const { t } = useTranslation(["dashboard", "common"]);
  const { user } = useAuth();
  
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewDate, setViewDate] = useState<Date>(new Date(today.getFullYear(), today.getMonth(), 1));
  
  const [events, setEvents] = useState<ReturnType<typeof mapEvent>[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<ReturnType<typeof mapEvent>[]>([]);
  const [stats, setStats] = useState({ total: 0, upcoming: 0, holidays: 0, meetingsAndTraining: 0 });
  const [loading, setLoading] = useState(true);
  
  const [activeFilters, setActiveFilters] = useState<Record<EventType, boolean>>({
    holiday: true,
    meeting: true,
    event: true,
    deadline: true,
    training: true,
  });

  const toggleFilter = (type: EventType) => {
    setActiveFilters(prev => ({ ...prev, [type]: !prev[type] }));
  };
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [eventToDelete, setEventToDelete] = useState<ReturnType<typeof mapEvent> | null>(null);

  const canCreateEvent = user ? hasMinimumLevel(user.role as UserRoleType, UserRole.HR_MANAGER) : false;

  const refreshCalendarData = useCallback(async (month: number, year: number) => {
    try {
      setLoading(true);
      
      const firstDayOfMonth = new Date(year, month - 1, 1).getDay();
      const startDate = new Date(year, month - 1, 1 - firstDayOfMonth);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 41);

      const pad = (n: number) => String(n).padStart(2, "0");
      const startStr = `${startDate.getFullYear()}-${pad(startDate.getMonth() + 1)}-${pad(startDate.getDate())}`;
      const endStr = `${endDate.getFullYear()}-${pad(endDate.getMonth() + 1)}-${pad(endDate.getDate())}`;

      const [upcoming, monthEvents, eventStats] = await Promise.all([
        eventService.getUpcomingEvents(),
        eventService.getAllEvents({ startDate: startStr, endDate: endStr }),
        eventService.getEventStats(month, year),
      ]);

      setUpcomingEvents(upcoming.map(mapEvent));
      setEvents(monthEvents.map(mapEvent));
      setStats(eventStats);
    } catch (error) {
      console.error("Error fetching events:", error);
      toast.error(t("dashboard:companyCalendar.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    refreshCalendarData(viewDate.getMonth() + 1, viewDate.getFullYear());
  }, [refreshCalendarData, viewDate.getMonth(), viewDate.getFullYear()]);

  const pad = (n: number) => String(n).padStart(2, "0");

  const selectedDateStr = useMemo(() => {
    return `${selectedDate.getFullYear()}-${pad(selectedDate.getMonth() + 1)}-${pad(selectedDate.getDate())}`;
  }, [selectedDate]);

  const filteredEvents = useMemo(() => {
    return events.filter(e => activeFilters[e.type as EventType]);
  }, [events, activeFilters]);

  const selectedDateEvents = useMemo(() => {
    return filteredEvents.filter(e => e.date === selectedDateStr);
  }, [filteredEvents, selectedDateStr]);
  
  const getTypeLabel = (type: EventType): string => {
    const labels: Record<EventType, string> = {
      holiday: t("dashboard:companyCalendar.eventTypes.holiday"),
      meeting: t("dashboard:companyCalendar.eventTypes.meeting"),
      event: t("dashboard:companyCalendar.eventTypes.event"),
      deadline: t("dashboard:companyCalendar.eventTypes.deadline"),
      training: t("dashboard:companyCalendar.eventTypes.training"),
    };
    return labels[type] || type;
  };

  const handleCreateSuccess = (): void => {
    refreshCalendarData(viewDate.getMonth() + 1, viewDate.getFullYear());
  };

  const confirmDelete = async (): Promise<void> => {
    if (!eventToDelete) return;
    try {
      await eventService.deleteEvent(eventToDelete.id);
      toast.success(t("dashboard:companyCalendar.deleteSuccess"));
      handleCreateSuccess();
      setIsDeleteDialogOpen(false);
      setEventToDelete(null);
    } catch (error: any) {
      console.error("Error deleting event:", error);
      toast.error(error.response?.data?.message || t("dashboard:companyCalendar.deleteError"));
    }
  };

  const currentMonthLabel = viewDate.toLocaleDateString(t("common:locale", { defaultValue: "vi-VN" }), { month: "short" }).replace(/^t/, "T");

  const statCards: StatCard[] = [
    { label: `${t("dashboard:companyCalendar.stats.total")} (${currentMonthLabel})`, value: stats.total, color: "text-blue-500 dark:text-blue-400", bgClass: "bg-blue-500/10 border-blue-500/20", icon: "📋", delay: 0.1 },
    { label: t("dashboard:companyCalendar.stats.upcoming"), value: stats.upcoming, color: "text-emerald-500 dark:text-emerald-400", bgClass: "bg-emerald-500/10 border-emerald-500/20", icon: "⏰", delay: 0.2 },
    { label: `${t("dashboard:companyCalendar.stats.holidays")} (${currentMonthLabel})`, value: stats.holidays, color: "text-red-500 dark:text-red-400", bgClass: "bg-red-500/10 border-red-500/20", icon: "🎉", delay: 0.3 },
    { label: `${t("dashboard:companyCalendar.stats.meetingsAndTraining")} (${currentMonthLabel})`, value: stats.meetingsAndTraining, color: "text-cyan-500 dark:text-cyan-400", bgClass: "bg-cyan-500/10 border-cyan-500/20", icon: "👥", delay: 0.4 },
  ];

  // Calendar Grid Generation
  const calendarDays = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days = [];
    
    // Previous month padding
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, daysInPrevMonth - i),
        isCurrentMonth: false,
      });
    }
    
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }
    
    // Next month padding (to fill the grid to 42 cells - 6 rows)
    const remainingCells = 42 - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }

    return days;
  }, [viewDate]);

  const weekdays = [
    t("dashboard:companyCalendar.weekdays.sun", { defaultValue: "CN" }),
    t("dashboard:companyCalendar.weekdays.mon", { defaultValue: "Th 2" }),
    t("dashboard:companyCalendar.weekdays.tue", { defaultValue: "Th 3" }),
    t("dashboard:companyCalendar.weekdays.wed", { defaultValue: "Th 4" }),
    t("dashboard:companyCalendar.weekdays.thu", { defaultValue: "Th 5" }),
    t("dashboard:companyCalendar.weekdays.fri", { defaultValue: "Th 6" }),
    t("dashboard:companyCalendar.weekdays.sat", { defaultValue: "Th 7" })
  ];

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] bg-clip-text text-transparent">
            {t("dashboard:companyCalendar.title")}
          </h1>
          <p className="text-[var(--text-sub)] mt-2">
            {t("dashboard:companyCalendar.description")}
          </p>
        </div>
        {canCreateEvent && (
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] text-white hover:opacity-90 shadow-md transition-all shrink-0"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t("dashboard:companyCalendar.createEvent")}
          </Button>
        )}
      </div>

      {/* Summary Stats - 4 KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: stat.delay }}
            whileHover={{ scale: 1.02 }}
          >
            <Card className={cn("border transition-all h-full", stat.bgClass)}>
              <CardContent className="p-4 sm:p-5">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-[var(--text-sub)] mb-1">
                      {stat.label}
                    </p>
                    <motion.p
                      className={cn("text-3xl font-bold", stat.color)}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: stat.delay + 0.2, type: "spring" }}
                    >
                      {stat.value}
                    </motion.p>
                  </div>
                  <div className="text-3xl opacity-80">{stat.icon}</div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Main Grid: Left 65%, Right 35% */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Calendar Month View (65%) */}
        <motion.div className="lg:col-span-8 space-y-6" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
          <Card className="bg-[var(--surface)] border-[var(--border)] shadow-sm overflow-hidden flex flex-col h-full min-h-[600px]">
            {/* Calendar Header */}
            <div className="p-4 sm:p-6 border-b border-[var(--border)] flex flex-col gap-4 bg-[var(--shell)]/50">
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 border-[var(--border)] text-[var(--text-main)] hover:bg-[var(--surface)] hover:text-[var(--primary)] transition-colors"
                  onClick={() => {
                    const newDate = new Date(viewDate);
                    newDate.setMonth(newDate.getMonth() - 1);
                    setViewDate(newDate);
                  }}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                
                <div className="flex items-center gap-3">
                  <h2 className="text-xl sm:text-2xl font-semibold text-[var(--text-main)] capitalize">
                    {viewDate.toLocaleDateString(t("common:locale", { defaultValue: "vi-VN" }), {
                      month: "long",
                      year: "numeric",
                    }).replace(/^t/, "T")}
                  </h2>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-xs font-medium border-[var(--border)] text-[var(--text-sub)] hover:text-[var(--primary)]"
                    onClick={() => {
                      setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
                      setSelectedDate(new Date());
                    }}
                  >
                    {t("dashboard:companyCalendar.today", { defaultValue: "Hôm nay" })}
                  </Button>
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 border-[var(--border)] text-[var(--text-main)] hover:bg-[var(--surface)] hover:text-[var(--primary)] transition-colors"
                  onClick={() => {
                    const newDate = new Date(viewDate);
                    newDate.setMonth(newDate.getMonth() + 1);
                    setViewDate(newDate);
                  }}
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
              
              {/* Event Filters */}
              <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 pt-1">
                {(["holiday", "meeting", "event", "deadline", "training"] as EventType[]).map((type) => (
                  <label key={type} className="flex items-center gap-1.5 cursor-pointer text-[13px] font-medium text-[var(--text-sub)] hover:text-[var(--text-main)] transition-colors">
                    <input 
                      type="checkbox" 
                      className="rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)] cursor-pointer"
                      checked={activeFilters[type]}
                      onChange={() => toggleFilter(type)}
                    />
                    <div className={cn("w-2 h-2 rounded-full", 
                      type === "holiday" ? "bg-red-500" :
                      type === "meeting" ? "bg-blue-500" :
                      type === "event" ? "bg-green-500" :
                      type === "deadline" ? "bg-orange-500" : "bg-purple-500"
                    )} />
                    {getTypeLabel(type)}
                  </label>
                ))}
              </div>
            </div>
            
            {/* Calendar Grid Container */}
            <div className="p-4 sm:p-6 flex-1 flex flex-col min-h-0">
              {/* Weekdays Row */}
              <div className="grid grid-cols-7 mb-4 shrink-0">
                {weekdays.map((day, idx) => (
                  <div key={idx} className="text-center font-bold text-sm text-[var(--text-sub)]">
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Days Grid */}
              <div className="grid grid-cols-7 grid-rows-6 gap-2 sm:gap-3 flex-1 min-h-0">
                {calendarDays.map((dayObj, i) => {
                  const dateStr = `${dayObj.date.getFullYear()}-${pad(dayObj.date.getMonth() + 1)}-${pad(dayObj.date.getDate())}`;
                  const dayEvents = filteredEvents.filter(e => e.date === dateStr);
                  const isToday = dateStr === `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
                  const isSelected = selectedDate && dateStr === selectedDateStr;
                  
                  return (
                    <div
                      key={i}
                      onClick={() => setSelectedDate(dayObj.date)}
                      className={cn(
                        "relative flex flex-col p-1 sm:p-2 min-h-[70px] sm:min-h-[100px] rounded-xl border transition-all cursor-pointer group",
                        dayObj.isCurrentMonth ? "bg-[var(--surface)] border-[var(--border)]/50" : "bg-[var(--shell)]/30 border-transparent opacity-50",
                        isSelected && "ring-2 ring-[var(--primary)] border-transparent bg-[var(--primary)]/5",
                        !isSelected && "hover:border-[var(--primary)]/50 hover:bg-[var(--shell)]"
                      )}
                    >
                      <div className="flex justify-between items-start">
                        <span className={cn(
                          "flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full text-xs sm:text-sm font-medium transition-colors",
                          isToday && !isSelected && "bg-[var(--primary)] text-white shadow-md shadow-blue-500/20",
                          isSelected && "bg-[var(--primary)] text-white font-bold",
                          !isToday && !isSelected && "text-[var(--text-main)]",
                          !dayObj.isCurrentMonth && !isToday && !isSelected && "text-[var(--text-sub)]"
                        )}>
                          {dayObj.date.getDate()}
                        </span>
                        
                        {/* Event indicator badge (if too many) */}
                        {dayEvents.length > 3 && (
                          <span className="text-[10px] text-[var(--text-sub)] font-medium">+{dayEvents.length - 3}</span>
                        )}
                      </div>
                      
                      {/* Event Dots */}
                      <div className="mt-auto flex flex-wrap gap-1 w-full">
                        {dayEvents.slice(0, 4).map(evt => (
                          <div 
                            key={evt.id} 
                            className={cn("w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full transition-all shadow-sm", evt.color)}
                            title={evt.title}
                          />
                        ))}
                        {dayEvents.length > 4 && (
                          <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[var(--text-sub)] opacity-50" title={`+${dayEvents.length - 4} sự kiện khác`} />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </motion.div>
        
        {/* RIGHT COLUMN: Selected Day Details & Upcoming Events (35%) */}
        <motion.div className="lg:col-span-4 space-y-6" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}>
          
          {/* Selected Date Details */}
          <Card className="bg-[var(--surface)] border-[var(--border)] overflow-hidden shadow-sm flex flex-col h-[400px]">
            <div className="bg-gradient-to-r from-[var(--primary)]/10 to-[var(--accent-cyan)]/10 p-4 border-b border-[var(--border)] flex-shrink-0">
              <h3 className="text-lg font-semibold text-[var(--text-main)] flex items-center gap-2 capitalize">
                <CalendarIcon className="h-5 w-5 text-[var(--primary)]" />
                {selectedDate.toLocaleDateString(t("common:locale", { defaultValue: "vi-VN" }), {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </h3>
            </div>
            
            <CardContent className="p-0 flex-1 overflow-y-auto custom-scrollbar relative">
              {selectedDateEvents.length > 0 ? (
                <div className="p-4 space-y-3">
                  {selectedDateEvents.map((event) => (
                    <div
                      key={event.id}
                      className="group p-4 rounded-xl border border-[var(--border)] bg-[var(--shell)]/50 hover:bg-[var(--surface)] hover:border-[var(--primary)]/50 transition-all relative overflow-hidden"
                    >
                      <div className={cn("absolute left-0 top-0 bottom-0 w-1.5", event.color)} />
                      <div className="pl-3">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="font-semibold text-[var(--text-main)] pr-8">{event.title}</h4>
                          {canCreateEvent && (
                            <div className="flex opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 top-2 bg-[var(--surface)] shadow-sm rounded-md border border-[var(--border)]">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-[var(--text-sub)] hover:text-[var(--primary)] rounded-r-none"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedEvent(event.originalEvent);
                                  setIsUpdateDialogOpen(true);
                                }}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <div className="w-[1px] bg-[var(--border)] h-full" />
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-[var(--text-sub)] hover:text-red-500 hover:bg-red-500/10 rounded-l-none"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEventToDelete(event);
                                  setIsDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                        {event.description && <p className="text-xs text-[var(--text-sub)] mb-3">{event.description}</p>}
                        
                        <div className="flex flex-col gap-1.5 text-xs text-[var(--text-sub)]">
                          {!event.isAllDay && (
                            <div className="flex items-center gap-2">
                              <Clock className="h-3.5 w-3.5 text-[var(--accent-cyan)]" />
                              <span>{event.startTime} - {event.endTime}</span>
                            </div>
                          )}
                          {event.location && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3.5 w-3.5 text-emerald-500" />
                              <span>{event.location}</span>
                            </div>
                          )}
                          {event.attendees > 0 && (
                            <div className="flex items-center gap-2">
                              <Users className="h-3.5 w-3.5 text-[var(--primary)]" />
                              <span>{event.attendees} người</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                  <div className="w-24 h-24 mb-6 rounded-full bg-blue-500/10 flex items-center justify-center relative">
                    <Coffee className="h-12 w-12 text-blue-500/60" />
                    <motion.div
                      className="absolute top-2 right-2 w-3 h-3 bg-blue-400 rounded-full"
                      animate={{ y: [0, -10, 0], opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                    <motion.div
                      className="absolute top-4 right-6 w-2 h-2 bg-blue-300 rounded-full"
                      animate={{ y: [0, -15, 0], opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
                    />
                  </div>
                  <h4 className="text-lg font-medium text-[var(--text-main)] mb-2">Hôm nay trống lịch</h4>
                  <p className="text-sm text-[var(--text-sub)] max-w-[220px]">
                    Không có sự kiện hay cuộc họp nào. Hãy thư giãn nhé!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Events List */}
          <Card className="bg-[var(--surface)] border-[var(--border)] shadow-sm flex flex-col max-h-[400px]">
            <CardHeader className="pb-3 border-b border-[var(--border)] flex-shrink-0">
              <CardTitle className="text-[var(--text-main)] text-base flex items-center gap-2">
                <Bell className="h-4 w-4 text-[var(--accent-cyan)]" />
                {t("dashboard:companyCalendar.upcomingEvents")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-y-auto custom-scrollbar relative min-h-[150px]">
              {loading ? (
                <div className="absolute inset-0 flex justify-center items-center">
                  <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : upcomingEvents.length > 0 ? (
                <div className="divide-y divide-[var(--border)]">
                  {upcomingEvents.map((event) => (
                    <div key={`upcoming-${event.id}`} className="p-4 hover:bg-[var(--shell)]/50 transition-colors cursor-pointer group" onClick={() => {
                        const [y, m, d] = event.date.split("-");
                        setViewDate(new Date(Number(y), Number(m)-1, 1));
                        setSelectedDate(new Date(Number(y), Number(m)-1, Number(d)));
                    }}>
                      <div className="flex gap-4">
                        <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-[var(--shell)] border border-[var(--border)] shrink-0 group-hover:border-[var(--primary)]/50 transition-colors">
                          <span className="text-[10px] font-medium text-[var(--text-sub)] uppercase">
                            {new Date(event.date).toLocaleDateString(t("common:locale", { defaultValue: "vi-VN" }), { month: "short" })}
                          </span>
                          <span className={cn("text-lg font-bold leading-none mt-0.5", event.color.replace("bg-", "text-").replace("-500", "-400"))}>
                            {event.date.split("-")[2]}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-[var(--text-main)] truncate group-hover:text-[var(--primary)] transition-colors">{event.title}</h4>
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-[var(--text-sub)]">
                            {!event.isAllDay && (
                              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {event.startTime}</span>
                            )}
                            <span className="flex items-center gap-1"><CalendarIcon className="h-3 w-3" /> {getTypeLabel(event.type)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-[var(--text-sub)]">
                  {t("dashboard:companyCalendar.noUpcomingEvents")}
                </div>
              )}
            </CardContent>
          </Card>

        </motion.div>
      </div>

      <CreateEventDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={handleCreateSuccess}
      />
      
      {selectedEvent && (
        <UpdateEventDialog
          open={isUpdateDialogOpen}
          onOpenChange={setIsUpdateDialogOpen}
          event={selectedEvent}
          onSuccess={handleCreateSuccess}
        />
      )}

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-[var(--surface)] border-[var(--border)]">
          <DialogHeader>
            <DialogTitle className="text-red-500 flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              {t("dashboard:companyCalendar.deleteConfirm")}
            </DialogTitle>
            <DialogDescription className="text-[var(--text-sub)]">
              {t("dashboard:companyCalendar.deleteDesc")}
              <span className="block mt-2 font-medium text-[var(--text-main)]">
                {eventToDelete?.title}
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              className="border-[var(--border)] text-[var(--text-main)] hover:bg-[var(--shell)]"
            >
              {t("common:cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDelete}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {t("common:delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CompanyCalendarPage;

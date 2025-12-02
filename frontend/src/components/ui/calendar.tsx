import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, DayPickerProps } from "react-day-picker";
import { cn } from "@/components/ui/utils";
import "react-day-picker/dist/style.css";

export type CalendarProps = DayPickerProps & {
  className?: string;
  classNames?: Record<string, string>;
  showOutsideDays?: boolean;
};

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-4", className)}
      classNames={{
        months:
          "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0 justify-center",
        month: "space-y-4 flex flex-col items-center",
        caption: "hidden",
        nav: "hidden",
        nav_button: cn("hidden"),
        nav_button_previous: "hidden",
        nav_button_next: "hidden",
        caption_label: "hidden",

        table: "w-full border-collapse",
        head_row: "flex mb-2",
        head_cell: "text-[var(--text-sub)] rounded-md w-9 font-normal text-xs",
        row: "flex w-full mt-1",
        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100 rounded-md hover:bg-[var(--shell)] transition-colors text-[var(--text-main)]"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-[var(--primary)] text-white hover:bg-[var(--primary)] hover:text-white focus:bg-[var(--primary)] focus:text-white",
        day_today: "bg-[var(--primary)]/20 text-[var(--text-main)]",
        day_outside:
          "day-outside text-[var(--text-sub)] opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-[var(--text-sub)] opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ...props }) => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };

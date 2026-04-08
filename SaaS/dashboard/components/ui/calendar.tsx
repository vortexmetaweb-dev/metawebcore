"use client"

import * as React from "react"
import { DayFlag, DayPicker, type DayPickerProps, SelectionState, UI } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/SaaS/dashboard/components/ui/button"
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
} from "lucide-react"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: DayPickerProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-2", className)}
      classNames={{
        [UI.Months]: "flex flex-col gap-4",
        [UI.Month]: "space-y-3",
        [UI.MonthCaption]: "relative flex items-center justify-center pt-1",
        [UI.CaptionLabel]: "text-sm font-semibold",
        [UI.Nav]: "flex items-center gap-1",
        [UI.PreviousMonthButton]: cn(
          buttonVariants({ variant: "ghost", size: "icon-sm" }),
          "rounded-full"
        ),
        [UI.NextMonthButton]: cn(
          buttonVariants({ variant: "ghost", size: "icon-sm" }),
          "rounded-full"
        ),
        [UI.MonthGrid]: "w-full border-collapse",
        [UI.Weekdays]: "flex",
        [UI.Weekday]: "w-9 text-center text-[0.8rem] font-medium text-muted-foreground",
        [UI.Weeks]: "grid gap-1",
        [UI.Week]: "flex w-full",
        [UI.Day]: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
        [UI.DayButton]: cn(
          buttonVariants({ variant: "ghost", size: "icon-sm" }),
          "size-9 rounded-full p-0 font-normal"
        ),
        [SelectionState.selected]:
          "rounded-full [&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary",
        [SelectionState.range_middle]:
          "rounded-full [&>button]:bg-muted [&>button]:text-foreground",
        [SelectionState.range_start]:
          "rounded-full [&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary",
        [SelectionState.range_end]:
          "rounded-full [&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary",
        [DayFlag.today]: "rounded-full [&>button]:bg-muted [&>button]:text-foreground",
        [DayFlag.outside]:
          "rounded-full [&>button]:text-muted-foreground [&>button]:opacity-40",
        [DayFlag.disabled]:
          "rounded-full [&>button]:text-muted-foreground [&>button]:opacity-40",
        [DayFlag.hidden]: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ className, orientation, ...props }) => {
          const Icon =
            orientation === "left"
              ? ChevronLeftIcon
              : orientation === "right"
                ? ChevronRightIcon
                : orientation === "up"
                  ? ChevronUpIcon
                  : ChevronDownIcon
          return <Icon className={cn("size-4", className)} {...props} />
        },
      }}
      {...props}
    />
  )
}

export { Calendar }

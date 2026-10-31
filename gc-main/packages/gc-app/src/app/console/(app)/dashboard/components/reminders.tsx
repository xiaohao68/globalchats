"use client"

import * as React from "react"
import { ArrowRight, CircleCheck } from "lucide-react"
import { cn } from "@/modules/shared"
import { Badge } from "@/shadcn-ui-kit/ui/badge"
import { Button } from "@/shadcn-ui-kit/ui/button"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/shadcn-ui-kit/ui/card"
import { AddReminderDialog } from "./add-reminder-dialog"
import { type AddReminderInput, initialReminders } from "./reminder.type"

export function Reminders() {
  const [reminders, setReminders] = React.useState(initialReminders)

  const handleAddReminder = React.useCallback((newReminder: AddReminderInput) => {
    setReminders((current) => [
      ...current,
      {
        ...newReminder,
        id: current.length + 1,
        isCompleted: false
      }
    ])
  }, [])

  return (
    <Card className="xl:col-span-2">
      <CardHeader>
        <CardTitle>Reminder</CardTitle>
        <CardAction>
          <AddReminderDialog onAddReminder={handleAddReminder} />
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 lg:grid-cols-3">
          {reminders.map((reminder) => (
            <Card key={reminder.id}>
              <CardHeader>
                <CardTitle className="flex items-center text-base font-semibold capitalize">
                  <span
                    className={cn("d-inline me-2 size-2 rounded-full", {
                      "bg-gray-400": reminder.level === "low",
                      "bg-orange-400": reminder.level === "medium",
                      "bg-red-600": reminder.level === "high"
                    })}></span>{" "}
                  {reminder.level}
                  {reminder.isCompleted ? (
                    <CircleCheck className="ms-auto me-2 size-4 text-green-600" />
                  ) : (
                    <CircleCheck className="ms-auto me-2 size-4 text-gray-400" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-muted-foreground text-sm">{reminder.date}</div>
                <div className="text-sm">{reminder.note}</div>
                <Badge variant="outline">{reminder.type}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="mt-4 text-end">
          <Button variant="link" className="text-muted-foreground hover:text-primary" asChild>
            <a href="#">
              Show the other 10 reminders <ArrowRight className="size-4" />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

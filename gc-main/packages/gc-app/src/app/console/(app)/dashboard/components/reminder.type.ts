export type ReminderPriority = "low" | "medium" | "high"

export interface ReminderItem {
  id: number
  note: string
  level: ReminderPriority
  type: string
  isCompleted: boolean
  date: string
}

export interface AddReminderInput {
  note: string
  level: ReminderPriority
  type: string
  date: string
}

export const initialReminders: ReminderItem[] = [
  {
    id: 1,
    note: "Create a design training for beginners.",
    level: "low",
    type: "Design Education",
    isCompleted: false,
    date: "Today, 12:30"
  },
  {
    id: 2,
    note: "Have a meeting with the new design team.",
    level: "medium",
    type: "Meeting",
    isCompleted: true,
    date: "Today, 10:00"
  },
  {
    id: 3,
    note: "Respond to customer support emails.",
    level: "high",
    type: "Customer Support",
    isCompleted: false,
    date: "Tomorrow, 16:30"
  }
]

"use client";

import React from "react";
import { addDays, format, isSameDay, startOfDay } from "date-fns";

import { PlusCircleIcon } from "lucide-react";
import { Button } from "@/shadcn-ui-kit/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/shadcn-ui-kit/ui/dialog";
import { Input } from "@/shadcn-ui-kit/ui/input";
import { Label } from "@/shadcn-ui-kit/ui/label";
import { RadioGroup, RadioGroupItem } from "@/shadcn-ui-kit/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/shadcn-ui-kit/ui/select";
import { DateTimePicker } from "./date-time-picker";
import { type AddReminderInput, type ReminderPriority } from "./reminder.type";

type NewReminder = {
  priority: ReminderPriority;
  text: string;
  category: string;
};

interface AddReminderDialogProps {
  onAddReminder: (newReminder: AddReminderInput) => void;
}

const defaultNewReminder: NewReminder = {
  priority: "medium",
  text: "",
  category: ""
};

function formatReminderDate(value: Date) {
  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);

  const dateLabel = isSameDay(value, today)
    ? "Today"
    : isSameDay(value, tomorrow)
      ? "Tomorrow"
      : format(value, "MM/dd/yyyy");

  return `${dateLabel}, ${format(value, "HH:mm")}`;
}

export function AddReminderDialog({ onAddReminder }: AddReminderDialogProps) {
  const [date, setDate] = React.useState<Date>();
  const [open, setOpen] = React.useState(false);
  const [newReminder, setNewReminder] = React.useState(defaultNewReminder);

  const handleAddReminder = () => {
    if (!date) return;
    if (!newReminder.category) return;

    const note = newReminder.text.trim();
    if (!note) return;

    onAddReminder({
      level: newReminder.priority,
      note,
      type: newReminder.category,
      date: formatReminderDate(date)
    });

    setNewReminder(defaultNewReminder);
    setDate(undefined);
    setOpen(false);
  };

  const isSubmitDisabled = !date || !newReminder.category || !newReminder.text.trim();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <PlusCircleIcon />
          Set Reminder
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Reminder</DialogTitle>
        </DialogHeader>
        <div className="mt-4 grid space-y-6">
          <div className="grid gap-2">
            <Label htmlFor="text">Note</Label>
            <Input
              id="text"
              placeholder="Enter your reminder"
              value={newReminder.text}
              onChange={(e) => setNewReminder({ ...newReminder, text: e.target.value })}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="text">Date</Label>
            <DateTimePicker date={date} setDate={setDate} />
          </div>

          <div className="grid gap-3">
            <Label>Priority</Label>
            <RadioGroup
              value={newReminder.priority}
              onValueChange={(value) =>
                setNewReminder({ ...newReminder, priority: value as ReminderPriority })
              }
              className="flex space-x-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="low" id="low" />
                <Label htmlFor="low" className="cursor-pointer">
                  Low
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="medium" id="medium" />
                <Label htmlFor="medium" className="cursor-pointer">
                  Medium
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="high" id="high" />
                <Label htmlFor="high" className="cursor-pointer">
                  High
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={newReminder.category}
              onValueChange={(value) => setNewReminder({ ...newReminder, category: value })}>
              <SelectTrigger id="category" className="w-full">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Meeting">Meeting</SelectItem>
                <SelectItem value="Design Education">Design Education</SelectItem>
                <SelectItem value="Customer Support">Customer Support</SelectItem>
                <SelectItem value="Personal">Personal</SelectItem>
                <SelectItem value="Work">Work</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={handleAddReminder} disabled={isSubmitDisabled}>
            Add Reminder
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

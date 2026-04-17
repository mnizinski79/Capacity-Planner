"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Quarter {
  id: string
  label: string
  status: "ACTIVE" | "UPCOMING" | "ARCHIVED"
}

interface QuarterSelectorProps {
  quarters: Quarter[]
  value: string
  onChange: (id: string) => void
}

export function QuarterSelector({ quarters, value, onChange }: QuarterSelectorProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-48">
        <SelectValue placeholder="Select quarter" />
      </SelectTrigger>
      <SelectContent>
        {quarters.map((q) => (
          <SelectItem key={q.id} value={q.id}>
            {q.label}
            {q.status === "UPCOMING" && " (upcoming)"}
            {q.status === "ARCHIVED" && " (archived)"}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

import { Resend } from "resend"

interface SprintSummary {
  label: string
  dates: string[]
}

interface VacationChangePayload {
  changerName: string
  changerEmail: string
  teamName: string
  quarterLabel: string
  action: "added" | "removed"
  sprintSummary: SprintSummary[]
  toEmails: string[]
}

export async function sendVacationChangeNotification(payload: VacationChangePayload): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY not set — skipping vacation change notification")
    return
  }

  const { changerName, changerEmail, teamName, quarterLabel, action, sprintSummary, toEmails } = payload
  if (toEmails.length === 0) return

  // In dev, override recipients so test emails go to the Resend account owner
  const recipients = process.env.RESEND_TO_OVERRIDE
    ? [process.env.RESEND_TO_OVERRIDE]
    : toEmails

  const resend = new Resend(apiKey)
  const from = process.env.EMAIL_FROM ?? "onboarding@resend.dev"
  const subject = `${changerName} ${action} vacation days – ${teamName} (${quarterLabel})`

  const sprintRows = sprintSummary
    .map(
      (s) => `
      <tr>
        <td style="padding:6px 12px;font-weight:600;vertical-align:top;white-space:nowrap">${s.label}</td>
        <td style="padding:6px 12px;color:#555">${s.dates.join(", ")}</td>
      </tr>`
    )
    .join("")

  const actionColor = action === "added" ? "#16a34a" : "#dc2626"
  const actionLabel = action === "added" ? "Added vacation days" : "Removed vacation days"

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;color:#111;max-width:560px;margin:0 auto;padding:24px">
  <h2 style="margin:0 0 4px">${actionLabel}</h2>
  <p style="margin:0 0 20px;color:#555">
    <strong style="color:${actionColor}">${changerName}</strong>
    updated their vacation days for <strong>${teamName}</strong> — ${quarterLabel}
  </p>
  <table style="border-collapse:collapse;width:100%;background:#f9fafb;border-radius:6px;overflow:hidden">
    <thead>
      <tr style="background:#f3f4f6">
        <th style="padding:8px 12px;text-align:left;font-size:12px;text-transform:uppercase;color:#6b7280">Sprint</th>
        <th style="padding:8px 12px;text-align:left;font-size:12px;text-transform:uppercase;color:#6b7280">Dates</th>
      </tr>
    </thead>
    <tbody>${sprintRows}</tbody>
  </table>
  <p style="margin:20px 0 0;font-size:12px;color:#9ca3af">
    Capacity Planner — automated notification
  </p>
</body>
</html>`

  try {
    await resend.emails.send({ from, to: recipients, reply_to: changerEmail, subject, html })
  } catch (err) {
    console.error("[email] Failed to send vacation change notification:", err)
  }
}

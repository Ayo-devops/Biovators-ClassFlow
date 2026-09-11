export function daysUntil(date, now = new Date()) {
  const parts = String(date).slice(0, 10).split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n)))
    return Infinity;
  return Math.round(
    (Date.UTC(parts[0], parts[1] - 1, parts[2]) -
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) /
      86400000,
  );
}
export function deadlineStatus(date, now) {
  const days = daysUntil(date, now);
  if (days < 0) return { label: "Overdue", tone: "danger" };
  if (days === 0) return { label: "Due today", tone: "danger" };
  if (days <= 2) return { label: "Due soon", tone: "warning" };
  if (days <= 7) return { label: "This week", tone: "blue" };
  return { label: "Upcoming", tone: "green" };
}
export function formatDate(date) {
  const d = new Date(String(date).slice(0, 10) + "T12:00:00");
  return Number.isNaN(d.getTime())
    ? "No date"
    : d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

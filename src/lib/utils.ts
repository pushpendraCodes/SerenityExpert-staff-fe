export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function formatINR(amount = 0) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDuration(seconds = 0) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatRelativeTime(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.startsWith("91") && digits.length === 12) return `+${digits}`;
  if (phone.startsWith("+")) return phone;
  return `+${digits}`;
}

export function getUserName(user: { name?: string } | string | undefined) {
  if (!user) return "User";
  if (typeof user === "string") return "User";
  return user.name || "User";
}

export function getUserAvatar(user: { avatar?: string; name?: string; _id?: string } | string | undefined) {
  if (user && typeof user !== "string" && user.avatar) return user.avatar;
  const seed = user && typeof user !== "string" ? user._id || user.name || "user" : "user";
  return `https://api.dicebear.com/9.x/thumbs/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
}

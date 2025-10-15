import { formatDistanceToNow } from "date-fns";

export const safeFormatDistance = (dateValue) => {
  if (!dateValue) return "Unknown"; // or "Never updated" if you prefer

  const parsedDate = new Date(dateValue);
  return !isNaN(parsedDate.getTime())
    ? formatDistanceToNow(parsedDate, { addSuffix: true })
    : "Unknown";
};

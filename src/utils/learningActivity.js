export const localDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const recordActivity = (activity = {}, date = new Date(), amount = 1) => {
  const key = localDateKey(date);
  return { ...activity, [key]: Math.max(0, Number(activity[key]) || 0) + amount };
};

export const buildActivityTimeline = (activity = {}, days = 14, endDate = new Date()) => {
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(end);
    date.setDate(end.getDate() - days + index + 1);
    const key = localDateKey(date);
    return { key, date, value: Number(activity[key]) || 0 };
  });
};

export const buildActivityWeeks = (activity = {}, weeks = 16, endDate = new Date()) => {
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  end.setDate(end.getDate() + (6 - end.getDay()));
  const start = new Date(end);
  start.setDate(end.getDate() - weeks * 7 + 1);
  return Array.from({ length: weeks }, (_, weekIndex) => Array.from({ length: 7 }, (_, dayIndex) => {
    const date = new Date(start);
    date.setDate(start.getDate() + weekIndex * 7 + dayIndex);
    const key = localDateKey(date);
    return { key, date, value: Number(activity[key]) || 0 };
  }));
};

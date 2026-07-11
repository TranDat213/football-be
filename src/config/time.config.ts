const SLOT_MINUTES = 90; // chỉnh lại nếu khác — copy đúng giá trị đang dùng bên field module

function toMinutes(time: Date | string): number {
  const d = new Date(time);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

export { SLOT_MINUTES, toMinutes, formatMinutes };
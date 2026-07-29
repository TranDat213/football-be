export const getEnv = (key: string, defaultValue?: string) => {
  const val = process.env[key] ?? defaultValue;
  if (!val) throw new Error(`Biến môi trường ${key} chưa được thiết lập`);
  return val;
};
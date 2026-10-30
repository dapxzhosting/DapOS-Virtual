import { useEffect, useState } from "react";
import { useOS } from "../store/os";

export interface Weather {
  temp: number;
  code: number;
  wind: number;
  daily: { date: string; max: number; min: number; code: number }[];
}
export type WeatherKind = "sun" | "cloud" | "rain" | "drizzle" | "snow" | "storm" | "fog";

export function describeCode(code: number): { label: string; kind: WeatherKind } {
  if (code === 0) return { label: "Cerah", kind: "sun" };
  if (code <= 2) return { label: "Cerah berawan", kind: "sun" };
  if (code === 3) return { label: "Berawan", kind: "cloud" };
  if (code === 45 || code === 48) return { label: "Berkabut", kind: "fog" };
  if (code >= 51 && code <= 57) return { label: "Gerimis", kind: "drizzle" };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return { label: "Hujan", kind: "rain" };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { label: "Salju", kind: "snow" };
  if (code >= 95) return { label: "Badai petir", kind: "storm" };
  return { label: "Berawan", kind: "cloud" };
}

interface ApiResponse {
  current: { temperature_2m: number; weather_code: number; wind_speed_10m: number };
  daily: { time: string[]; weather_code: number[]; temperature_2m_max: number[]; temperature_2m_min: number[] };
}

const cache = new Map<string, { t: number; data: Weather }>();

async function load(lat: number, lon: number): Promise<Weather> {
  const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.t < 10 * 60 * 1000) return hit.data;
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,weather_code,wind_speed_10m` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min&forecast_days=4&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("HTTP " + res.status);
  const j = (await res.json()) as ApiResponse;
  const data: Weather = {
    temp: Math.round(j.current.temperature_2m),
    code: j.current.weather_code,
    wind: Math.round(j.current.wind_speed_10m),
    daily: j.daily.time.map((d, i) => ({
      date: d,
      code: j.daily.weather_code[i] ?? 0,
      max: Math.round(j.daily.temperature_2m_max[i] ?? 0),
      min: Math.round(j.daily.temperature_2m_min[i] ?? 0),
    })),
  };
  cache.set(key, { t: Date.now(), data });
  return data;
}

export function useWeather() {
  const loc = useOS((s) => s.weatherLoc);
  const [data, setData] = useState<Weather | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    const run = () =>
      load(loc.lat, loc.lon)
        .then((d) => {
          if (alive) {
            setData(d);
            setError(false);
          }
        })
        .catch(() => alive && setError(true));
    void run();
    const t = setInterval(run, 15 * 60 * 1000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [loc.lat, loc.lon]);

  return { data, error, loc };
}

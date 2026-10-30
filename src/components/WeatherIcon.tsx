import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, Sun } from "lucide-react";
import type { WeatherKind } from "../lib/weather";

export default function WeatherIcon({ kind, size = 18 }: { kind: WeatherKind; size?: number }) {
  switch (kind) {
    case "sun": return <Sun size={size} color="#fbbf24" />;
    case "rain": return <CloudRain size={size} color="#60a5fa" />;
    case "drizzle": return <CloudDrizzle size={size} color="#7dd3fc" />;
    case "snow": return <CloudSnow size={size} color="#e0f2fe" />;
    case "storm": return <CloudLightning size={size} color="#c4b5fd" />;
    case "fog": return <CloudFog size={size} color="#cbd5e1" />;
    default: return <Cloud size={size} color="#cbd5e1" />;
  }
}

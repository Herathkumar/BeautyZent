"use client";

import { useEffect, useState } from "react";

type WeatherState = {
  tempC: number;
  code: number;
  label: string;
};

function placeHint(address?: string | null, timezone?: string | null) {
  if (address) {
    const parts = address
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length >= 2) return parts[parts.length - 2] || parts[0];
    return parts[0] || "Toronto";
  }
  if (timezone) {
    const city = timezone.split("/").pop()?.replace(/_/g, " ");
    if (city) return city;
  }
  return "Toronto";
}

function weatherLabel(code: number) {
  if (code === 0) return "Clear";
  if (code <= 3) return "Partly cloudy";
  if (code <= 48) return "Fog";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Showers";
  if (code <= 99) return "Storm";
  return "Fair";
}

function WeatherGlyph({ code }: { code: number }) {
  if (code === 0) {
    return (
      <svg className="customer-weather__icon" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M5.8 5.8l1.6 1.6M16.6 16.6l1.6 1.6M18.2 5.8l-1.6 1.6M7.4 16.6l-1.6 1.6"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (code <= 3) {
    return (
      <svg className="customer-weather__icon" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="9" cy="9" r="2.6" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M7.5 16.5h9.2a3.1 3.1 0 0 0 .3-6.2 4.4 4.4 0 0 0-8.4 1.1A2.9 2.9 0 0 0 7.5 16.5Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (code <= 67 || (code >= 80 && code <= 82)) {
    return (
      <svg className="customer-weather__icon" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M7.2 14.2h9.4a3 3 0 0 0 .2-6 4.2 4.2 0 0 0-8.1 1A2.8 2.8 0 0 0 7.2 14.2Z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path d="M9 16.5v2.2M12 16.8v2.4M15 16.5v2.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  if (code <= 77) {
    return (
      <svg className="customer-weather__icon" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M7.2 13.5h9.4a3 3 0 0 0 .2-6 4.2 4.2 0 0 0-8.1 1A2.8 2.8 0 0 0 7.2 13.5Z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path d="M9 16.2h0M12 17.2h0M15 16.2h0M10.5 19h0M13.5 19h0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg className="customer-weather__icon" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7.2 14.5h9.4a3 3 0 0 0 .2-6 4.2 4.2 0 0 0-8.1 1A2.8 2.8 0 0 0 7.2 14.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function CustomerWeatherChip({
  address,
  timezone,
}: {
  address?: string | null;
  timezone?: string | null;
}) {
  const [weather, setWeather] = useState<WeatherState | null>(null);

  useEffect(() => {
    let cancelled = false;
    const hint = placeHint(address, timezone);

    async function load() {
      try {
        const geoRes = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(hint)}&count=1&language=en&format=json`
        );
        if (!geoRes.ok) return;
        const geo = (await geoRes.json()) as {
          results?: { latitude: number; longitude: number }[];
        };
        const place = geo.results?.[0];
        if (!place) return;
        const wxRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,weather_code&timezone=${encodeURIComponent(timezone || "auto")}`
        );
        if (!wxRes.ok) return;
        const wx = (await wxRes.json()) as {
          current?: { temperature_2m?: number; weather_code?: number };
        };
        const temp = wx.current?.temperature_2m;
        const code = wx.current?.weather_code ?? 0;
        if (cancelled || typeof temp !== "number") return;
        setWeather({
          tempC: Math.round(temp),
          code,
          label: weatherLabel(code),
        });
      } catch {
        /* board stays clock-only if weather is unreachable */
      }
    }

    void load();
    const timer = window.setInterval(() => void load(), 30 * 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [address, timezone]);

  if (!weather) return null;

  return (
    <div
      className="customer-weather"
      data-testid="customer-weather"
      title={weather.label}
    >
      <WeatherGlyph code={weather.code} />
      <span className="customer-weather__temp">{weather.tempC}°</span>
    </div>
  );
}

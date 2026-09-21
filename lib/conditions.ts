import type { Area, BuoyNow, Conditions, HabNow, MarineAlert, RiverNow, SalinityNow, SargassumNow, WeatherNow } from "@/lib/types";
import { fetchAirPressure, fetchLatest } from "@/lib/noaa";
import { fetchNwsAlerts, fetchNwsForecast, nwsWindAt, nwsWindNow } from "@/lib/nws";
import { fetchOpenMeteo } from "@/lib/openmeteo";
import { fetchUsgsDischarge } from "@/lib/rivers";
import { fetchNdbc } from "@/lib/ndbc";
import { fetchHab } from "@/lib/hab";
import { fetchSargassum } from "@/lib/sargassum";
import { fetchSalinity } from "@/lib/salinity";
import { loadTides } from "@/lib/tides";
import { moonPhase } from "@/lib/moon";
import { cardinalFromDeg, ymdInZone } from "@/lib/time";
import { coerceSky, skyFromWmo, skyPhraseFromWmo } from "@/lib/wx";
import { tideGauge } from "@/lib/data/tide-gauges";
import { usesModeledOcean } from "@/lib/data/areas";

function blankWeather(source: WeatherNow["source"]): WeatherNow {
  return {
    airF: null,
    windMph: null,
    windGustMph: null,
    windDirDeg: null,
    windCardinal: null,
    pressureMb: null,
    pressureTrendMb: null,
    pressureSource: null,
    pressureCite: null,
    precipChance: null,
    precipIn: null,
    sky: null,
    wx: null,
    source,
    fetchedAt: new Date().toISOString(),
  };
}

function mergeSky(primary: WeatherNow, fallback: WeatherNow | null): WeatherNow {
  if (!fallback) return primary;
  return {
    ...primary,
    airF: primary.airF ?? fallback.airF,
    precipChance: primary.precipChance ?? fallback.precipChance,
    precipIn: primary.precipIn ?? fallback.precipIn,
    sky: primary.sky ?? fallback.sky,
    wx: primary.wx ?? fallback.wx,
    pressureMb: primary.pressureMb ?? fallback.pressureMb,
    pressureTrendMb: primary.pressureTrendMb ?? fallback.pressureTrendMb,
    pressureSource: primary.pressureSource ?? fallback.pressureSource,
    pressureCite: primary.pressureCite ?? fallback.pressureCite,
  };
}

function openMeteoAt(
  om: Awaited<ReturnType<typeof fetchOpenMeteo>>,
  at: Date,
): WeatherNow {
  const target = at.getTime();
  let best = 0;
  let bestDelta = Infinity;
  om.hourly.time.forEach((t, i) => {
    const delta = Math.abs(new Date(t).getTime() - target);
    if (delta < bestDelta) {
      best = i;
      bestDelta = delta;
    }
  });
  const useHour = bestDelta < 18 * 3600000;
  const precipChance = useHour ? (om.hourly.precipitation_probability[best] ?? null) : null;
  const precipIn = useHour ? (om.hourly.precipitation[best] ?? null) : (om.current.precipitation ?? null);
  const code = useHour ? om.hourly.weather_code[best] : om.current.weather_code;
  const hourlyP = om.hourly.pressure_msl;
  const pressureMb = useHour ? (hourlyP?.[best] ?? om.current.pressure_msl) : om.current.pressure_msl;
  const earlier = useHour && hourlyP && best >= 3 ? hourlyP[best - 3] : null;
  return {
    airF: useHour ? om.hourly.temperature_2m[best] : om.current.temperature_2m,
    windMph: useHour ? om.hourly.wind_speed_10m[best] : om.current.wind_speed_10m,
    windGustMph: useHour ? om.hourly.wind_gusts_10m[best] : om.current.wind_gusts_10m,
    windDirDeg: useHour ? om.hourly.wind_direction_10m[best] : om.current.wind_direction_10m,
    windCardinal: cardinalFromDeg(
      useHour ? om.hourly.wind_direction_10m[best] : om.current.wind_direction_10m,
    ),
    pressureMb: pressureMb ?? null,
    pressureTrendMb:
      pressureMb != null && earlier != null ? Number((pressureMb - earlier).toFixed(1)) : null,
    pressureSource: pressureMb != null ? "open-meteo" : null,
    pressureCite: pressureMb != null ? "Open-Meteo modeled" : null,
    precipChance,
    precipIn,
    sky: skyPhraseFromWmo(code),
    wx: coerceSky(skyFromWmo(code), precipChance),
    source: "open-meteo",
    fetchedAt: new Date().toISOString(),
  };
}

async function weatherFor(area: Area, at: Date, today: boolean): Promise<WeatherNow> {
  const modeledOcean = usesModeledOcean(area);

  if (today && area.noaaStation) {
    const [noaaWind, nws, om] = await Promise.allSettled([
      fetchLatest(area.noaaStation, "wind"),
      fetchNwsForecast(area.lat, area.lon),
      fetchOpenMeteo(area.lat, area.lon),
    ]);
    const wind = noaaWind.status === "fulfilled" ? noaaWind.value : null;
    const nwsVal = nws.status === "fulfilled" ? nws.value : null;
    const nwsNow = nwsVal ? nwsWindNow(nwsVal.periods) : null;
    const omNow = om.status === "fulfilled" ? openMeteoAt(om.value, at) : null;
    if (wind?.speed != null) {
      return mergeSky(
        {
          airF: nwsNow?.airF ?? null,
          windMph: wind.speed,
          windGustMph: wind.gust,
          windDirDeg: wind.dir,
          windCardinal: cardinalFromDeg(wind.dir),
          pressureMb: null,
          pressureTrendMb: null,
          pressureSource: null,
          pressureCite: null,
          precipChance: nwsNow?.precipChance ?? null,
          precipIn: null,
          sky: nwsNow?.sky ?? null,
          wx: nwsNow?.wx ?? null,
          source: "noaa",
          fetchedAt: new Date().toISOString(),
        },
        omNow,
      );
    }
    if (nwsNow) {
      return mergeSky(
        {
          airF: nwsNow.airF,
          windMph: nwsNow.windMph,
          windGustMph: null,
          windDirDeg: nwsNow.windDirDeg,
          windCardinal: nwsNow.windCardinal,
          pressureMb: null,
          pressureTrendMb: null,
          pressureSource: null,
          pressureCite: null,
          precipChance: nwsNow.precipChance,
          precipIn: null,
          sky: nwsNow.sky,
          wx: nwsNow.wx,
          source: "nws",
          fetchedAt: new Date().toISOString(),
        },
        omNow,
      );
    }
    if (omNow) return omNow;
  }

  if (!modeledOcean && area.noaaStation) {
    const [nws, om] = await Promise.allSettled([
      fetchNwsForecast(area.lat, area.lon),
      fetchOpenMeteo(area.lat, area.lon),
    ]);
    const nwsVal = nws.status === "fulfilled" ? nws.value : null;
    const atHour = nwsVal ? nwsWindAt(nwsVal.periods, at) : null;
    const omNow = om.status === "fulfilled" ? openMeteoAt(om.value, at) : null;
    if (atHour?.windMph != null) {
      return mergeSky(
        {
          airF: atHour.airF,
          windMph: atHour.windMph,
          windGustMph: null,
          windDirDeg: atHour.windDirDeg,
          windCardinal: atHour.windCardinal,
          pressureMb: null,
          pressureTrendMb: null,
          pressureSource: null,
          pressureCite: null,
          precipChance: atHour.precipChance,
          precipIn: null,
          sky: atHour.sky,
          wx: atHour.wx,
          source: "nws",
          fetchedAt: new Date().toISOString(),
        },
        omNow,
      );
    }
    if (omNow) return omNow;
  }

  try {
    const om = await fetchOpenMeteo(area.lat, area.lon);
    return openMeteoAt(om, at);
  } catch {
    return blankWeather(modeledOcean ? "open-meteo" : "nws");
  }
}

function attachPressure(
  weather: WeatherNow,
  opts: {
    buoy: BuoyNow | null;
    air: Awaited<ReturnType<typeof fetchAirPressure>>;
    station: string | null;
  },
): WeatherNow {
  if (opts.air?.mb != null) {
    const gauge = tideGauge(opts.station);
    return {
      ...weather,
      pressureMb: opts.air.mb,
      pressureTrendMb: opts.air.trendMb,
      pressureSource: "noaa",
      pressureCite: gauge ? `NOAA ${gauge.id} · ${gauge.name}` : `NOAA ${opts.station}`,
    };
  }
  if (opts.buoy?.pressureMb != null) {
    return {
      ...weather,
      pressureMb: opts.buoy.pressureMb,
      pressureTrendMb: opts.buoy.pressureTrendMb,
      pressureSource: "ndbc",
      pressureCite: `NDBC ${opts.buoy.id}`,
    };
  }
  return weather;
}

function nwsCovers(area: Area) {
  return (
    area.theater === "texas" ||
    area.theater === "louisiana" ||
    area.theater === "florida" ||
    area.theater === "puerto-rico" ||
    area.theater === "north-carolina" ||
    area.theater === "south-carolina"
  );
}

export async function loadConditions(area: Area, at = new Date()): Promise<Conditions> {
  const today = ymdInZone(at, area.timezone) === ymdInZone(new Date(), area.timezone);
  const tempStation = area.noaaTempStation ?? area.noaaStation;
  const [tides, weatherRaw, wt, river, alerts, buoy, hab, sargassum, salinity, air] = await Promise.all([
    loadTides(area, at, { observe: today }),
    weatherFor(area, at, today),
    today && tempStation ? fetchLatest(tempStation, "water_temperature") : Promise.resolve(null),
    fetchUsgsDischarge(area.id).catch(() => null as RiverNow | null),
    nwsCovers(area) ? fetchNwsAlerts(area.lat, area.lon).catch(() => [] as MarineAlert[]) : Promise.resolve([] as MarineAlert[]),
    today ? fetchNdbc(area.id).catch(() => null as BuoyNow | null) : Promise.resolve(null as BuoyNow | null),
    today ? fetchHab(area).catch(() => null as HabNow | null) : Promise.resolve(null as HabNow | null),
    today ? fetchSargassum(area).catch(() => null as SargassumNow | null) : Promise.resolve(null as SargassumNow | null),
    today ? fetchSalinity(area.id).catch(() => null as SalinityNow | null) : Promise.resolve(null as SalinityNow | null),
    today && area.noaaStation
      ? fetchAirPressure(area.noaaStation, at).catch(() => null)
      : Promise.resolve(null),
  ]);
  const weather = attachPressure(weatherRaw, { buoy, air, station: area.noaaStation });
  let waterTempF: number | null = null;
  let waterTempSource: string | null = null;
  if (wt?.value != null && tempStation) {
    waterTempF = wt.value;
    waterTempSource = `NOAA ${tempStation}`;
  }
  return {
    areaId: area.id,
    waterTempF,
    waterTempSource,
    tides,
    weather,
    moon: moonPhase(at),
    river,
    buoy,
    hab,
    sargassum,
    salinity,
    alerts,
  };
}

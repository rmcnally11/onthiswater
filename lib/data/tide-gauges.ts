/** NOAA CO-OPS water-level / tide-prediction stations. Not NDBC weather buoys. */

export type TideGauge = {
  id: string;
  name: string;
  href: string;
};

const NAMES: Record<string, string> = {
  "8770822": "Texas Point, Sabine Pass",
  "8771450": "Galveston Pier 21",
  "8773701": "Port O'Connor",
  "8774770": "Rockport",
  "8775792": "Packery Channel",
  "8776604": "Baffin Bay",
  "8779770": "Port Isabel",
  "8760721": "Pilottown",
  "8761724": "Grand Isle",
  "8768094": "Calcasieu Pass",
  "8723214": "Virginia Key",
  "8723689": "Point Charles, Key Largo",
  "8723970": "Vaca Key, Florida Bay",
  "8724580": "Key West",
  "8725577": "Port Boca Grande, Charlotte Harbor",
  "8722670": "Lake Worth Pier",
  "9755371": "San Juan, La Puntilla",
  "9752621": "Isabel Segunda, Vieques",
  "9759110": "Magueyes Island",
  "8654467": "USCG Station Hatteras",
  "8656483": "Beaufort, Duke Marine Lab",
  "8658163": "Wrightsville Beach",
  "8665530": "Charleston, Cooper River Entrance",
  "8670870": "Fort Pulaski, Savannah River",
  "8661070": "Springmaid Pier, Myrtle Beach",
};

export function tideGauge(station: string | null | undefined): TideGauge | null {
  if (!station) return null;
  return {
    id: station,
    name: NAMES[station] ?? `station ${station}`,
    href: `https://tidesandcurrents.noaa.gov/stationhome.html?id=${encodeURIComponent(station)}`,
  };
}

#!/usr/bin/env python3
"""Predict a short tide window with pyTMD and GOT4.10c.

Scout only. The site build, the cron, and the public pages do not run this.

GOT4.10c is the ocean-tide grid set Richard Ray published from NASA GSFC
(July 2014). The tar is a direct file on
https://earth.gsfc.nasa.gov/geo/data/ocean-tide-models — no account and no
paywall. pyTMD itself is MIT. The grids are a US Government work. Ray's
README forbids coastal navigation and any use that risks life or property.
This script writes a comparison file. It does not drive the live tide clock.

Expects one JSON object on stdin:

    {
      "start": "2026-11-15T02:00:00Z",
      "hours": 48,
      "modelDir": "/tmp/pytmd-models",
      "modelTar": "/tmp/pytmd-models/got4.10c.tar.gz",
      "desks": [{"id": "galveston", "lat": 29.31, "lon": -94.7933}]
    }

Prints one JSON object on stdout. The model directory must already contain
the extracted GOT4.10c tree (GOT4.10c/grids_oceantide_netcdf/*.nc).
"""

from __future__ import annotations

import datetime as dt
import hashlib
import importlib.metadata as metadata
import json
import sys
import time
import warnings
from pathlib import Path

warnings.filterwarnings("ignore")

_IMPORT_STARTED = time.perf_counter()

import numpy as np
import pyTMD.compute
import xarray as xr

IMPORT_SECONDS = time.perf_counter() - _IMPORT_STARTED

METERS_TO_FEET = 3.280839895013123
MODEL_ID = "GOT4.10_nc"
CONSTITUENTS = ("q1", "o1", "p1", "k1", "n2", "m2", "s2", "k2", "s1", "m4")
EXTRAPOLATE_KM = 50.0


def fail(message: str) -> None:
    print(message, file=sys.stderr)
    raise SystemExit(1)


def sha256_file(path: Path) -> str | None:
    if not path.is_file():
        return None
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def to_iso(seconds: float) -> str:
    instant = dt.datetime.fromtimestamp(seconds, dt.timezone.utc).replace(microsecond=0)
    return instant.strftime("%Y-%m-%dT%H:%M:%SZ")


def haversine_km(lat1: float, lon1: float, lat2: np.ndarray, lon2: np.ndarray) -> np.ndarray:
    la1 = np.radians(lat1)
    lo1 = np.radians(lon1)
    la2 = np.radians(lat2)
    lo2 = np.radians(lon2)
    dlat = la2 - la1
    dlon = lo2 - lo1
    a = np.sin(dlat / 2) ** 2 + np.cos(la1) * np.cos(la2) * np.sin(dlon / 2) ** 2
    return 2 * 6371.0 * np.arcsin(np.sqrt(np.clip(a, 0, 1)))


def wrap180(lon: np.ndarray) -> np.ndarray:
    return ((lon + 180.0) % 360.0) - 180.0


def load_grids(model_dir: Path) -> dict[str, xr.Dataset]:
    folder = model_dir / "GOT4.10c" / "grids_oceantide_netcdf"
    if not folder.is_dir():
        fail(f"GOT4.10c netCDF grids not found at {folder}")
    grids: dict[str, xr.Dataset] = {}
    for name in CONSTITUENTS:
        path = folder / f"{name}.nc"
        if not path.is_file():
            fail(f"Missing constituent grid {path}")
        grids[name] = xr.open_dataset(path)
    return grids


def nearest_wet(grids: dict[str, xr.Dataset], lat: float, lon: float) -> dict[str, object]:
    sample = grids["m2"]
    latitudes = sample.latitude.values
    longitudes = sample.longitude.values
    amplitude = sample.amplitude.values
    wet = np.isfinite(amplitude) & (amplitude > 0)
    wet_i, wet_j = np.where(wet)
    wet_lat = latitudes[wet_i]
    wet_lon = wrap180(longitudes[wet_j])
    distance = haversine_km(lat, lon, wet_lat, wet_lon)
    pick = int(np.argmin(distance))
    cell_i = int(np.argmin(np.abs(latitudes - lat)))
    cell_j = int(np.argmin(np.abs(wrap180(longitudes) - lon)))
    cell_amp = amplitude[cell_i, cell_j]
    constituents: dict[str, dict[str, float]] = {}
    for name, grid in grids.items():
        amp = float(grid.amplitude.values[wet_i[pick], wet_j[pick]])
        phase = float(grid.phase.values[wet_i[pick], wet_j[pick]])
        constituents[name] = {"ampCm": round(amp, 2), "phaseDeg": round(phase, 2)}
    return {
        "gridDegrees": 0.5,
        "pointCellMasked": not bool(np.isfinite(cell_amp) and cell_amp > 0),
        "nearestWet": {
            "lat": round(float(wet_lat[pick]), 2),
            "lon": round(float(wet_lon[pick]), 2),
            "km": round(float(distance[pick]), 1),
            "m2AmpCm": constituents["m2"]["ampCm"],
        },
        "constituentsCm": constituents,
    }


def predict(lon: float, lat: float, times: np.ndarray, model_dir: Path, extrapolate: bool) -> np.ndarray:
    series = pyTMD.compute.tide_elevations(
        np.array([lon]),
        np.array([lat]),
        times,
        directory=str(model_dir),
        model=MODEL_ID,
        type="time series",
        standard="datetime",
        method="linear",
        extrapolate=extrapolate,
        cutoff=EXTRAPOLATE_KM,
        crop=True,
        bounds=[lon - 3, lon + 3, lat - 3, lat + 3],
    )
    return np.asarray(series).astype(float).ravel()


def extrema(times: np.ndarray, meters: np.ndarray, window_start: np.datetime64, window_end: np.datetime64) -> list[dict[str, object]]:
    seconds = times.astype("datetime64[s]").astype(np.int64).astype(float)
    step = float(seconds[1] - seconds[0])
    found: list[dict[str, object]] = []
    for index in range(1, len(meters) - 1):
        previous = float(meters[index - 1])
        current = float(meters[index])
        nxt = float(meters[index + 1])
        if not (np.isfinite(previous) and np.isfinite(current) and np.isfinite(nxt)):
            continue
        kind: str | None = None
        if current >= previous and current > nxt:
            kind = "H"
        elif current <= previous and current < nxt:
            kind = "L"
        if kind is None:
            continue
        # Parabola through the three samples. Shift is in steps of the series.
        a = 0.5 * (previous + nxt) - current
        b = 0.5 * (nxt - previous)
        shift = 0.0 if abs(a) < 1e-12 else max(-0.5, min(0.5, -b / (2 * a)))
        height_m = current + b * shift + a * shift * shift
        instant = np.datetime64(int(seconds[index] + shift * step), "s")
        if instant < window_start or instant >= window_end:
            continue
        found.append(
            {
                "time": to_iso(float(seconds[index] + shift * step)),
                "type": kind,
                "heightM": round(float(height_m), 4),
                "heightFt": round(float(height_m) * METERS_TO_FEET, 3),
            }
        )
    return found


def main() -> None:
    payload = json.load(sys.stdin)
    model_dir = Path(payload["modelDir"])
    if not model_dir.is_dir():
        fail(f"Model directory does not exist: {model_dir}")
    start = np.datetime64(str(payload["start"]).replace("Z", ""))
    hours = int(payload["hours"])
    window_end = start + np.timedelta64(hours, "h")
    times = np.arange(start - np.timedelta64(6, "h"), window_end + np.timedelta64(6, "h"), np.timedelta64(6, "m"))

    grids = load_grids(model_dir)
    desks_out = []
    predict_started = time.perf_counter()
    for desk in payload["desks"]:
        lat = float(desk["lat"])
        lon = float(desk["lon"])
        mask = nearest_wet(grids, lat, lon)
        direct = predict(lon, lat, times, model_dir, extrapolate=False)
        used = direct
        extrapolated = False
        if not np.isfinite(direct).any():
            used = predict(lon, lat, times, model_dir, extrapolate=True)
            extrapolated = True
        if not np.isfinite(used).any():
            fail(f"{desk['id']} is still masked after a {EXTRAPOLATE_KM:.0f} km extrapolation")
        events = extrema(times, used, start, window_end)
        finite = used[np.isfinite(used)]
        desks_out.append(
            {
                "id": desk["id"],
                "lat": lat,
                "lon": lon,
                "extrapolated": extrapolated,
                "extrapolateCutoffKm": EXTRAPOLATE_KM if extrapolated else 0,
                "grid": mask,
                "seriesMeters": {
                    "samples": int(np.isfinite(used).sum()),
                    "min": round(float(np.min(finite)), 4),
                    "max": round(float(np.max(finite)), 4),
                },
                "hilo": events,
            }
        )
    predict_seconds = time.perf_counter() - predict_started
    for grid in grids.values():
        grid.close()

    tar_path = Path(payload["modelTar"]) if payload.get("modelTar") else None
    print(
        json.dumps(
            {
                "pyTmdVersion": metadata.version("pyTMD"),
                "model": MODEL_ID,
                "modelName": "GOT4.10c",
                "importSeconds": round(IMPORT_SECONDS, 3),
                "predictSeconds": round(predict_seconds, 3),
                "modelTarSha256": sha256_file(tar_path) if tar_path else None,
                "desks": desks_out,
            }
        )
    )


if __name__ == "__main__":
    main()

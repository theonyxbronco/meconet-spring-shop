"use client";

/**
 * Real slippy map of the capital region, drawn with Leaflet over OpenStreetMap tiles.
 *
 * OSM because it is the one good raster source that needs no API key — the pale
 * vendor basemaps (CARTO Positron, Stadia) all now gate behind one, and a prototype
 * that dies when a key expires is worse than a slightly louder basemap. The tiles
 * are desaturated in CSS (see `.leaflet-tile-pane` in globals) to bring them back
 * towards the brand, which is also what Positron was buying us. Note that OSM's own
 * tile servers are for modest traffic; a production build would want a paid source.
 *
 * Leaflet touches `window` the moment it is imported, so this module must only ever
 * be reached through the `ssr: false` dynamic import in LocalStockOverlay.
 */

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { NearbyWorkshop } from "@/data/workshops";
import { DEMO_LOCATION, formatDistance } from "@/data/workshops";

const TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/** Keeps the pins clear of the attribution strip and the map's own rounded corners. */
const FIT_PADDING: [number, number] = [46, 46];

function pinIcon(index: number, selected: boolean) {
  return L.divIcon({
    className: "", // Leaflet's default adds a white box we do not want.
    html: `
      <div class="meconet-pin${selected ? " meconet-pin--on" : ""}">
        <svg viewBox="-9 -23 18 24" width="100%" height="100%" aria-hidden="true">
          <path d="M0 0 C-1.6 -3.6 -7 -7.6 -7 -12.6 A7 7 0 1 1 7 -12.6 C7 -7.6 1.6 -3.6 0 0 Z"
                fill="currentColor" stroke="#ffffff" stroke-width="1.3" />
          <text x="0" y="-10" text-anchor="middle" font-size="8.4" font-weight="800"
                fill="#ffffff" font-family="inherit">${index + 1}</text>
        </svg>
      </div>`,
    iconSize: selected ? [34, 45] : [26, 35],
    // Anchored at the teardrop's tip so the pin points at the actual address.
    iconAnchor: selected ? [17, 45] : [13, 35],
  });
}

const homeIcon = L.divIcon({
  className: "",
  html: `<div class="meconet-home"><span></span></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

export function RegionMap({
  stops,
  selectedId,
  onSelect,
  className = "",
}: {
  stops: NearbyWorkshop[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  className?: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markers = useRef<Map<string, L.Marker>>(new Map());
  /**
   * The selection also arrives from the list beside the map, so the handler has to
   * read whatever `onSelect` is current rather than the one captured when the
   * marker was built — otherwise a click fires a stale closure.
   */
  const select = useRef(onSelect);
  select.current = onSelect;

  useEffect(() => {
    if (!host.current || map.current) return;

    const instance = L.map(host.current, {
      zoomControl: true,
      scrollWheelZoom: true,
      attributionControl: true,
    });
    L.tileLayer(TILES, { attribution: ATTRIBUTION, maxZoom: 19 }).addTo(instance);

    L.marker([DEMO_LOCATION.lat, DEMO_LOCATION.lon], {
      icon: homeIcon,
      interactive: false,
      keyboard: false,
    })
      .addTo(instance)
      .bindTooltip("You are here", { direction: "bottom", offset: [0, 10] });

    stops.forEach((stop, index) => {
      const marker = L.marker([stop.lat, stop.lon], {
        icon: pinIcon(index, false),
        title: stop.name,
        alt: `${stop.name}, ${stop.district}, ${formatDistance(stop.distanceKm)} away`,
        riseOnHover: true,
      })
        .addTo(instance)
        .bindTooltip(`${stop.name} · ${formatDistance(stop.distanceKm)}`, {
          direction: "top",
          offset: [0, -30],
        })
        .on("click", () => select.current(stop.id));
      markers.current.set(stop.id, marker);
    });

    const bounds = L.latLngBounds([
      [DEMO_LOCATION.lat, DEMO_LOCATION.lon],
      ...stops.map((stop) => [stop.lat, stop.lon] as [number, number]),
    ]);
    instance.fitBounds(bounds, { padding: FIT_PADDING });

    map.current = instance;

    return () => {
      instance.remove();
      map.current = null;
      markers.current.clear();
    };
    // Built once. The stop list for a given kit does not change while the map is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * The map is opened inside a dialog that animates in, so Leaflet measures the
   * container before it has settled at its final size and leaves grey gutters.
   * Re-measuring once the transition is done is the documented fix.
   */
  useEffect(() => {
    const timer = setTimeout(() => map.current?.invalidateSize(), 320);
    return () => clearTimeout(timer);
  }, []);

  // Selection is owned by the overlay, so the markers follow it rather than lead it.
  useEffect(() => {
    stops.forEach((stop, index) => {
      const marker = markers.current.get(stop.id);
      const selected = stop.id === selectedId;
      marker?.setIcon(pinIcon(index, selected));
      marker?.setZIndexOffset(selected ? 1000 : 0);
    });

    const stop = stops.find((candidate) => candidate.id === selectedId);
    if (stop && map.current) {
      // Nudge rather than recentre: yanking the viewport across the city on every
      // list click costs more orientation than it buys.
      map.current.panInside(L.latLng(stop.lat, stop.lon), { padding: [60, 60] });
    }
  }, [selectedId, stops]);

  return <div ref={host} className={`h-full w-full ${className}`} aria-label="Map of workshops stocking this kit" />;
}

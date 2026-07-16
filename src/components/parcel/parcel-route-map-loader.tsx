"use client";

import dynamic from "next/dynamic";
import { LoaderCircle } from "lucide-react";
import type { ComponentProps } from "react";
import type { ParcelRouteMap } from "./parcel-route-map";

const Map = dynamic(
  () => import("./parcel-route-map").then((module) => module.ParcelRouteMap),
  {
    ssr: false,
    loading: () => (
      <div className="parcel-map-loading">
        <LoaderCircle /> Loading OpenStreetMap…
      </div>
    ),
  },
);

export function ParcelRouteMapLoader(
  props: ComponentProps<typeof ParcelRouteMap>,
) {
  return <Map {...props} />;
}

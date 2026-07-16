"use client";

import dynamic from "next/dynamic";
import { LoaderCircle } from "lucide-react";
import type { ComponentProps } from "react";
import type { LiveRouteMap } from "./live-route-map";

const Map = dynamic(
  () => import("./live-route-map").then((module) => module.LiveRouteMap),
  {
    ssr: false,
    loading: () => (
      <div className="live-route-map-loading">
        <LoaderCircle /> Loading OpenStreetMap…
      </div>
    ),
  },
);

export function LiveRouteMapLoader(props: ComponentProps<typeof LiveRouteMap>) {
  return <Map {...props} />;
}

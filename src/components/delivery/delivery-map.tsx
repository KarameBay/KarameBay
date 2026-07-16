"use client";
import { useEffect, useMemo } from "react";
import L from "leaflet";
import { MapContainer, Marker, Polyline, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { Coordinates } from "@/lib/delivery";

type Props={store:Coordinates;customer:Coordinates;route:[number,number][];onChange:(location:Coordinates)=>void};
const customerIcon=L.divIcon({className:"delivery-pin-wrap",html:'<div class="delivery-pin customer"><span></span></div>',iconSize:[38,48],iconAnchor:[19,45]});
const storeIcon=L.divIcon({className:"delivery-pin-wrap",html:'<div class="delivery-pin store"><span>KB</span></div>',iconSize:[38,48],iconAnchor:[19,45]});

function ClickHandler({onChange}:{onChange:Props["onChange"]}){useMapEvents({click(event){onChange({latitude:event.latlng.lat,longitude:event.latlng.lng})}});return null}
function Recenter({customer}:{customer:Coordinates}){const map=useMap();useEffect(()=>{map.panTo([customer.latitude,customer.longitude])},[map,customer]);return null}

export function DeliveryMap({store,customer,route,onChange}:Props){
 const bounds=useMemo(()=>L.latLngBounds([[store.latitude,store.longitude],[customer.latitude,customer.longitude]]).pad(.25),[store,customer]);
 return <MapContainer bounds={bounds} scrollWheelZoom zoomControl attributionControl className="delivery-map"><TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/><Marker position={[store.latitude,store.longitude]} icon={storeIcon}/><Marker position={[customer.latitude,customer.longitude]} icon={customerIcon} draggable eventHandlers={{dragend(event){const point=event.target.getLatLng();onChange({latitude:point.lat,longitude:point.lng})}}}/>{route.length>1&&<Polyline positions={route} pathOptions={{color:"#b7791f",weight:5,opacity:.85}}/>}<ClickHandler onChange={onChange}/><Recenter customer={customer}/></MapContainer>
}

"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bike,
  Check,
  Clock3,
  LocateFixed,
  MapPin,
  Navigation,
  RefreshCw,
  Route,
  Search,
} from "lucide-react";
import { useCart } from "@/components/cart/cart-provider";
import {
  Coordinates,
  DELIVERY_ADDRESS_MODE_KEY,
  DELIVERY_ADDRESS_KEY,
  DELIVERY_DETAILS_KEY,
  DELIVERY_LOCATION_KEY,
  DELIVERY_QUOTE_KEY,
  RouteQuote,
  isWithinKigali,
} from "@/lib/delivery";
import { formatRwf } from "@/lib/money";

const DeliveryMap = dynamic(
  () => import("./delivery-map").then((module) => module.DeliveryMap),
  {
    ssr: false,
    loading: () => (
      <div className="delivery-map-loading">
        <RefreshCw /> Loading OpenStreetMap…
      </div>
    ),
  },
);
const KIGALI_CENTRE: Coordinates = { latitude: -1.9706, longitude: 30.1044 };
type StoreLocation = Coordinates & { id: string; name: string };
type SearchResult = {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  type: string;
};
type SavedAddress = {
  id: string;
  label: string;
  address: string;
  details: string;
  latitude: number;
  longitude: number;
};

export function DeliveryLocationPage() {
  const cart = useCart();
  const router = useRouter();
  const [customer, setCustomer] = useState<Coordinates>(KIGALI_CENTRE);
  const [store, setStore] = useState<StoreLocation | null>(null);
  const [quote, setQuote] = useState<RouteQuote | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [routing, setRouting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedAddress, setSelectedAddress] = useState("");
  const [deliveryDetails, setDeliveryDetails] = useState("");
  const [addressMode, setAddressMode] = useState<"temporary" | "save">(
    "temporary",
  );
  const [addressLabel, setAddressLabel] = useState("Home");
  const [mapType, setMapType] = useState<"normal" | "satellite">("normal");
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const initialised = useRef(false);
  const gpsAttempted = useRef(false);

  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;
    try {
      const saved = JSON.parse(
        localStorage.getItem(DELIVERY_LOCATION_KEY) ?? "null",
      );
      const savedDetails = localStorage.getItem(DELIVERY_DETAILS_KEY) ?? "";
      queueMicrotask(() => {
        if (isWithinKigali(saved)) setCustomer(saved);
        if (savedDetails) setDeliveryDetails(savedDetails);
      });
    } catch {}
  }, []);
  useEffect(() => {
    const storeId = cart.items[0]?.storeId;
    if (!cart.hydrated || !storeId) return;
    fetch(`/api/stores/${storeId}/location`)
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => setStore(data.store))
      .catch(() => setError("We could not load the store location."));
  }, [cart.hydrated, cart.items]);
  useEffect(() => {
    fetch("/api/addresses")
      .then((response) => response.json())
      .then((data) => setSavedAddresses(data.addresses ?? []))
      .catch(() => setSavedAddresses([]));
  }, []);

  const updateLocation = useCallback((location: Coordinates, address = "") => {
    setCustomer(location);
    setSelectedAddress(address);
    setConfirmed(false);
    setQuote(null);
    setError("");
    localStorage.removeItem(DELIVERY_QUOTE_KEY);
  }, []);
  const handleMapChange = useCallback((location: Coordinates) => {
    if (!isWithinKigali(location)) {
      setError("That pin is outside Kigali. Move it back inside the Kigali delivery area.");
      return;
    }
    updateLocation(location);
  }, [updateLocation]);
  const locate = useCallback(
    (automatic = false) => {
      if (!navigator.geolocation) {
        if (!automatic) setError("GPS is not supported by this device.");
        return;
      }
      setLocating(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const next = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          if (!isWithinKigali(next)) {
            setError("Karame Bay currently delivers in Kigali only. Search for a Kigali address.");
          } else updateLocation(next);
          setLocating(false);
        },
        () => {
          if (!automatic)
            setError(
              "Location access was denied. Search for an address or move the pin manually.",
            );
          setLocating(false);
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 20_000 },
      );
    },
    [updateLocation],
  );
  useEffect(() => {
    if (!cart.hydrated || !cart.items.length || gpsAttempted.current) return;
    gpsAttempted.current = true;
    queueMicrotask(() => locate(true));
  }, [cart.hydrated, cart.items.length, locate]);

  async function searchLocation(event: FormEvent) {
    event.preventDefault();
    if (search.trim().length < 3) return;
    setSearching(true);
    setError("");
    setResults([]);
    try {
      const response = await fetch(
        `/api/geocoding/search?q=${encodeURIComponent(search.trim())}`,
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setResults(data.results);
      if (!data.results.length)
        setError("No matching Kigali address was found. Try a nearby landmark or street.");
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Location search failed.",
      );
    } finally {
      setSearching(false);
    }
  }
  function chooseResult(result: SearchResult) {
    if (!isWithinKigali(result)) {
      setError("That place is outside Kigali. Choose a Kigali address.");
      return;
    }
    updateLocation(
      { latitude: result.latitude, longitude: result.longitude },
      result.label,
    );
    setSearch(result.label);
    setResults([]);
  }
  function chooseSavedAddress(address: SavedAddress) {
    if (!isWithinKigali(address)) {
      setError("This saved address is outside Kigali and cannot be used for delivery.");
      return;
    }
    updateLocation(
      { latitude: address.latitude, longitude: address.longitude },
      address.address,
    );
    setDeliveryDetails(address.details);
    setAddressLabel(address.label);
    setSearch(address.address);
  }
  function changeDeliveryDetails(value: string) {
    setDeliveryDetails(value);
    setConfirmed(false);
    setQuote(null);
    localStorage.setItem(DELIVERY_DETAILS_KEY, value);
    localStorage.removeItem(DELIVERY_QUOTE_KEY);
  }
  function changeAddressMode(mode: "temporary" | "save") {
    setAddressMode(mode);
    setConfirmed(false);
    setQuote(null);
    localStorage.removeItem(DELIVERY_QUOTE_KEY);
  }
  async function confirmLocation() {
    if (!isWithinKigali(customer)) {
      setError("Karame Bay currently delivers in Kigali only. Choose a Kigali pin.");
      return;
    }
    if (deliveryDetails.trim().length < 3) {
      setError("Add your exact delivery details before confirming the pin.");
      return;
    }
    setConfirming(true);
    setError("");
    let address = selectedAddress;
    try {
      if (!address) {
        const params = new URLSearchParams({
          lat: String(customer.latitude),
          lon: String(customer.longitude),
        });
        const response = await fetch(`/api/geocoding/reverse?${params}`);
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        address = data.address || "Pinned location, Kigali";
      }
      const completeAddress = `${deliveryDetails.trim()}, ${address}`;
      if (addressMode === "save") {
        const response = await fetch("/api/addresses", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            label: addressLabel,
            address,
            details: deliveryDetails.trim(),
            latitude: customer.latitude,
            longitude: customer.longitude,
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setSavedAddresses((current) => [
          data.address,
          ...current.filter((item) => item.label !== data.address.label),
        ]);
      }
      localStorage.setItem(DELIVERY_LOCATION_KEY, JSON.stringify(customer));
      localStorage.setItem(DELIVERY_DETAILS_KEY, deliveryDetails.trim());
      localStorage.setItem(DELIVERY_ADDRESS_KEY, completeAddress);
      localStorage.setItem(DELIVERY_ADDRESS_MODE_KEY, addressMode);
      setSelectedAddress(address);
      setConfirmed(true);
    } catch (reason) {
      if (addressMode === "save") {
        setError(
          reason instanceof Error
            ? reason.message
            : "Sign in or choose temporary use.",
        );
        setConfirming(false);
        return;
      }
      localStorage.setItem(DELIVERY_LOCATION_KEY, JSON.stringify(customer));
      localStorage.setItem(DELIVERY_DETAILS_KEY, deliveryDetails.trim());
      localStorage.setItem(
        DELIVERY_ADDRESS_KEY,
        `${deliveryDetails.trim()}, Pinned location, Kigali`,
      );
      localStorage.setItem(DELIVERY_ADDRESS_MODE_KEY, "temporary");
      setConfirmed(true);
    } finally {
      setConfirming(false);
    }
  }

  useEffect(() => {
    if (!store || !confirmed) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setRouting(true);
      setError("");
      const query = new URLSearchParams({
        storeId: store.id,
        customerLat: String(customer.latitude),
        customerLng: String(customer.longitude),
      });
      try {
        const response = await fetch(`/api/routing?${query}`, {
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setQuote(data);
        localStorage.setItem(
          DELIVERY_QUOTE_KEY,
          JSON.stringify({
            storeId: store.id,
            latitude: customer.latitude,
            longitude: customer.longitude,
            distanceKm: data.distanceKm,
            durationMinutes: data.durationMinutes,
            deliveryFeeRwf: data.deliveryFeeRwf,
            savedAt: Date.now(),
          }),
        );
      } catch (reason) {
        if (!controller.signal.aborted) {
          setQuote(null);
          setError(
            reason instanceof Error
              ? reason.message
              : "Route calculation failed.",
          );
        }
      } finally {
        if (!controller.signal.aborted) setRouting(false);
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [store, customer, confirmed]);

  if (!cart.hydrated)
    return <div className="delivery-loading">Loading checkout…</div>;
  if (!cart.items.length)
    return (
      <main className="delivery-empty">
        <MapPin />
        <h1>Add something before choosing delivery</h1>
        <p>Your cart is empty, so there is no store route to calculate.</p>
        <Link href="/stores">Browse stores</Link>
      </main>
    );
  return (
    <main className="delivery-page">
      <Link className="delivery-back" href="/cart">
        <ArrowLeft /> Back to cart
      </Link>
      <div className="delivery-title">
        <span className="catalog-kicker">KIGALI DELIVERY</span>
        <h1>Choose your delivery location</h1>
        <p>Search an address, use your current location, or move the pin. We deliver in Kigali only.</p>
      </div>
      <div className="delivery-layout">
        <section className="delivery-map-card">
          <header>
            <div>
              <MapPin />
              <span>
                <small>DELIVERY AREA</small>
                <b>Kigali, Rwanda</b>
                <small className="delivery-from-store">From {store?.name ?? cart.items[0].storeName}</small>
              </span>
            </div>
            <button onClick={() => locate(false)} disabled={locating}>
              {locating ? <RefreshCw className="spin" /> : <LocateFixed />}
              {locating ? "Finding you…" : "Use my location"}
            </button>
          </header>
          <div className="location-search-wrap">
            <div className="location-helper-row">
              <span>Where should we deliver?</span>
              <small>Choose a saved place or search below</small>
            </div>
            {savedAddresses.length > 0 && (
              <div className="saved-address-picker">
                <span>Saved addresses</span>
                <div>
                  {savedAddresses.map((address) => (
                    <button
                      type="button"
                      key={address.id}
                      onClick={() => chooseSavedAddress(address)}
                    >
                      <MapPin />
                      <span>
                        <b>{address.label}</b>
                        <small>{address.details}</small>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <form className="location-search" onSubmit={searchLocation}>
              <Search />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Enter an area, street, landmark or address"
              />
              <button disabled={searching || search.trim().length < 3}>
                {searching ? "Searching…" : "Find"}
              </button>
            </form>
            {results.length > 0 && (
              <div className="location-results">
                {results.map((result) => (
                  <button key={result.id} onClick={() => chooseResult(result)}>
                    <MapPin />
                    <span>
                      <b>{result.label.split(",")[0]}</b>
                      <small>{result.label}</small>
                    </span>
                  </button>
                ))}
              </div>
            )}
            <label className="delivery-details-field">
              <span>Help your rider find you</span>
              <textarea
                value={deliveryDetails}
                onChange={(event) => changeDeliveryDetails(event.target.value)}
                maxLength={180}
                placeholder="House number, gate, sector or nearby landmark"
              />
              <small>{deliveryDetails.length}/180</small>
            </label>
            <div className="address-use-choice">
              <span>Save this place</span>
              <div>
                <button
                  type="button"
                  className={addressMode === "temporary" ? "active" : ""}
                  onClick={() => changeAddressMode("temporary")}
                >
                  This order
                </button>
                <button
                  type="button"
                  className={addressMode === "save" ? "active" : ""}
                  onClick={() => changeAddressMode("save")}
                >
                  Save address
                </button>
              </div>
              {addressMode === "save" && (
                <label>
                  Address label
                  <input
                    value={addressLabel}
                    onChange={(event) => setAddressLabel(event.target.value)}
                    maxLength={30}
                    placeholder="Home, Work or Other"
                  />
                </label>
              )}
            </div>
            <div className="map-type-picker" aria-label="Map type">
              <span>Map view</span>
              <div>
                <button type="button" className={mapType === "normal" ? "active" : ""} onClick={() => setMapType("normal")}>Normal</button>
                <button type="button" className={mapType === "satellite" ? "active" : ""} onClick={() => setMapType("satellite")}>Satellite</button>
              </div>
            </div>
          </div>
          <div className="delivery-map-shell">
            {store ? (
              <DeliveryMap
                store={store}
                customer={customer}
                route={quote?.route ?? []}
                onChange={handleMapChange}
                mapType={mapType}
              />
            ) : (
              <div className="delivery-map-loading">
                <RefreshCw className="spin" /> Loading store…
              </div>
            )}
            <div className="drag-hint">
              <Navigation /> Move the pin to your exact spot
            </div>
          </div>
          <footer>
            <span>
              <small>SELECTED COORDINATES</small>
              <b>
                {customer.latitude.toFixed(6)}, {customer.longitude.toFixed(6)}
              </b>
            </span>
            <button
              className={confirmed ? "confirmed" : ""}
              onClick={confirmLocation}
              disabled={
                confirming ||
                confirmed ||
                deliveryDetails.trim().length < 3 ||
                (addressMode === "save" && addressLabel.trim().length < 2)
              }
            >
              {confirmed ? (
                <>
                  <Check /> Location confirmed
                </>
              ) : deliveryDetails.trim().length < 3 ? (
                "Add delivery details"
              ) : confirming ? (
                "Confirming…"
              ) : (
                <>
                  <MapPin /> Confirm this location
                </>
              )}
            </button>
          </footer>
        </section>
        <aside className="delivery-summary">
          <h2>Delivery summary</h2>
          <div className="delivery-metric">
            <span>
              <Route />
            </span>
            <div>
              <small>DRIVING DISTANCE</small>
              <b>
                {!confirmed
                  ? "Confirm location"
                  : routing
                    ? "Calculating…"
                    : quote
                      ? `${quote.distanceKm.toFixed(1)} km`
                      : "—"}
              </b>
            </div>
          </div>
          <div className="delivery-metric">
            <span>
              <Clock3 />
            </span>
            <div>
              <small>ESTIMATED TIME</small>
              <b>
                {!confirmed
                  ? "Confirm location"
                  : routing
                    ? "Calculating…"
                    : quote
                      ? `${quote.durationMinutes} min`
                      : "—"}
              </b>
            </div>
          </div>
          <div className="delivery-costs">
            <div>
              <span>Items subtotal</span>
              <b>{formatRwf(cart.itemsSubtotal)}</b>
            </div>
            <div>
              <span>Delivery fee</span>
              <b>
                {routing ? "…" : quote ? formatRwf(quote.deliveryFeeRwf) : "—"}
              </b>
            </div>
            <div className="delivery-total">
              <span>Grand total</span>
              <b>
                {quote
                  ? formatRwf(cart.itemsSubtotal + quote.deliveryFeeRwf)
                  : "—"}
              </b>
            </div>
          </div>
          {error && <div className="delivery-error">{error}</div>}
          <button
            className="delivery-continue"
            disabled={!confirmed || !quote || routing}
            onClick={() => router.push("/checkout/review")}
          >
            Continue <ArrowRight />
          </button>
          <p>
            <Bike /> Driving route calculated from the store to your confirmed
            pin
          </p>
        </aside>
      </div>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Camera,
  Check,
  CheckCircle2,
  Clock3,
  LocateFixed,
  MapPin,
  Package,
  RefreshCw,
  Route,
  Search,
  ShieldCheck,
  Smartphone,
  UserRound,
} from "lucide-react";
import {
  FormEvent,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { formatRwf } from "@/lib/money";
import { ParcelRouteMapLoader } from "./parcel-route-map-loader";
import type { ParcelMapPoint } from "./parcel-route-map";

type LocationDraft = {
  latitude: number | null;
  longitude: number | null;
  address: string;
  details: string;
  instructions: string;
};

type ParcelDraft = {
  pickupContactName: string;
  pickupPhone: string;
  pickup: LocationDraft;
  pickupPreference: "NOW" | "SCHEDULED";
  scheduledPickupAt: string;
  recipientName: string;
  recipientPhone: string;
  delivery: LocationDraft;
  categoryName: string;
  parcelDescription: string;
  quantity: number;
  estimatedWeightKg: string;
  sizeCode: string;
  fragile: boolean;
  requiresCarefulHandling: boolean;
  declaredValueRwf: string;
};

type ParcelQuote = {
  distanceM: number;
  estimatedDurationS: number;
  deliveryFeeRwf: number;
  extraFeesRwf: number;
  totalRwf: number;
  route: [number, number][];
};

type SearchResult = {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  type: string;
};

const DRAFT_KEY = "karame_parcel_draft_v1";
type ParcelCategoryOption = { id: string; name: string };
type ParcelSizeOption = {
  code: string;
  name: string;
  description: string | null;
  examples: string[];
  maxWeightKg: number;
};
const STEPS = [
  "Pickup",
  "Recipient",
  "Parcel details",
  "Route & price",
  "Payment",
  "Confirmation",
];

const emptyLocation = (): LocationDraft => ({
  latitude: null,
  longitude: null,
  address: "",
  details: "",
  instructions: "",
});

function initialDraft(
  name: string,
  phone: string,
  categoryName: string,
  sizeCode: string,
): ParcelDraft {
  return {
    pickupContactName: name,
    pickupPhone: phone,
    pickup: emptyLocation(),
    pickupPreference: "NOW",
    scheduledPickupAt: "",
    recipientName: "",
    recipientPhone: "",
    delivery: emptyLocation(),
    categoryName,
    parcelDescription: "",
    quantity: 1,
    estimatedWeightKg: "",
    sizeCode,
    fragile: false,
    requiresCarefulHandling: false,
    declaredValueRwf: "",
  };
}

function mapPoint(location: LocationDraft): ParcelMapPoint | null {
  return location.latitude != null && location.longitude != null
    ? { latitude: location.latitude, longitude: location.longitude }
    : null;
}

function validRwandaPhone(value: string) {
  const compact = value.trim().replace(/[\s()-]/g, "");
  return /^(?:\+2507\d{8}|2507\d{8}|07\d{8})$/.test(compact);
}

function normaliseRoute(value: unknown): [number, number][] {
  if (typeof value === "string") {
    try {
      return normaliseRoute(JSON.parse(value));
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (point): point is [number, number] =>
        Array.isArray(point) &&
        point.length >= 2 &&
        Number.isFinite(Number(point[0])) &&
        Number.isFinite(Number(point[1])),
    )
    .map((point) => [Number(point[0]), Number(point[1])]);
}

function Field({
  label,
  children,
  hint,
  wide = false,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  wide?: boolean;
}) {
  return (
    <label className={`parcel-field ${wide ? "wide" : ""}`}>
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

function LocationPicker({
  kind,
  pickup,
  delivery,
  onLocationChange,
}: {
  kind: "pickup" | "delivery";
  pickup: LocationDraft;
  delivery: LocationDraft;
  onLocationChange: (
    kind: "pickup" | "delivery",
    changes: Partial<LocationDraft>,
  ) => void;
}) {
  const current = kind === "pickup" ? pickup : delivery;
  const [query, setQuery] = useState(current.address);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    queueMicrotask(() => setQuery(current.address));
  }, [current.address]);

  async function reverse(point: ParcelMapPoint) {
    try {
      const params = new URLSearchParams({
        lat: String(point.latitude),
        lon: String(point.longitude),
      });
      const response = await fetch(`/api/geocoding/reverse?${params}`);
      const data = await response.json().catch(() => ({}));
      const address = String(data.address ?? "Pinned location, Rwanda");
      onLocationChange(kind, { ...point, address });
      setQuery(address);
    } catch {
      onLocationChange(kind, { ...point, address: "Pinned location, Rwanda" });
      setQuery("Pinned location, Rwanda");
    }
  }

  function place(point: ParcelMapPoint, address?: string) {
    setResults([]);
    setMessage("");
    onLocationChange(kind, { ...point, address: address ?? "" });
    if (address) setQuery(address);
    else void reverse(point);
  }

  function useGps() {
    if (!navigator.geolocation) {
      setMessage("GPS is not supported on this device.");
      return;
    }
    setLocating(true);
    setMessage("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        place({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocating(false);
      },
      () => {
        setMessage(
          "We could not access your GPS. Search or move the pin instead.",
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 20_000 },
    );
  }

  async function searchAddress(event: FormEvent) {
    event.preventDefault();
    if (query.trim().length < 3) {
      setMessage("Enter at least three characters.");
      return;
    }
    setSearching(true);
    setMessage("");
    setResults([]);
    try {
      const response = await fetch(
        `/api/geocoding/search?q=${encodeURIComponent(query.trim())}`,
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Address search failed.");
      setResults(data.results ?? []);
      if (!data.results?.length)
        setMessage("No matching location was found in Rwanda.");
    } catch (searchError) {
      setMessage(
        searchError instanceof Error
          ? searchError.message
          : "Address search is temporarily unavailable.",
      );
    } finally {
      setSearching(false);
    }
  }

  return (
    <section className="parcel-location-picker">
      <div className="parcel-location-tools">
        <form onSubmit={searchAddress}>
          <Search />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={
              kind === "pickup"
                ? "Search pickup area or landmark"
                : "Search recipient area or landmark"
            }
            aria-label={`Search ${kind} location`}
          />
          <button type="submit" disabled={searching}>
            {searching ? "Searching…" : "Search"}
          </button>
        </form>
        <button type="button" onClick={useGps} disabled={locating}>
          <LocateFixed /> {locating ? "Locating…" : "Use my GPS"}
        </button>
      </div>
      {results.length > 0 && (
        <div className="parcel-location-results">
          {results.map((result) => (
            <button
              type="button"
              key={result.id}
              onClick={() =>
                place(
                  {
                    latitude: result.latitude,
                    longitude: result.longitude,
                  },
                  result.label,
                )
              }
            >
              <MapPin />
              <span>
                <b>{result.label.split(",")[0]}</b>
                <small>{result.label}</small>
              </span>
            </button>
          ))}
        </div>
      )}
      {message && <p className="parcel-inline-message">{message}</p>}
      <div className="parcel-location-map-shell">
        <ParcelRouteMapLoader
          pickup={mapPoint(pickup)}
          delivery={mapPoint(delivery)}
          editing={kind}
          onPickupChange={(point) => place(point)}
          onDeliveryChange={(point) => place(point)}
        />
        <span className="parcel-map-hint">
          <MapPin /> Tap the map or drag the {kind} pin
        </span>
      </div>
      <div className="parcel-picked-address">
        <MapPin />
        <span>
          <small>{kind === "pickup" ? "PICKUP POINT" : "DELIVERY POINT"}</small>
          <b>{current.address || "Choose a point on the map"}</b>
        </span>
      </div>
    </section>
  );
}

export function ParcelBookingWizard({
  customerName,
  customerPhone,
  categories,
  sizes,
  prohibitedRules,
}: {
  customerName: string;
  customerPhone: string;
  categories: ParcelCategoryOption[];
  sizes: ParcelSizeOption[];
  prohibitedRules: string[];
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState(() =>
    initialDraft(
      customerName,
      customerPhone,
      categories[0]?.name ?? "Other",
      sizes[0]?.code ?? "SMALL",
    ),
  );
  const [quote, setQuote] = useState<ParcelQuote | null>(null);
  const [parcelPhoto, setParcelPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [detailsConfirmed, setDetailsConfirmed] = useState(false);
  const [prohibitedConfirmed, setProhibitedConfirmed] = useState(false);
  const [packagingConfirmed, setPackagingConfirmed] = useState(false);
  const [recipientConfirmed, setRecipientConfirmed] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [quoting, setQuoting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");
  const [deliveryCode, setDeliveryCode] = useState("");
  const hydrated = useRef(false);

  useEffect(() => {
    let active = true;
    try {
      const saved = JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? "null");
      if (saved && typeof saved === "object") {
        queueMicrotask(() => {
          if (active) setDraft((current) => ({ ...current, ...saved }));
        });
      }
    } catch {}
    hydrated.current = true;
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated.current || reference) return;
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [draft, reference]);

  useEffect(
    () => () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    },
    [photoPreview],
  );

  const pickup = mapPoint(draft.pickup);
  const delivery = mapPoint(draft.delivery);
  const total = quote?.totalRwf ?? quote?.deliveryFeeRwf ?? 0;
  const selectedSize = sizes.find((size) => size.code === draft.sizeCode);

  function patch(values: Partial<ParcelDraft>) {
    setDraft((current) => ({ ...current, ...values }));
  }

  function updateLocation(
    kind: "pickup" | "delivery",
    changes: Partial<LocationDraft>,
  ) {
    setDraft((current) => ({
      ...current,
      [kind]: { ...current[kind], ...changes },
    }));
    setQuote(null);
  }

  function showError(message: string) {
    setError(message);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function validateStep(currentStep: number) {
    if (currentStep === 1) {
      if (draft.pickupContactName.trim().length < 2)
        return "Enter the pickup contact name.";
      if (!validRwandaPhone(draft.pickupPhone))
        return "Enter a valid Rwanda pickup phone number.";
      if (!pickup) return "Choose the pickup point on the map.";
      if (draft.pickup.address.trim().length < 3)
        return "Confirm the pickup address.";
      if (draft.pickup.details.trim().length < 3)
        return "Add exact pickup details, such as a building or landmark.";
      if (
        draft.pickupPreference === "SCHEDULED" &&
        !draft.scheduledPickupAt
      )
        return "Choose the preferred pickup date and time.";
    }
    if (currentStep === 2) {
      if (draft.recipientName.trim().length < 2)
        return "Enter the recipient's full name.";
      if (!validRwandaPhone(draft.recipientPhone))
        return "Enter a valid Rwanda recipient phone number.";
      if (!delivery) return "Choose the recipient's delivery point.";
      if (draft.delivery.address.trim().length < 3)
        return "Confirm the delivery address.";
      if (draft.delivery.details.trim().length < 3)
        return "Add exact delivery details, such as a house or landmark.";
    }
    if (currentStep === 3) {
      if (draft.parcelDescription.trim().length < 3)
        return "Describe what is inside the parcel.";
      const weight = Number(draft.estimatedWeightKg);
      if (!Number.isFinite(weight) || weight <= 0)
        return "Enter a valid estimated weight.";
      if (!Number.isInteger(draft.quantity) || draft.quantity < 1)
        return "Parcel quantity must be at least one.";
    }
    if (currentStep === 4 && !quote)
      return "Calculate a valid route and price before continuing.";
    return "";
  }

  async function calculateQuote() {
    if (!pickup || !delivery) {
      showError("Pickup and delivery points are required.");
      return false;
    }
    setQuoting(true);
    setError("");
    try {
      const response = await fetch("/api/parcels/quote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          pickupLatitude: pickup.latitude,
          pickupLongitude: pickup.longitude,
          deliveryLatitude: delivery.latitude,
          deliveryLongitude: delivery.longitude,
          sizeCode: draft.sizeCode,
          estimatedWeightKg: Number(draft.estimatedWeightKg),
          fragile: draft.fragile,
          requiresCarefulHandling: draft.requiresCarefulHandling,
          scheduled: draft.pickupPreference === "SCHEDULED",
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) {
        router.push("/customer/login");
        return false;
      }
      if (!response.ok)
        throw new Error(data.error ?? "We could not calculate this route.");
      const raw = data.quote ?? data;
      const distanceM = Number(
        raw.distanceM ?? Number(raw.distanceKm ?? 0) * 1000,
      );
      const estimatedDurationS = Number(
        raw.estimatedDurationS ?? Number(raw.durationMinutes ?? 0) * 60,
      );
      const deliveryFeeRwf = Number(raw.deliveryFeeRwf ?? 0);
      const extraFeesRwf = Number(raw.extraFeesRwf ?? 0);
      const totalRwf = Number(raw.totalRwf ?? deliveryFeeRwf);
      if (
        !Number.isFinite(distanceM) ||
        distanceM <= 0 ||
        !Number.isFinite(estimatedDurationS) ||
        estimatedDurationS <= 0 ||
        !Number.isInteger(deliveryFeeRwf) ||
        deliveryFeeRwf < 0
      )
        throw new Error("The route service returned an invalid quote.");
      setQuote({
        distanceM,
        estimatedDurationS,
        deliveryFeeRwf,
        extraFeesRwf: Number.isFinite(extraFeesRwf) ? extraFeesRwf : 0,
        totalRwf: Number.isFinite(totalRwf) ? totalRwf : deliveryFeeRwf,
        route: normaliseRoute(
          raw.route ?? raw.routeCoordinates ?? raw.quotedRoute,
        ),
      });
      return true;
    } catch (quoteError) {
      showError(
        quoteError instanceof Error
          ? quoteError.message
          : "Routing is temporarily unavailable. Please try again.",
      );
      return false;
    } finally {
      setQuoting(false);
    }
  }

  async function next() {
    setError("");
    const validationError = validateStep(step);
    if (validationError) {
      showError(validationError);
      return;
    }
    if (step === 3) {
      setStep(4);
      window.scrollTo({ top: 0, behavior: "smooth" });
      await calculateQuote();
      return;
    }
    if (step === 5) {
      await submitParcel();
      return;
    }
    setStep((current) => Math.min(6, current + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function back() {
    setError("");
    setStep((current) => Math.max(1, current - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function choosePhoto(file: File | null) {
    setError("");
    if (!file) {
      setParcelPhoto(null);
      setPhotoPreview("");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      showError("Parcel photo must be a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      showError("Parcel photo must be smaller than 6 MB.");
      return;
    }
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setParcelPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function submitParcel() {
    if (
      !detailsConfirmed ||
      !prohibitedConfirmed ||
      !packagingConfirmed ||
      !recipientConfirmed ||
      !paymentConfirmed
    ) {
      showError("Confirm every booking and safety statement before submitting.");
      return;
    }
    if (!pickup || !delivery || !quote) {
      showError("Your route quote is missing. Return to Route & price.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const body = new FormData();
      const values: Record<string, string> = {
        pickupContactName: draft.pickupContactName.trim(),
        pickupPhone: draft.pickupPhone.trim(),
        pickupLatitude: String(pickup.latitude),
        pickupLongitude: String(pickup.longitude),
        pickupAddress: draft.pickup.address.trim(),
        pickupAddressDetails: draft.pickup.details.trim(),
        pickupInstructions: draft.pickup.instructions.trim(),
        pickupPreference: draft.pickupPreference,
        scheduledPickupAt:
          draft.pickupPreference === "SCHEDULED"
            ? draft.scheduledPickupAt
            : "",
        recipientName: draft.recipientName.trim(),
        recipientPhone: draft.recipientPhone.trim(),
        deliveryLatitude: String(delivery.latitude),
        deliveryLongitude: String(delivery.longitude),
        deliveryAddress: draft.delivery.address.trim(),
        deliveryAddressDetails: draft.delivery.details.trim(),
        deliveryInstructions: draft.delivery.instructions.trim(),
        categoryName: draft.categoryName,
        parcelCategory: draft.categoryName,
        parcelDescription: draft.parcelDescription.trim(),
        quantity: String(draft.quantity),
        estimatedWeightKg: draft.estimatedWeightKg,
        sizeCode: draft.sizeCode,
        fragile: String(draft.fragile),
        requiresCarefulHandling: String(draft.requiresCarefulHandling),
        declaredValueRwf: draft.declaredValueRwf,
        detailsAccurate: "true",
        prohibitedItemsConfirmed: "true",
        safePackagingConfirmed: "true",
        recipientAvailableConfirmed: "true",
        paymentConfirmed: "true",
      };
      Object.entries(values).forEach(([key, value]) => body.append(key, value));
      if (parcelPhoto) body.append("parcelPhoto", parcelPhoto);

      const response = await fetch("/api/parcels", {
        method: "POST",
        body,
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) {
        router.push("/customer/login");
        return;
      }
      if (!response.ok)
        throw new Error(data.error ?? "Parcel booking could not be submitted.");
      const createdReference = String(
        data.parcel?.reference ?? data.parcel?.referenceNumber ?? "",
      );
      if (!createdReference)
        throw new Error("The booking was created without a parcel reference.");
      setReference(createdReference);
      setDeliveryCode(
        String(
          data.parcel?.deliveryConfirmationCode ??
            data.parcel?.confirmationCode ??
            "",
        ),
      );
      setStep(6);
      sessionStorage.removeItem(DRAFT_KEY);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (submitError) {
      showError(
        submitError instanceof Error
          ? submitError.message
          : "Parcel booking could not be submitted.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const stepTitle = useMemo(() => STEPS[step - 1], [step]);

  return (
    <main className="parcel-booking-page">
      <div className="parcel-booking-heading">
        {step === 1 ? (
          <Link href="/">
            <ArrowLeft /> Back home
          </Link>
        ) : (
          <button type="button" className="parcel-heading-back" onClick={back}>
            <ArrowLeft /> Previous step
          </button>
        )}
        <span className="catalog-kicker">PARCEL DELIVERY</span>
        <h1>Send a parcel across Kigali</h1>
        <p>
          Add the two locations, tell us about the package, and receive a
          routed delivery price.
        </p>
      </div>

      <ol className="parcel-progress" aria-label="Parcel booking progress">
        {STEPS.map((label, index) => {
          const number = index + 1;
          return (
            <li
              key={label}
              className={`${number === step ? "current" : ""} ${number < step ? "complete" : ""}`}
              aria-current={number === step ? "step" : undefined}
            >
              <span>{number < step ? <Check /> : number}</span>
              <b>{label}</b>
            </li>
          );
        })}
      </ol>

      {error && <div className="parcel-form-error">{error}</div>}

      <section className="parcel-wizard-card">
        <header>
          <span>STEP {step} OF 6</span>
          <h2>{stepTitle}</h2>
        </header>

        {step === 1 && (
          <div className="parcel-step-content">
            <div className="parcel-section-heading">
              <UserRound />
              <div>
                <h3>Who will hand over the parcel?</h3>
                <p>We use these details only to coordinate pickup.</p>
              </div>
            </div>
            <div className="parcel-form-grid">
              <Field label="Pickup contact name">
                <input
                  value={draft.pickupContactName}
                  onChange={(event) =>
                    patch({ pickupContactName: event.target.value })
                  }
                  autoComplete="name"
                />
              </Field>
              <Field label="Pickup phone number" hint="Example: 0788123456">
                <input
                  type="tel"
                  value={draft.pickupPhone}
                  onChange={(event) => patch({ pickupPhone: event.target.value })}
                  autoComplete="tel"
                />
              </Field>
            </div>
            <LocationPicker
              kind="pickup"
              pickup={draft.pickup}
              delivery={draft.delivery}
              onLocationChange={updateLocation}
            />
            <div className="parcel-form-grid">
              <Field
                label="Exact pickup details"
                hint="Building, floor, house number, or nearby landmark"
                wide
              >
                <input
                  value={draft.pickup.details}
                  onChange={(event) =>
                    updateLocation("pickup", { details: event.target.value })
                  }
                  placeholder="For example: Kigali Heights, entrance B"
                />
              </Field>
              <Field label="Pickup instructions" wide>
                <textarea
                  value={draft.pickup.instructions}
                  onChange={(event) =>
                    updateLocation("pickup", {
                      instructions: event.target.value,
                    })
                  }
                  placeholder="Optional instructions for the rider"
                />
              </Field>
            </div>
            <div className="parcel-choice-section">
              <b>Preferred pickup time</b>
              <div className="parcel-inline-choices">
                <label className={draft.pickupPreference === "NOW" ? "selected" : ""}>
                  <input
                    type="radio"
                    name="pickupPreference"
                    checked={draft.pickupPreference === "NOW"}
                    onChange={() => patch({ pickupPreference: "NOW" })}
                  />
                  <Clock3 />
                  <span><b>Now</b><small>As soon as approved</small></span>
                </label>
                <label className={draft.pickupPreference === "SCHEDULED" ? "selected" : ""}>
                  <input
                    type="radio"
                    name="pickupPreference"
                    checked={draft.pickupPreference === "SCHEDULED"}
                    onChange={() => patch({ pickupPreference: "SCHEDULED" })}
                  />
                  <CalendarClock />
                  <span><b>Scheduled</b><small>Choose a preferred time</small></span>
                </label>
              </div>
              {draft.pickupPreference === "SCHEDULED" && (
                <Field label="Pickup date and time">
                  <input
                    type="datetime-local"
                    value={draft.scheduledPickupAt}
                    onChange={(event) =>
                      patch({ scheduledPickupAt: event.target.value })
                    }
                  />
                </Field>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="parcel-step-content">
            <div className="parcel-section-heading">
              <UserRound />
              <div>
                <h3>Who will receive the parcel?</h3>
                <p>The assigned rider will use these details during delivery.</p>
              </div>
            </div>
            <div className="parcel-form-grid">
              <Field label="Recipient full name">
                <input
                  value={draft.recipientName}
                  onChange={(event) => patch({ recipientName: event.target.value })}
                  autoComplete="name"
                />
              </Field>
              <Field label="Recipient phone number" hint="Example: +250788123456">
                <input
                  type="tel"
                  value={draft.recipientPhone}
                  onChange={(event) => patch({ recipientPhone: event.target.value })}
                  autoComplete="tel"
                />
              </Field>
            </div>
            <LocationPicker
              kind="delivery"
              pickup={draft.pickup}
              delivery={draft.delivery}
              onLocationChange={updateLocation}
            />
            <div className="parcel-form-grid">
              <Field
                label="Exact delivery details"
                hint="Building, floor, house number, or nearby landmark"
                wide
              >
                <input
                  value={draft.delivery.details}
                  onChange={(event) =>
                    updateLocation("delivery", { details: event.target.value })
                  }
                  placeholder="For example: KN 4 Avenue, blue gate"
                />
              </Field>
              <Field label="Delivery instructions" wide>
                <textarea
                  value={draft.delivery.instructions}
                  onChange={(event) =>
                    updateLocation("delivery", {
                      instructions: event.target.value,
                    })
                  }
                  placeholder="Optional instructions for the rider"
                />
              </Field>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="parcel-step-content">
            <div className="parcel-section-heading">
              <Package />
              <div>
                <h3>Tell us about the parcel</h3>
                <p>Accurate details help us confirm the right rider and vehicle.</p>
              </div>
            </div>
            <div className="parcel-form-grid">
              <Field label="Parcel category">
                <select
                  value={draft.categoryName}
                  onChange={(event) => patch({ categoryName: event.target.value })}
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Quantity">
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={draft.quantity}
                  onChange={(event) =>
                    patch({ quantity: Number(event.target.value) })
                  }
                />
              </Field>
              <Field label="Parcel description" wide>
                <textarea
                  value={draft.parcelDescription}
                  onChange={(event) =>
                    patch({ parcelDescription: event.target.value })
                  }
                  placeholder="Describe the package and its contents"
                />
              </Field>
              <Field label="Estimated weight (kg)">
                <input
                  type="number"
                  min="0.1"
                  max="200"
                  step="0.1"
                  value={draft.estimatedWeightKg}
                  onChange={(event) =>
                    patch({ estimatedWeightKg: event.target.value })
                  }
                  placeholder="For example: 2.5"
                />
              </Field>
              <Field label="Declared parcel value (RWF)" hint="Optional">
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={draft.declaredValueRwf}
                  onChange={(event) =>
                    patch({ declaredValueRwf: event.target.value })
                  }
                  placeholder="0"
                />
              </Field>
            </div>
            <div className="parcel-choice-section">
              <b>Parcel size</b>
              <div className="parcel-size-grid">
                {sizes.map((size) => (
                  <label
                    key={size.code}
                    className={draft.sizeCode === size.code ? "selected" : ""}
                  >
                    <input
                      type="radio"
                      name="parcelSize"
                      checked={draft.sizeCode === size.code}
                      onChange={() => patch({ sizeCode: size.code })}
                    />
                    <Package />
                    <span>
                      <b>{size.name}</b>
                      <small>
                        {size.examples.length
                          ? size.examples.join(", ")
                          : size.description || `Up to ${size.maxWeightKg} kg`}
                      </small>
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <div className="parcel-toggle-grid">
              <label>
                <input
                  type="checkbox"
                  checked={draft.fragile}
                  onChange={(event) => patch({ fragile: event.target.checked })}
                />
                <span><b>Fragile parcel</b><small>Contents may break or be damaged</small></span>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={draft.requiresCarefulHandling}
                  onChange={(event) =>
                    patch({ requiresCarefulHandling: event.target.checked })
                  }
                />
                <span><b>Careful handling required</b><small>Handle or position with extra care</small></span>
              </label>
            </div>
            <div className="parcel-photo-field">
              <Camera />
              <div>
                <b>Parcel photo <small>Optional</small></b>
                <p>JPG, PNG, or WebP, up to 6 MB.</p>
                <label>
                  Choose photo
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => choosePhoto(event.target.files?.[0] ?? null)}
                    hidden
                  />
                </label>
              </div>
              {photoPreview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoPreview} alt="Selected parcel preview" />
              )}
            </div>
            <aside className="parcel-capacity-note">
              <ShieldCheck />
              <p>
                The system checks your selected size and estimated weight. If
                it exceeds rider capacity, you will be asked to contact Karame
                Bay for special delivery assistance.
              </p>
            </aside>
          </div>
        )}

        {step === 4 && (
          <div className="parcel-step-content">
            <div className="parcel-section-heading">
              <Route />
              <div>
                <h3>Your pickup-to-delivery route</h3>
                <p>Distance comes from the OpenStreetMap driving route.</p>
              </div>
              <button
                type="button"
                className="parcel-requote"
                onClick={calculateQuote}
                disabled={quoting}
              >
                <RefreshCw /> {quoting ? "Calculating…" : "Recalculate"}
              </button>
            </div>
            <div className="parcel-route-layout">
              <div className="parcel-route-map-card">
                <ParcelRouteMapLoader
                  pickup={pickup}
                  delivery={delivery}
                  route={quote?.route ?? []}
                />
              </div>
              <aside className="parcel-quote-card">
                {quoting ? (
                  <div className="parcel-quote-loading">
                    <RefreshCw /> Calculating driving route…
                  </div>
                ) : quote ? (
                  <>
                    <h3>Route summary</h3>
                    <div><MapPin /><span><small>PICKUP</small><b>{draft.pickup.details}</b></span></div>
                    <div><MapPin /><span><small>DELIVERY</small><b>{draft.delivery.details}</b></span></div>
                    <dl>
                      <div><dt>Distance</dt><dd>{(quote.distanceM / 1000).toFixed(1)} km</dd></div>
                      <div><dt>Estimated travel time</dt><dd>{Math.max(1, Math.ceil(quote.estimatedDurationS / 60))} min</dd></div>
                      {quote.extraFeesRwf > 0 && <div><dt>Extra handling fees</dt><dd>{formatRwf(quote.extraFeesRwf)}</dd></div>}
                      <div className="total"><dt>Delivery total</dt><dd>{formatRwf(total)}</dd></div>
                    </dl>
                  </>
                ) : (
                  <div className="parcel-quote-loading">
                    <Route /> Route price is not available yet.
                  </div>
                )}
              </aside>
            </div>
          </div>
        )}

        {step === 5 && quote && (
          <div className="parcel-step-content parcel-payment-step">
            <div className="parcel-payment-layout">
              <div>
                <div className="parcel-section-heading">
                  <Smartphone />
                  <div><h3>Pay with Mobile Money</h3><p>Complete payment, then confirm the statements below.</p></div>
                </div>
                <section className="parcel-momo-card">
                  <div className="parcel-momo-brand"><span>MoMo</span><div><small>KARAME BAY PAYMENT</small><h3>Complete payment on your phone</h3></div></div>
                  <a href="tel:%2A182%2A8%2A1%2A188671%23" className="parcel-momo-code">
                    <Smartphone /><span><small>TAP TO OPEN PHONE DIALER</small><b>*182*8*1*188671#</b></span>
                  </a>
                  <div className="parcel-momo-name"><span>MoMo Pay Name</span><b>Theo</b></div>
                  <div className="parcel-momo-amount"><span>Amount to pay</span><b>{formatRwf(total)}</b></div>
                </section>
                <details className="parcel-prohibited-rules">
                  <summary>Review prohibited parcel items</summary>
                  <ul>
                    {prohibitedRules.map((rule) => (
                      <li key={rule}>{rule}</li>
                    ))}
                  </ul>
                </details>
                <section className="parcel-confirmations">
                  <h3>Confirm before booking</h3>
                  {[
                    [detailsConfirmed, setDetailsConfirmed, "The parcel and contact details are accurate."],
                    [prohibitedConfirmed, setProhibitedConfirmed, "This parcel does not contain prohibited or dangerous items."],
                    [packagingConfirmed, setPackagingConfirmed, "The parcel is packaged safely for transport."],
                    [recipientConfirmed, setRecipientConfirmed, "The recipient is available to receive the parcel."],
                    [paymentConfirmed, setPaymentConfirmed, "I have completed the Mobile Money payment."],
                  ].map(([checked, setter, label]) => (
                    <label key={String(label)} className={checked ? "checked" : ""}>
                      <input
                        type="checkbox"
                        checked={Boolean(checked)}
                        onChange={(event) =>
                          (setter as (value: boolean) => void)(event.target.checked)
                        }
                      />
                      <span><Check /> </span>
                      <b>{String(label)}</b>
                    </label>
                  ))}
                </section>
              </div>
              <aside className="parcel-final-summary">
                <h3>Parcel summary</h3>
                <dl>
                  <div><dt>Pickup contact</dt><dd>{draft.pickupContactName}</dd></div>
                  <div><dt>Pickup</dt><dd>{draft.pickup.details}</dd></div>
                  <div><dt>Recipient</dt><dd>{draft.recipientName}</dd></div>
                  <div><dt>Delivery</dt><dd>{draft.delivery.details}</dd></div>
                  <div><dt>Parcel</dt><dd>{draft.categoryName}</dd></div>
                  <div><dt>Size / weight</dt><dd>{selectedSize?.name ?? draft.sizeCode} · {draft.estimatedWeightKg} kg</dd></div>
                  <div><dt>Fragile</dt><dd>{draft.fragile ? "Yes" : "No"}</dd></div>
                  <div><dt>Distance</dt><dd>{(quote.distanceM / 1000).toFixed(1)} km</dd></div>
                  <div><dt>Estimated time</dt><dd>{Math.max(1, Math.ceil(quote.estimatedDurationS / 60))} min</dd></div>
                  <div className="total"><dt>Total</dt><dd>{formatRwf(total)}</dd></div>
                </dl>
              </aside>
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="parcel-confirmation-screen">
            <span><CheckCircle2 /></span>
            <small>PARCEL REQUEST CREATED</small>
            <h2>Your parcel request is with Karame Bay.</h2>
            <p>
              An administrator will verify payment, review the parcel, and
              manually assign a rider after approval.
            </p>
            <div className="parcel-reference"><small>PARCEL REFERENCE</small><b>{reference}</b></div>
            {deliveryCode && (
              <div className="parcel-delivery-code">
                <small>DELIVERY CONFIRMATION CODE</small>
                <b>{deliveryCode}</b>
                <p>Share this only with the recipient. Do not send it to the rider before handover.</p>
              </div>
            )}
            <div className="parcel-confirmation-actions">
              <Link href={`/customer/parcels/${reference}`}>Track this parcel <ArrowRight /></Link>
              <Link href="/customer/parcels">My parcel deliveries</Link>
            </div>
          </div>
        )}

        {step < 6 && (
          <footer className="parcel-wizard-actions">
            <button type="button" className="secondary" onClick={back} disabled={step === 1 || submitting}>
              <ArrowLeft /> Back
            </button>
            <span>Your parcel is separate from your shopping basket.</span>
            <button type="button" className="primary" onClick={next} disabled={quoting || submitting}>
              {step === 5 ? (submitting ? "Submitting…" : "Confirm parcel request") : step === 3 ? (quoting ? "Calculating…" : "Calculate route") : "Continue"}
              {step === 5 ? <CheckCircle2 /> : <ArrowRight />}
            </button>
          </footer>
        )}
      </section>
    </main>
  );
}

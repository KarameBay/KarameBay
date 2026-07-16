"use client";

import type { CSSProperties, FormEvent } from "react";
import { useState, useTransition } from "react";
import { LoaderCircle, Plus, Save, Trash2, Users } from "lucide-react";
import { useRouter } from "next/navigation";

type AdminRider = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: string;
  riderProfile: {
    riderStatus: string;
    vehicleType: string;
    licensePlate: string | null;
    photoUrl: string | null;
    lastSeenAt: string | null;
  } | null;
  _count: { deliveries: number };
};

type RiderFormState = {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  accountStatus: "ACTIVE" | "SUSPENDED";
  riderStatus: "AVAILABLE" | "BUSY" | "ON_DELIVERY" | "OFFLINE";
  vehicleType: string;
  licensePlate: string;
  photoUrl: string;
};

const emptyForm = (): RiderFormState => ({
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  password: "",
  accountStatus: "ACTIVE",
  riderStatus: "OFFLINE",
  vehicleType: "MOTORCYCLE",
  licensePlate: "",
  photoUrl: "",
});

function asForm(rider: AdminRider): RiderFormState {
  return {
    id: rider.id,
    firstName: rider.firstName,
    lastName: rider.lastName,
    email: rider.email,
    phone: rider.phone,
    password: "",
    accountStatus: rider.status === "SUSPENDED" ? "SUSPENDED" : "ACTIVE",
    riderStatus:
      (rider.riderProfile?.riderStatus as RiderFormState["riderStatus"]) ??
      "OFFLINE",
    vehicleType: rider.riderProfile?.vehicleType ?? "MOTORCYCLE",
    licensePlate: rider.riderProfile?.licensePlate ?? "",
    photoUrl: rider.riderProfile?.photoUrl ?? "",
  };
}

export function AdminRiderManager({ riders }: { riders: AdminRider[] }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string>("new");
  const [form, setForm] = useState<RiderFormState>(emptyForm());
  const [saving, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function pickRider(rider: AdminRider) {
    setSelectedId(rider.id);
    setForm(asForm(rider));
    setMessage("");
    setError("");
  }

  function resetForm() {
    setSelectedId("new");
    setForm(emptyForm());
    setMessage("");
    setError("");
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    startTransition(async () => {
      const response = await fetch("/api/admin/riders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...form,
          id: selectedId === "new" ? undefined : selectedId,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "Could not save the rider.");
        return;
      }
      setMessage(
        selectedId === "new"
          ? "Rider account created."
          : "Rider account updated.",
      );
      resetForm();
      router.refresh();
    });
  }

  async function patchRider(
    riderId: string,
    payload: { accountStatus?: "ACTIVE" | "SUSPENDED"; riderStatus?: RiderFormState["riderStatus"] },
  ) {
    setError("");
    setMessage("");
    const response = await fetch(`/api/admin/riders/${riderId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error ?? "Could not update the rider.");
      return false;
    }
    setMessage("Rider updated.");
    router.refresh();
    return true;
  }

  async function removeRider(riderId: string, riderName: string) {
    const confirmed = window.confirm(
      `Delete ${riderName}? This removes the rider account from Karame Bay Admin.`,
    );
    if (!confirmed) return;

    setError("");
    setMessage("");
    const response = await fetch(`/api/admin/riders/${riderId}`, {
      method: "DELETE",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error ?? "Could not delete the rider.");
      return;
    }

    if (selectedId === riderId) {
      resetForm();
    }
    setMessage("Rider deleted.");
    router.refresh();
  }

  return (
    <section
      className="admin-management-shell"
      style={{
        display: "grid",
        gridTemplateColumns: "1fr",
        gap: "16px",
        marginTop: "24px",
      }}
    >
      <form className="admin-management-card" onSubmit={save}>
        <div className="panel-head">
          <span>
            <Plus />
          </span>
          <div>
            <span className="catalog-kicker">RIDER MANAGEMENT</span>
            <h2>{selectedId === "new" ? "Register a rider" : "Edit rider"}</h2>
            <p>
              Create driver accounts directly inside Admin. No separate rider
              workspace is needed.
            </p>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: "12px",
            marginTop: "18px",
          }}
        >
          <label style={fieldStyle}>
            First name
            <input
              value={form.firstName}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  firstName: event.target.value,
                }))
              }
              required
            />
          </label>
          <label style={fieldStyle}>
            Last name
            <input
              value={form.lastName}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  lastName: event.target.value,
                }))
              }
              required
            />
          </label>
          <label style={fieldStyle}>
            Phone
            <input
              value={form.phone}
              onChange={(event) =>
                setForm((current) => ({ ...current, phone: event.target.value }))
              }
              required
            />
          </label>
          <label style={fieldStyle}>
            Email
            <input
              value={form.email}
              onChange={(event) =>
                setForm((current) => ({ ...current, email: event.target.value }))
              }
              type="email"
              required
            />
          </label>
          <label style={fieldStyle}>
            Password
            <input
              value={form.password}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  password: event.target.value,
                }))
              }
              type="password"
              placeholder={selectedId === "new" ? "Create password" : "Leave blank to keep current"}
              required={selectedId === "new"}
            />
          </label>
          <label style={fieldStyle}>
            Account status
            <select
              value={form.accountStatus}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  accountStatus: event.target.value as "ACTIVE" | "SUSPENDED",
                }))
              }
            >
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </label>
          <label style={fieldStyle}>
            Rider status
            <select
              value={form.riderStatus}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  riderStatus: event.target.value as RiderFormState["riderStatus"],
                }))
              }
            >
              <option value="AVAILABLE">Available</option>
              <option value="BUSY">Busy</option>
              <option value="ON_DELIVERY">On delivery</option>
              <option value="OFFLINE">Offline</option>
            </select>
          </label>
          <label style={fieldStyle}>
            Vehicle type
            <input
              value={form.vehicleType}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  vehicleType: event.target.value,
                }))
              }
              required
            />
          </label>
          <label style={fieldStyle}>
            License plate
            <input
              value={form.licensePlate}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  licensePlate: event.target.value,
                }))
              }
            />
          </label>
          <label style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
            Photo URL
            <input
              value={form.photoUrl}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  photoUrl: event.target.value,
                }))
              }
              placeholder="https://..."
            />
          </label>
        </div>

        <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
          <button className="primary" type="submit" disabled={saving}>
            {saving ? <LoaderCircle className="spin" /> : <Save />}
            {selectedId === "new" ? "Create rider" : "Save changes"}
          </button>
          <button
            type="button"
            className="secondary"
            onClick={resetForm}
            style={{ width: "160px" }}
          >
            <Plus /> New rider
          </button>
        </div>

        {message && <p className="form-success">{message}</p>}
        {error && <p className="form-error">{error}</p>}
      </form>

      <div className="admin-management-card">
        <div className="panel-head">
          <span>
            <Users />
          </span>
          <div>
            <span className="catalog-kicker">REGISTERED RIDERS</span>
            <h2>Admin rider list</h2>
            <p>Click a rider to edit their account or status.</p>
          </div>
        </div>

        <div style={{ display: "grid", gap: "12px", marginTop: "16px" }}>
          {riders.map((rider) => {
            const profile = rider.riderProfile;
            return (
              <div
                key={rider.id}
                onClick={() => pickRider(rider)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    pickRider(rider);
                  }
                }}
                className="admin-rider-row"
                style={{
                  textAlign: "left",
                  border: "1px solid var(--line)",
                  borderRadius: "14px",
                  padding: "14px",
                  background: selectedId === rider.id ? "#eef4eb" : "#fff",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
                  <div>
                    <b style={{ display: "block", fontSize: "14px" }}>
                      {rider.firstName} {rider.lastName}
                    </b>
                    <small style={{ color: "var(--muted)" }}>
                      {rider.email} · {rider.phone}
                    </small>
                  </div>
                  <span className={`status-pill ${rider.status.toLowerCase()}`}>
                    {rider.status}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "10px",
                    marginTop: "10px",
                    color: "var(--muted)",
                    fontSize: "11px",
                  }}
                >
                  <span>{profile?.vehicleType ?? "Motorcycle"}</span>
                  <span>{profile?.riderStatus ?? "OFFLINE"}</span>
                  <span>{rider._count.deliveries} deliveries</span>
                </div>
                <div
                  style={{
                    marginTop: "8px",
                    color: "var(--muted)",
                    fontSize: "11px",
                  }}
                >
                  {profile?.licensePlate || "No license plate set"}
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    marginTop: "12px",
                    justifyContent: "flex-end",
                    flexWrap: "wrap",
                  }}
                  onClick={(event) => event.stopPropagation()}
                >
                  <button
                    type="button"
                    className="secondary"
                    style={{ width: "auto", padding: "0 14px" }}
                    onClick={() => pickRider(rider)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    style={{ width: "auto", padding: "0 14px" }}
                    onClick={() =>
                      patchRider(rider.id, {
                        accountStatus:
                          rider.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED",
                      })
                    }
                  >
                    {rider.status === "SUSPENDED" ? "Activate" : "Suspend"}
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    style={{ width: "auto", padding: "0 14px", background: "#8f3d2d" }}
                    onClick={() =>
                      removeRider(
                        rider.id,
                        `${rider.firstName} ${rider.lastName}`,
                      )
                    }
                  >
                    <Trash2 /> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {!riders.length && (
          <div className="empty" style={{ padding: "18px 0" }}>
            No riders yet. Create the first rider above.
          </div>
        )}
      </div>
    </section>
  );
}

const fieldStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  fontSize: "11px",
  fontWeight: 700,
};

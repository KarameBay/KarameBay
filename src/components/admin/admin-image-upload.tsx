"use client";

import { ChangeEvent, useId, useRef, useState } from "react";
import { ImageIcon, LoaderCircle, Trash2, Upload } from "lucide-react";

type ImagePurpose = "store-logo" | "store-cover" | "store-type" | "product";

export function AdminImageUpload({
  label,
  purpose,
  value,
  onChange,
  help,
}: {
  label: string;
  purpose: ImagePurpose;
  value: string;
  onChange: (url: string, publicId?: string) => void;
  help?: string;
}) {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function uploadImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploading(true);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("purpose", purpose);
      const response = await fetch("/api/admin/uploads/images", {
        method: "POST",
        body,
      });
      const data = (await response.json().catch(() => ({}))) as {
        url?: string;
        publicId?: string;
        error?: string;
      };
      if (!response.ok || !data.url) {
        throw new Error(data.error ?? "Could not upload the image.");
      }
      onChange(data.url, data.publicId);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Could not upload the image.",
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      className="admin-image-upload"
      style={{
        gridColumn: "1 / -1",
        border: "1px solid var(--line)",
        borderRadius: "12px",
        padding: "14px",
        background: "#fffdfa",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          marginBottom: "10px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
          <label htmlFor={inputId} style={{ fontWeight: 800 }}>
            {label}
          </label>
          <small style={{ color: "var(--muted)" }}>
            {help ?? "Choose a JPG, PNG, or WebP image from this device."}
          </small>
        </div>
        <input
          ref={fileInputRef}
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={uploadImage}
          hidden
        />
        <button
          type="button"
          className="secondary"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          style={{ width: "auto", minWidth: "145px", padding: "0 14px" }}
        >
          {uploading ? <LoaderCircle className="spin" /> : <Upload />}
          {uploading ? "Uploading…" : "Choose local file"}
        </button>
      </div>

      {value ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "88px minmax(0, 1fr) auto",
            alignItems: "center",
            gap: "12px",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt={`${label} preview`}
            style={{
              width: "88px",
              height: purpose === "store-cover" ? "56px" : "76px",
              objectFit: "cover",
              borderRadius: "9px",
              border: "1px solid var(--line)",
              background: "#f7f2e9",
            }}
          />
          <input
            aria-label={`${label} URL`}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Or paste an image URL"
          />
          <button
            type="button"
            aria-label={`Remove ${label.toLowerCase()}`}
            onClick={() => onChange("")}
            style={{
              width: "42px",
              height: "42px",
              border: "1px solid var(--line)",
              borderRadius: "9px",
              background: "#fff",
              display: "grid",
              placeItems: "center",
              color: "#93463d",
            }}
          >
            <Trash2 style={{ width: "17px" }} />
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "9px" }}>
          <div
            style={{
              minHeight: "58px",
              border: "1px dashed #d8cbb8",
              borderRadius: "9px",
              display: "flex",
              alignItems: "center",
              gap: "9px",
              padding: "10px 13px",
              color: "var(--muted)",
            }}
          >
            <ImageIcon style={{ width: "20px" }} />
            <span style={{ fontSize: "10px" }}>No image selected</span>
          </div>
          <input
            aria-label={`${label} URL`}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Or paste an image URL"
          />
        </div>
      )}
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}

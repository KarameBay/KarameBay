"use client";

import type { FormEvent, ReactNode } from "react";
import { useState, useTransition } from "react";
import { LoaderCircle, Save, Settings2 } from "lucide-react";

type Pricing = {
  version: number;
  baseFeeRwf: number;
  perKmRwf: number;
  roundingIncrementRwf: number;
  sizeSurchargeEnabled: boolean;
  weightSurchargeEnabled: boolean;
  weightFreeAllowanceKg: number;
  weightSurchargePerKgRwf: number;
  fragileSurchargeEnabled: boolean;
  fragileSurchargeRwf: number;
  carefulHandlingEnabled: boolean;
  carefulHandlingRwf: number;
  waitingTimeChargeEnabled: boolean;
  waitingGraceMinutes: number;
  waitingPerMinuteRwf: number;
  scheduledSurchargeEnabled: boolean;
  scheduledSurchargeRwf: number;
  isActive: boolean;
};

type SizeDefinition = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  examples: string[];
  maxWeightKg: number;
  maxLengthCm: number;
  maxWidthCm: number;
  maxHeightCm: number;
  surchargeRwf: number;
  sortOrder: number;
  isActive: boolean;
};

type VehicleCapacity = {
  id: string;
  vehicleType: string;
  maxWeightKg: number;
  maxLengthCm: number;
  maxWidthCm: number;
  maxHeightCm: number;
  isActive: boolean;
};

type ParcelCategory = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
};

type ProhibitedRule = {
  id: string;
  title: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
};

type Props = {
  pricing: Pricing | null;
  sizes: SizeDefinition[];
  capacities: VehicleCapacity[];
  categories: ParcelCategory[];
  prohibitedRules: ProhibitedRule[];
};

const defaultPricing: Pricing = {
  version: 0,
  baseFeeRwf: 500,
  perKmRwf: 250,
  roundingIncrementRwf: 1,
  sizeSurchargeEnabled: false,
  weightSurchargeEnabled: false,
  weightFreeAllowanceKg: 0,
  weightSurchargePerKgRwf: 0,
  fragileSurchargeEnabled: false,
  fragileSurchargeRwf: 0,
  carefulHandlingEnabled: false,
  carefulHandlingRwf: 0,
  waitingTimeChargeEnabled: false,
  waitingGraceMinutes: 0,
  waitingPerMinuteRwf: 0,
  scheduledSurchargeEnabled: false,
  scheduledSurchargeRwf: 0,
  isActive: true,
};

const emptySize = (): Omit<SizeDefinition, "id"> & { id?: string } => ({
  code: "",
  name: "",
  description: "",
  examples: [],
  maxWeightKg: 1,
  maxLengthCm: 1,
  maxWidthCm: 1,
  maxHeightCm: 1,
  surchargeRwf: 0,
  sortOrder: 0,
  isActive: true,
});

const emptyCapacity = (): Omit<VehicleCapacity, "id"> & { id?: string } => ({
  vehicleType: "",
  maxWeightKg: 1,
  maxLengthCm: 1,
  maxWidthCm: 1,
  maxHeightCm: 1,
  isActive: true,
});

const emptyCategory = (): Omit<ParcelCategory, "id"> & { id?: string } => ({
  slug: "",
  name: "",
  description: "",
  sortOrder: 0,
  isActive: true,
});

const emptyRule = (): Omit<ProhibitedRule, "id"> & { id?: string } => ({
  title: "",
  description: "",
  sortOrder: 0,
  isActive: true,
});

export function AdminParcelSettings(initial: Props) {
  const [pricing, setPricing] = useState(initial.pricing ?? defaultPricing);
  const [sizes, setSizes] = useState(initial.sizes);
  const [capacities, setCapacities] = useState(initial.capacities);
  const [categories, setCategories] = useState(initial.categories);
  const [prohibitedRules, setProhibitedRules] = useState(
    initial.prohibitedRules,
  );
  const [size, setSize] = useState(emptySize());
  const [capacity, setCapacity] = useState(emptyCapacity());
  const [category, setCategory] = useState(emptyCategory());
  const [rule, setRule] = useState(emptyRule());
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  async function send(body: Record<string, unknown>) {
    const response = await fetch("/api/admin/settings/parcel", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error ?? "Could not save parcel settings.");
    return data;
  }

  function runSave(task: () => Promise<void>) {
    setError("");
    setMessage("");
    startTransition(async () => {
      try {
        await task();
      } catch (saveError) {
        setError(
          saveError instanceof Error
            ? saveError.message
            : "Could not save parcel settings.",
        );
      }
    });
  }

  function savePricing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    runSave(async () => {
      const data = await send({
        action: "UPDATE_PRICING",
        expectedVersion: pricing.version,
        ...pricing,
      });
      setPricing(data.pricing);
      setMessage(`Parcel pricing version ${data.pricing.version} saved.`);
    });
  }

  function saveSize(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    runSave(async () => {
      const data = await send({
        action: "SAVE_SIZE",
        ...size,
        examples: size.examples,
      });
      setSizes((current) => mergeById(current, data.size));
      setSize(data.size);
      setMessage("Parcel size saved.");
    });
  }

  function saveCapacity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    runSave(async () => {
      const data = await send({ action: "SAVE_CAPACITY", ...capacity });
      setCapacities((current) => mergeById(current, data.capacity));
      setCapacity(data.capacity);
      setMessage("Vehicle capacity saved.");
    });
  }

  function saveCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    runSave(async () => {
      const data = await send({ action: "SAVE_CATEGORY", ...category });
      setCategories((current) => mergeById(current, data.category));
      setCategory(data.category);
      setMessage("Parcel category saved.");
    });
  }

  function saveRule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    runSave(async () => {
      const data = await send({ action: "SAVE_PROHIBITED_RULE", ...rule });
      setProhibitedRules((current) => mergeById(current, data.prohibitedRule));
      setRule(data.prohibitedRule);
      setMessage("Prohibited-item rule saved.");
    });
  }

  return (
    <section className="parcel-settings" aria-labelledby="parcel-settings-title">
      <div className="parcel-settings-heading">
        <span className="parcel-settings-icon"><Settings2 /></span>
        <div>
          <span className="catalog-kicker">PARCEL CONFIGURATION</span>
          <h2 id="parcel-settings-title">Pricing and booking rules</h2>
          <p>Manage parcel pricing, limits, categories, and safety rules.</p>
        </div>
      </div>

      {(message || error) && (
        <p className={error ? "form-error" : "form-success"} role="status">
          {error || message}
        </p>
      )}

      <form className="parcel-pricing-form" onSubmit={savePricing}>
        <div className="parcel-settings-section-head">
          <div><h3>Pricing</h3><small>Current version {pricing.version}</small></div>
          <Toggle
            label="Parcel service active"
            checked={pricing.isActive}
            onChange={(checked) => setPricing((current) => ({ ...current, isActive: checked }))}
          />
        </div>
        <div className="parcel-settings-fields pricing-core">
          <NumberField label="Base price (RWF)" value={pricing.baseFeeRwf} onChange={(value) => setPricing((current) => ({ ...current, baseFeeRwf: value }))} />
          <NumberField label="Distance price (RWF per km)" value={pricing.perKmRwf} onChange={(value) => setPricing((current) => ({ ...current, perKmRwf: value }))} />
          <NumberField label="Rounding step (RWF)" min={1} value={pricing.roundingIncrementRwf} onChange={(value) => setPricing((current) => ({ ...current, roundingIncrementRwf: value }))} />
        </div>

        <div className="parcel-surcharge-grid">
          <SurchargeCard title="Size charge" enabled={pricing.sizeSurchargeEnabled} onToggle={(checked) => setPricing((current) => ({ ...current, sizeSurchargeEnabled: checked }))}>
            <small>Amounts are set inside each parcel size.</small>
          </SurchargeCard>
          <SurchargeCard title="Weight charge" enabled={pricing.weightSurchargeEnabled} onToggle={(checked) => setPricing((current) => ({ ...current, weightSurchargeEnabled: checked }))}>
            <NumberField label="Included kg" step="0.1" value={pricing.weightFreeAllowanceKg} onChange={(value) => setPricing((current) => ({ ...current, weightFreeAllowanceKg: value }))} />
            <NumberField label="RWF per extra kg" value={pricing.weightSurchargePerKgRwf} onChange={(value) => setPricing((current) => ({ ...current, weightSurchargePerKgRwf: value }))} />
          </SurchargeCard>
          <SurchargeCard title="Fragile handling" enabled={pricing.fragileSurchargeEnabled} onToggle={(checked) => setPricing((current) => ({ ...current, fragileSurchargeEnabled: checked }))}>
            <NumberField label="Charge (RWF)" value={pricing.fragileSurchargeRwf} onChange={(value) => setPricing((current) => ({ ...current, fragileSurchargeRwf: value }))} />
          </SurchargeCard>
          <SurchargeCard title="Careful handling" enabled={pricing.carefulHandlingEnabled} onToggle={(checked) => setPricing((current) => ({ ...current, carefulHandlingEnabled: checked }))}>
            <NumberField label="Charge (RWF)" value={pricing.carefulHandlingRwf} onChange={(value) => setPricing((current) => ({ ...current, carefulHandlingRwf: value }))} />
          </SurchargeCard>
          <SurchargeCard title="Waiting time" enabled={pricing.waitingTimeChargeEnabled} onToggle={(checked) => setPricing((current) => ({ ...current, waitingTimeChargeEnabled: checked }))}>
            <NumberField label="Grace minutes" value={pricing.waitingGraceMinutes} onChange={(value) => setPricing((current) => ({ ...current, waitingGraceMinutes: value }))} />
            <NumberField label="RWF per minute" value={pricing.waitingPerMinuteRwf} onChange={(value) => setPricing((current) => ({ ...current, waitingPerMinuteRwf: value }))} />
          </SurchargeCard>
          <SurchargeCard title="Scheduled pickup" enabled={pricing.scheduledSurchargeEnabled} onToggle={(checked) => setPricing((current) => ({ ...current, scheduledSurchargeEnabled: checked }))}>
            <NumberField label="Charge (RWF)" value={pricing.scheduledSurchargeRwf} onChange={(value) => setPricing((current) => ({ ...current, scheduledSurchargeRwf: value }))} />
          </SurchargeCard>
        </div>
        <SaveButton pending={pending}>Save pricing</SaveButton>
      </form>

      <div className="parcel-config-panels">
        <details open>
          <summary>Parcel sizes <span>{sizes.length}</span></summary>
          <form onSubmit={saveSize} className="parcel-compact-editor">
            <EditorPicker label="Edit size" items={sizes.map((item) => ({ id: item.id, label: item.name }))} value={size.id ?? "new"} onChange={(id) => setSize(id === "new" ? emptySize() : { ...sizes.find((item) => item.id === id)! })} />
            <div className="parcel-settings-fields">
              <TextField label="Code" value={size.code} onChange={(value) => setSize((current) => ({ ...current, code: value.toUpperCase().replace(/[^A-Z0-9_]/g, "") }))} />
              <TextField label="Name" value={size.name} onChange={(value) => setSize((current) => ({ ...current, name: value }))} />
              <NumberField label="Maximum weight (kg)" step="0.1" min={0.1} value={size.maxWeightKg} onChange={(value) => setSize((current) => ({ ...current, maxWeightKg: value }))} />
              <NumberField label="Maximum length (cm)" step="0.1" min={0.1} value={size.maxLengthCm} onChange={(value) => setSize((current) => ({ ...current, maxLengthCm: value }))} />
              <NumberField label="Maximum width (cm)" step="0.1" min={0.1} value={size.maxWidthCm} onChange={(value) => setSize((current) => ({ ...current, maxWidthCm: value }))} />
              <NumberField label="Maximum height (cm)" step="0.1" min={0.1} value={size.maxHeightCm} onChange={(value) => setSize((current) => ({ ...current, maxHeightCm: value }))} />
              <NumberField label="Size charge (RWF)" value={size.surchargeRwf} onChange={(value) => setSize((current) => ({ ...current, surchargeRwf: value }))} />
              <NumberField label="Display order" value={size.sortOrder} onChange={(value) => setSize((current) => ({ ...current, sortOrder: value }))} />
            </div>
            <TextAreaField label="Description" value={size.description ?? ""} onChange={(value) => setSize((current) => ({ ...current, description: value }))} />
            <TextField label="Examples (comma separated)" value={size.examples.join(", ")} onChange={(value) => setSize((current) => ({ ...current, examples: value.split(",").map((item) => item.trim()).filter(Boolean) }))} />
            <EditorFooter active={size.isActive} onActiveChange={(isActive) => setSize((current) => ({ ...current, isActive }))} pending={pending} />
          </form>
        </details>

        <details>
          <summary>Vehicle capacities <span>{capacities.length}</span></summary>
          <form onSubmit={saveCapacity} className="parcel-compact-editor">
            <EditorPicker label="Edit vehicle" items={capacities.map((item) => ({ id: item.id, label: item.vehicleType }))} value={capacity.id ?? "new"} onChange={(id) => setCapacity(id === "new" ? emptyCapacity() : { ...capacities.find((item) => item.id === id)! })} />
            <div className="parcel-settings-fields">
              <TextField label="Vehicle type" value={capacity.vehicleType} onChange={(value) => setCapacity((current) => ({ ...current, vehicleType: value.toUpperCase().replace(/[^A-Z0-9_]/g, "") }))} />
              <NumberField label="Maximum weight (kg)" step="0.1" min={0.1} value={capacity.maxWeightKg} onChange={(value) => setCapacity((current) => ({ ...current, maxWeightKg: value }))} />
              <NumberField label="Maximum length (cm)" step="0.1" min={0.1} value={capacity.maxLengthCm} onChange={(value) => setCapacity((current) => ({ ...current, maxLengthCm: value }))} />
              <NumberField label="Maximum width (cm)" step="0.1" min={0.1} value={capacity.maxWidthCm} onChange={(value) => setCapacity((current) => ({ ...current, maxWidthCm: value }))} />
              <NumberField label="Maximum height (cm)" step="0.1" min={0.1} value={capacity.maxHeightCm} onChange={(value) => setCapacity((current) => ({ ...current, maxHeightCm: value }))} />
            </div>
            <EditorFooter active={capacity.isActive} onActiveChange={(isActive) => setCapacity((current) => ({ ...current, isActive }))} pending={pending} />
          </form>
        </details>

        <details>
          <summary>Parcel categories <span>{categories.length}</span></summary>
          <form onSubmit={saveCategory} className="parcel-compact-editor">
            <EditorPicker label="Edit category" items={categories.map((item) => ({ id: item.id, label: item.name }))} value={category.id ?? "new"} onChange={(id) => setCategory(id === "new" ? emptyCategory() : { ...categories.find((item) => item.id === id)! })} />
            <div className="parcel-settings-fields">
              <TextField label="Name" value={category.name} onChange={(value) => setCategory((current) => ({ ...current, name: value }))} />
              <TextField label="Slug" value={category.slug} onChange={(value) => setCategory((current) => ({ ...current, slug: value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") }))} />
              <NumberField label="Display order" value={category.sortOrder} onChange={(value) => setCategory((current) => ({ ...current, sortOrder: value }))} />
            </div>
            <TextAreaField label="Description" value={category.description ?? ""} onChange={(value) => setCategory((current) => ({ ...current, description: value }))} />
            <EditorFooter active={category.isActive} onActiveChange={(isActive) => setCategory((current) => ({ ...current, isActive }))} pending={pending} />
          </form>
        </details>

        <details>
          <summary>Prohibited-item rules <span>{prohibitedRules.length}</span></summary>
          <form onSubmit={saveRule} className="parcel-compact-editor">
            <EditorPicker label="Edit rule" items={prohibitedRules.map((item) => ({ id: item.id, label: item.title }))} value={rule.id ?? "new"} onChange={(id) => setRule(id === "new" ? emptyRule() : { ...prohibitedRules.find((item) => item.id === id)! })} />
            <div className="parcel-settings-fields">
              <TextField label="Rule title" value={rule.title} onChange={(value) => setRule((current) => ({ ...current, title: value }))} />
              <NumberField label="Display order" value={rule.sortOrder} onChange={(value) => setRule((current) => ({ ...current, sortOrder: value }))} />
            </div>
            <TextAreaField label="Description" value={rule.description ?? ""} onChange={(value) => setRule((current) => ({ ...current, description: value }))} />
            <EditorFooter active={rule.isActive} onActiveChange={(isActive) => setRule((current) => ({ ...current, isActive }))} pending={pending} />
          </form>
        </details>
      </div>
    </section>
  );
}

function mergeById<T extends { id: string }>(items: T[], saved: T) {
  const exists = items.some((item) => item.id === saved.id);
  return exists
    ? items.map((item) => (item.id === saved.id ? saved : item))
    : [...items, saved];
}

function EditorPicker({ label, items, value, onChange }: { label: string; items: { id: string; label: string }[]; value: string; onChange: (id: string) => void }) {
  return <label className="parcel-field">{label}<select value={value} onChange={(event) => onChange(event.target.value)}><option value="new">+ Add new</option>{items.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>;
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="parcel-field">{label}<input required value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function TextAreaField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="parcel-field parcel-wide">{label}<textarea value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function NumberField({ label, value, onChange, min = 0, step = "1" }: { label: string; value: number; onChange: (value: number) => void; min?: number; step?: string }) {
  return <label className="parcel-field">{label}<input type="number" min={min} step={step} required value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="parcel-toggle"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><span>{label}</span></label>;
}

function SurchargeCard({ title, enabled, onToggle, children }: { title: string; enabled: boolean; onToggle: (checked: boolean) => void; children: ReactNode }) {
  return <fieldset className={enabled ? "enabled" : ""}><Toggle label={title} checked={enabled} onChange={onToggle} /><div className="parcel-surcharge-fields">{children}</div></fieldset>;
}

function SaveButton({ pending, children }: { pending: boolean; children: ReactNode }) {
  return <button className="parcel-settings-save" type="submit" disabled={pending}>{pending ? <LoaderCircle className="spin" /> : <Save />}{children}</button>;
}

function EditorFooter({ active, onActiveChange, pending }: { active: boolean; onActiveChange: (active: boolean) => void; pending: boolean }) {
  return <div className="parcel-editor-footer"><Toggle label="Active" checked={active} onChange={onActiveChange} /><button type="submit" disabled={pending}>{pending ? <LoaderCircle className="spin" /> : <Save />} Save</button></div>;
}

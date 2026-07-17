import crypto from "crypto";

type CloudinaryUploadResult = {
  secure_url: string;
  public_id: string;
  resource_type: string;
  bytes?: number;
  width?: number;
  height?: number;
  format?: string;
};

export type CloudinaryUpload = {
  url: string;
  publicId: string;
  resourceType: string;
  bytes?: number;
  width?: number;
  height?: number;
  format?: string;
};

function requiredCloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Cloudinary is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.",
    );
  }
  return { cloudName, apiKey, apiSecret };
}

function sign(params: Record<string, string | number>, apiSecret: string) {
  const payload = Object.entries(params)
    .filter(([, value]) => value !== "" && value !== undefined && value !== null)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  return crypto.createHash("sha1").update(`${payload}${apiSecret}`).digest("hex");
}

export function cloudinaryFolder(purpose: string) {
  const root = process.env.CLOUDINARY_UPLOAD_FOLDER || "karame-bay";
  return `${root}/${purpose}`.replaceAll(/\/+/g, "/");
}

export async function uploadImageToCloudinary(
  bytes: Uint8Array,
  filename: string,
  purpose: string,
): Promise<CloudinaryUpload> {
  const { cloudName, apiKey, apiSecret } = requiredCloudinaryConfig();
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = cloudinaryFolder(purpose);
  const signature = sign({ folder, timestamp }, apiSecret);
  const body = new FormData();
  const fileBytes = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  body.append("file", new Blob([fileBytes]), filename);
  body.append("api_key", apiKey);
  body.append("timestamp", String(timestamp));
  body.append("folder", folder);
  body.append("signature", signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: "POST", body },
  );
  const data = (await response.json().catch(() => null)) as
    | (Partial<CloudinaryUploadResult> & { error?: { message?: string } })
    | null;
  if (!response.ok || !data?.secure_url || !data.public_id) {
    throw new Error(data?.error?.message || "Cloudinary upload failed.");
  }
  return {
    url: data.secure_url,
    publicId: data.public_id,
    resourceType: data.resource_type ?? "image",
    bytes: data.bytes,
    width: data.width,
    height: data.height,
    format: data.format,
  };
}

export async function deleteCloudinaryAsset(
  publicId: string,
  resourceType = "image",
) {
  const { cloudName, apiKey, apiSecret } = requiredCloudinaryConfig();
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = sign({ public_id: publicId, timestamp }, apiSecret);
  const body = new FormData();
  body.append("public_id", publicId);
  body.append("api_key", apiKey);
  body.append("timestamp", String(timestamp));
  body.append("signature", signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/destroy`,
    { method: "POST", body },
  );
  const data = (await response.json().catch(() => null)) as
    | { result?: string; error?: { message?: string } }
    | null;
  if (!response.ok || data?.error) {
    throw new Error(data?.error?.message || "Cloudinary delete failed.");
  }
  return data?.result ?? "ok";
}

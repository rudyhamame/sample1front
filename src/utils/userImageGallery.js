import { apiUrl } from "../config/api";
import compressImageUpload, { canCompressImageUpload } from "./compressImageUpload";

const DEFAULT_MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export const deriveCloudinaryPublicIdFromUrl = (value) => {
  const rawUrl = String(value || "").trim();
  if (!rawUrl) {
    return "";
  }

  try {
    const parsedUrl = new URL(rawUrl);
    const pathSegments = parsedUrl.pathname
      .split("/")
      .map((segment) => String(segment || "").trim())
      .filter(Boolean);
    const uploadIndex = pathSegments.findIndex((segment) => segment === "upload");

    if (uploadIndex === -1) {
      return "";
    }

    const publicIdSegments = pathSegments
      .slice(uploadIndex + 1)
      .filter((segment) => !/^v\d+$/i.test(segment));

    if (publicIdSegments.length === 0) {
      return "";
    }

    const lastSegment = publicIdSegments[publicIdSegments.length - 1];
    publicIdSegments[publicIdSegments.length - 1] = lastSegment.replace(
      /\.[^.]+$/,
      "",
    );

    return publicIdSegments.join("/");
  } catch {
    return "";
  }
};

const sanitizeFileNameStem = (value, fallback = "image") =>
  String(value || "")
    .trim()
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9/_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || fallback;

const findSavedMediaInPayload = (payload = {}, publicId = "") => {
  const normalizedPublicId = String(publicId || "").trim();
  const gallery = Array.isArray(payload?.imageGallery) ? payload.imageGallery : [];

  if (!normalizedPublicId) {
    return gallery[0] || null;
  }

  return (
    gallery.find(
      (item) => String(item?.publicId || "").trim() === normalizedPublicId,
    ) || null
  );
};

const saveImageRecordToGallery = async ({
  token,
  url,
  publicId,
  assetId = "",
  contentHash = "",
  folder = "",
  resourceType = "image",
  mimeType = "",
  width = 0,
  height = 0,
  format = "",
  bytes = 0,
  duration = 0,
  visibility = "public",
  createdAt = new Date().toISOString(),
}) => {
  const response = await fetch(apiUrl("/api/user/image-gallery"), {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      publicId,
      assetId,
      contentHash,
      folder,
      resourceType,
      mimeType,
      width,
      height,
      format,
      bytes,
      duration,
      visibility,
      createdAt,
    }),
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload?.message || "Unable to save image to gallery.");
  }

  return {
    payload,
    media:
      findSavedMediaInPayload(payload, publicId || deriveCloudinaryPublicIdFromUrl(url)) ||
      null,
  };
};

export const uploadImageFileToUserGallery = async ({
  token,
  file,
  visibility = "public",
  onStatus = null,
  maxBytes = DEFAULT_MAX_IMAGE_BYTES,
}) => {
  if (!token) {
    throw new Error("A valid login token is required.");
  }

  if (!file) {
    throw new Error("An image file is required.");
  }

  const mimeType = String(file?.type || "").trim().toLowerCase();
  if (!mimeType.startsWith("image/")) {
    throw new Error("Only image attachments are supported right now.");
  }

  let fileToUpload = file;
  let currentMimeType = mimeType;

  if (canCompressImageUpload(fileToUpload) && Number(fileToUpload.size || 0) >= maxBytes) {
    onStatus?.(
      `Large image detected (${(fileToUpload.size / 1024 / 1024).toFixed(2)}MB), compressing before upload...`,
    );
    const compressedImage = await compressImageUpload(fileToUpload, {
      maxBytes,
    });
    if (compressedImage !== fileToUpload) {
      fileToUpload = compressedImage;
      currentMimeType = String(compressedImage?.type || currentMimeType).trim();
      onStatus?.(
        `Compressed image size: ${(fileToUpload.size / 1024 / 1024).toFixed(2)}MB.`,
      );
    }
  }

  const signatureResponse = await fetch(apiUrl("/api/user/image-gallery/signature"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      publicId: sanitizeFileNameStem(fileToUpload?.name, `chat-image-${Date.now()}`),
      resourceType: "image",
    }),
  });
  const signaturePayload = await signatureResponse.json().catch(() => ({}));

  if (!signatureResponse.ok) {
    throw new Error(signaturePayload?.message || "Unable to prepare image upload.");
  }

  const cloudinaryBody = new FormData();
  cloudinaryBody.append("file", fileToUpload);
  cloudinaryBody.append("api_key", signaturePayload.apiKey);
  cloudinaryBody.append("timestamp", String(signaturePayload.timestamp));
  cloudinaryBody.append("signature", signaturePayload.signature);
  cloudinaryBody.append("folder", signaturePayload.folder);
  cloudinaryBody.append("public_id", signaturePayload.publicId);

  const uploadResponse = await fetch(signaturePayload.uploadUrl, {
    method: "POST",
    body: cloudinaryBody,
  });
  const uploadPayload = await uploadResponse.json().catch(() => ({}));

  if (!uploadResponse.ok) {
    throw new Error(
      uploadPayload?.error?.message || "Image upload failed.",
    );
  }

  return saveImageRecordToGallery({
    token,
    url: uploadPayload.secure_url,
    publicId: uploadPayload.public_id,
    assetId: uploadPayload.asset_id,
    contentHash: uploadPayload.etag,
    folder: uploadPayload.folder,
    resourceType: uploadPayload.resource_type || "image",
    mimeType: currentMimeType,
    width: uploadPayload.width,
    height: uploadPayload.height,
    format: uploadPayload.format,
    bytes: uploadPayload.bytes,
    duration: uploadPayload.duration,
    visibility,
    createdAt: new Date().toISOString(),
  });
};

export const saveRemoteImageToUserGallery = async ({
  token,
  url,
  visibility = "public",
  mimeType = "image/jpeg",
}) => {
  const normalizedUrl = String(url || "").trim();
  if (!token) {
    throw new Error("A valid login token is required.");
  }
  if (!normalizedUrl) {
    throw new Error("A valid image URL is required.");
  }

  const derivedPublicId = deriveCloudinaryPublicIdFromUrl(normalizedUrl);

  return saveImageRecordToGallery({
    token,
    url: normalizedUrl,
    publicId: derivedPublicId,
    mimeType,
    resourceType: "image",
    visibility,
    createdAt: new Date().toISOString(),
  });
};

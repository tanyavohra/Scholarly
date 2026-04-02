export const CLOUDINARY_CLOUD_NAME =
  import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "dlfoqfpp3";

export const CLOUDINARY_UNSIGNED_UPLOAD_PRESET =
  import.meta.env.VITE_CLOUDINARY_UNSIGNED_UPLOAD_PRESET || "Scholarly";

export async function uploadToCloudinary(file, { folder, publicId, resourceType } = {}) {
  if (!file) throw new Error("No file provided");

  const rt = String(resourceType || "raw").toLowerCase();
  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${rt}/upload`;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UNSIGNED_UPLOAD_PRESET);

  if (folder) formData.append("folder", folder);
  if (publicId) formData.append("public_id", String(publicId).replace(/\.[^/.]+$/, ""));

  const res = await fetch(endpoint, { method: "POST", body: formData });
  if (!res.ok) throw new Error("Upload failed");
  const data = await res.json();
  if (!data?.secure_url) throw new Error("Upload failed");
  return data.secure_url;
}


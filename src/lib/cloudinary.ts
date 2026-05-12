import { v2 as cloudinary } from "cloudinary";

export function configureCloudinary() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return false;
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
  return true;
}

export async function uploadBufferToCloudinary(
  buffer: Buffer,
  folder: string,
  publicIdPrefix: string,
): Promise<{ secure_url: string; public_id: string }> {
  const ok = configureCloudinary();
  if (!ok) {
    throw new Error("Cloudinary belum dikonfigurasi. Isi env Cloudinary.");
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: `${publicIdPrefix}-${Date.now()}`,
        resource_type: "image",
        overwrite: false,
        quality: "auto:good",
        fetch_format: "auto",
        flags: "progressive",
      },
      (err, result) => {
        if (err || !result) {
          reject(err ?? new Error("Upload gagal"));
          return;
        }
        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id,
        });
      },
    );
    uploadStream.end(buffer);
  });
}

import { requireSupabase } from "@/data/supabase/client";

export const PAYMENT_QR_BUCKET = "payment-qr";
export const MAX_PAYMENT_QR_BYTES = 2 * 1024 * 1024;

const allowedTypes = ["image/png", "image/jpeg"];

export type PaymentQrState = {
  payment_qr_path: string | null;
  payment_qr_label: string | null;
};

export function validatePaymentQrFile(file: File) {
  if (!allowedTypes.includes(file.type)) {
    throw new Error("Choose a PNG or JPEG image.");
  }
  if (file.size > MAX_PAYMENT_QR_BYTES) {
    throw new Error("Choose an image under 2 MB.");
  }
}

const MAX_DIMENSION = 2400;

/** Re-encode through a canvas so EXIF and other metadata never reach storage. */
async function preparePaymentQrFile(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);

  try {
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) throw new Error("This browser cannot process the image.");

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => {
        if (result) resolve(result);
        else reject(new Error("Could not process the image."));
      }, "image/png");
    });

    if (blob.size > MAX_PAYMENT_QR_BYTES) {
      throw new Error("Choose a simpler image under 2 MB.");
    }

    return new File([blob], "payment-qr.png", { type: "image/png" });
  } finally {
    bitmap.close();
  }
}

export async function uploadPaymentQr(input: {
  groupId: string;
  adultId: string;
  file: File;
  label: string;
  previousPath: string | null;
}): Promise<PaymentQrState> {
  validatePaymentQrFile(input.file);

  let prepared: File;
  try {
    prepared = await preparePaymentQrFile(input.file);
  } catch {
    throw new Error("Could not read that image. Choose a PNG or JPEG.");
  }

  const client = requireSupabase();
  const path = `${input.groupId}/${input.adultId}/${Date.now()}.png`;

  const { error: uploadError } = await client.storage
    .from(PAYMENT_QR_BUCKET)
    .upload(path, prepared, {
      contentType: prepared.type,
      cacheControl: "3600",
      upsert: false
    });
  if (uploadError) throw uploadError;

  const { data, error } = await client.rpc("set_payment_qr", {
    p_adult_id: input.adultId,
    p_path: path,
    p_label: input.label.trim() || null
  });

  if (error) {
    await client.storage.from(PAYMENT_QR_BUCKET).remove([path]);
    throw error;
  }

  if (input.previousPath && input.previousPath !== path) {
    await client.storage.from(PAYMENT_QR_BUCKET).remove([input.previousPath]);
  }

  return data as PaymentQrState;
}

export async function clearPaymentQr(
  adultId: string,
  path: string | null
): Promise<PaymentQrState> {
  const client = requireSupabase();
  const { data, error } = await client.rpc("clear_payment_qr", {
    p_adult_id: adultId
  });

  if (error) throw error;

  if (path) {
    await client.storage.from(PAYMENT_QR_BUCKET).remove([path]);
  }

  return data as PaymentQrState;
}

export async function getPaymentQrUrl(path: string): Promise<string> {
  const { data, error } = await requireSupabase()
    .storage.from(PAYMENT_QR_BUCKET)
    .createSignedUrl(path, 300);

  if (error) throw error;
  return data.signedUrl;
}

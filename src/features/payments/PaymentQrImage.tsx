import { usePaymentQrUrl } from "./usePaymentQrUrl";

export function PaymentQrImage({
  path,
  name,
  compact = false
}: {
  path: string;
  name: string;
  compact?: boolean;
}) {
  const { data: url, isLoading, error } = usePaymentQrUrl(path);

  if (isLoading) {
    return <div className="qr-placeholder">Loading QR…</div>;
  }

  if (error || !url) {
    return (
      <p className="form-error" role="alert">
        Could not load the payment QR.
      </p>
    );
  }

  return (
    <img
      className={`qr-image${compact ? " qr-image--compact" : ""}`}
      src={url}
      alt={`Payment QR for ${name}`}
    />
  );
}

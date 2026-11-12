import { formatPeso } from "@/domain/money/format";

export type ShareSlice = {
  id: string;
  name: string;
  amountCentavos: number;
};

const tones = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export function ShareBand({
  slices,
  youId,
  label
}: {
  slices: ShareSlice[];
  youId?: string | null;
  label: string;
}) {
  const parts = slices.filter((slice) => slice.amountCentavos > 0);
  const total = parts.reduce((sum, slice) => sum + slice.amountCentavos, 0);
  if (total <= 0) return null;

  return (
    <div className="split">
      {label ? <span className="split-caption">{label}</span> : null}
      <div className="split-band" aria-hidden="true">
        {parts.map((slice, index) => {
          const isYou = Boolean(youId && slice.id === youId);
          const tone = tones[index % tones.length];
          return (
            <span
              key={slice.id}
              className={`split-seg${isYou ? " is-you" : ""}`}
              data-tone={isYou ? undefined : tone}
              style={{ flexGrow: slice.amountCentavos, flexBasis: 0, minWidth: 3 }}
            />
          );
        })}
      </div>
      <div className="split-legend">
        {parts.map((slice, index) => {
          const isYou = Boolean(youId && slice.id === youId);
          return (
            <span className="split-item" key={slice.id}>
              <span
                className={`split-dot${isYou ? " is-you" : ""}`}
                data-tone={isYou ? undefined : tones[index % tones.length]}
              />
              {isYou ? "You" : slice.name}
              <span className="split-value">{formatPeso(slice.amountCentavos)}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

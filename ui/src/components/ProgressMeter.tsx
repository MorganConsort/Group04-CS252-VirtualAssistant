export function Meter({ value }: { value: number }) {
  return (
    <div
      className="meter"
      role="progressbar"
      aria-label="Verified progress"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
    >
      <span style={{ width: `${value}%` }} />
    </div>
  );
}

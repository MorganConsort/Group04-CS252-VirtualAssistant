import type { ReactNode } from "react";
export function Button({
  children,
  onClick,
  primary = false,
  disabled = false,
}: {
  children: ReactNode;
  onClick: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={primary ? "button primary" : "button"}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

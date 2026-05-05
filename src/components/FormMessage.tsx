type FormMessageProps = {
  message?: string;
  tone?: "error" | "info";
};

export function FormMessage({ message, tone = "error" }: FormMessageProps) {
  if (!message) {
    return null;
  }

  const classes =
    tone === "error"
      ? "border-red-200 bg-red-50 text-red-900"
      : "border-amber-200 bg-amber-50 text-amber-950";

  return (
    <div className={`rounded-lg border px-4 py-3 text-sm font-semibold leading-6 ${classes}`}>
      {message}
    </div>
  );
}

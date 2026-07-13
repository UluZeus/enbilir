"use client";

import { useId, useState } from "react";

type PasswordFieldProps = {
  label: string;
  locale: "tr" | "en";
  name?: string;
  autoComplete: "current-password" | "new-password";
  minLength?: number;
  hint?: string;
};

export function PasswordField({ label, locale, name = "password", autoComplete, minLength, hint }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const inputId = useId();
  const hintId = useId();

  return (
    <label htmlFor={inputId} className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <span className="relative block">
        <input
          id={inputId}
          name={name}
          type={visible ? "text" : "password"}
          required
          minLength={minLength}
          autoComplete={autoComplete}
          aria-describedby={hint ? hintId : undefined}
          className="w-full rounded-md border border-slate-300 px-4 py-3 pr-24 font-normal outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-emerald-100"
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-pressed={visible}
          className="absolute inset-y-1.5 right-1.5 rounded-md px-3 text-xs font-black text-[#0f766e] hover:bg-emerald-50"
        >
          {visible ? (locale === "tr" ? "Gizle" : "Hide") : (locale === "tr" ? "Göster" : "Show")}
        </button>
      </span>
      {hint ? <span id={hintId} className="text-xs font-medium leading-5 text-slate-500">{hint}</span> : null}
    </label>
  );
}

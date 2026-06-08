"use client";
import { useState } from "react";
import { copyText } from "@/lib/client";

export function Card({
  title,
  step,
  children,
  done,
  disabled,
}: {
  title: string;
  step?: number;
  children: React.ReactNode;
  done?: boolean;
  disabled?: boolean;
}) {
  return (
    <section
      style={{
        background: "var(--panel)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        padding: 20,
        marginBottom: 18,
        opacity: disabled ? 0.45 : 1,
        pointerEvents: disabled ? "none" : "auto",
      }}
    >
      <h2 style={{ margin: "0 0 14px", fontSize: 17, display: "flex", alignItems: "center", gap: 10 }}>
        {step !== undefined && (
          <span
            style={{
              background: done ? "#2e7d32" : "var(--accent)",
              color: "#fff",
              width: 26,
              height: 26,
              borderRadius: "50%",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {done ? "✓" : step}
          </span>
        )}
        {title}
      </h2>
      {children}
    </section>
  );
}

export function Button({
  children,
  onClick,
  disabled,
  variant = "primary",
  small,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "ghost" | "accent2";
  small?: boolean;
}) {
  const bg =
    variant === "primary" ? "var(--accent)" : variant === "accent2" ? "var(--accent-2)" : "transparent";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: bg,
        color: variant === "ghost" ? "var(--muted)" : "#fff",
        border: variant === "ghost" ? "1px solid var(--border)" : "none",
        borderRadius: 9,
        padding: small ? "6px 12px" : "10px 18px",
        fontSize: small ? 13 : 14,
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
}

export function ModeToggle({
  mode,
  onChange,
}: {
  mode: "auto" | "manual";
  onChange: (m: "auto" | "manual") => void;
}) {
  return (
    <div style={{ display: "inline-flex", background: "var(--panel-2)", borderRadius: 8, padding: 3, gap: 3 }}>
      {(["auto", "manual"] as const).map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          style={{
            background: mode === m ? "var(--accent-2)" : "transparent",
            color: mode === m ? "#fff" : "var(--muted)",
            border: "none",
            borderRadius: 6,
            padding: "6px 14px",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {m === "auto" ? "⚡ 자동 (API)" : "✋ 수동 (프롬프트)"}
        </button>
      ))}
    </div>
  );
}

export function CopyBox({ text, label, rows = 8 }: { text: string; label?: string; rows?: number }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ marginTop: 10 }}>
      {label && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span style={{ fontSize: 13, color: "var(--muted)" }}>{label}</span>
          <Button
            small
            variant="ghost"
            onClick={async () => {
              await copyText(text);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? "✓ 복사됨" : "📋 복사"}
          </Button>
        </div>
      )}
      <textarea
        readOnly
        value={text}
        rows={rows}
        style={{
          width: "100%",
          background: "var(--panel-2)",
          color: "var(--foreground)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: 12,
          fontSize: 12.5,
          fontFamily: "ui-monospace, Menlo, Consolas, monospace",
          lineHeight: 1.6,
          resize: "vertical",
        }}
      />
    </div>
  );
}

export function TextArea({
  value,
  onChange,
  placeholder,
  rows = 8,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      style={{
        width: "100%",
        background: "var(--panel-2)",
        color: "var(--foreground)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: 12,
        fontSize: 13,
        lineHeight: 1.6,
        resize: "vertical",
        marginTop: 8,
      }}
    />
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <span style={{ color: "var(--accent-2)", fontSize: 13 }}>
      ⏳ {label || "생성 중…"}
    </span>
  );
}

export function ErrorMsg({ msg }: { msg: string }) {
  return (
    <div
      style={{
        background: "#3a1f24",
        border: "1px solid #6b2b34",
        color: "#ffb4bd",
        borderRadius: 8,
        padding: "10px 12px",
        fontSize: 13,
        marginTop: 10,
      }}
    >
      ⚠️ {msg}
    </div>
  );
}

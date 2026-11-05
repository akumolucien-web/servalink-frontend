import { useId, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { getLang, translate } from "../../i18n/core";
import { useT } from "../../i18n/I18nProvider";

interface FieldShellProps {
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  className?: string;
}

function Shell({ id, label, hint, error, optional, className, children }: FieldShellProps & { id: string; children: ReactNode }) {
  const t = useT();
  return (
    <div className={["field", className].filter(Boolean).join(" ")}>
      <label htmlFor={id}>{label}{optional && <span className="optional"> {t("common.optional")}</span>}</label>
      {children}
      {hint && !error && <p className="field-hint" id={`${id}-hint`}>{hint}</p>}
      {error && <p className="field-error" id={`${id}-error`} role="alert"><AlertCircle size={14} aria-hidden="true" />{error}</p>}
    </div>
  );
}

const describe = (id: string, hint?: string, error?: string) =>
  error ? `${id}-error` : hint ? `${id}-hint` : undefined;

export function TextField({ label, hint, error, optional, className, ...rest }: FieldShellProps & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <Shell id={id} {...{ label, hint, error, optional, className }}>
      <input id={id} className="input" aria-invalid={!!error || undefined} aria-describedby={describe(id, hint, error)} {...rest} />
    </Shell>
  );
}

export function PasswordField({ label, hint, error, className, ...rest }: FieldShellProps & Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const t = useT();
  return (
    <Shell id={id} {...{ label, hint, error, className }}>
      <div className="input-wrap">
        <input id={id} className="input" type={visible ? "text" : "password"} aria-invalid={!!error || undefined}
          aria-describedby={describe(id, hint, error)} {...rest} />
        <button type="button" onClick={() => setVisible((v) => !v)} aria-label={visible ? t("common.hidePassword") : t("common.showPassword")}>
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </Shell>
  );
}

export function SelectField({ label, hint, error, optional, className, children, ...rest }: FieldShellProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <Shell id={id} {...{ label, hint, error, optional, className }}>
      <select id={id} className="select" aria-invalid={!!error || undefined} aria-describedby={describe(id, hint, error)} {...rest}>{children}</select>
    </Shell>
  );
}

export function TextAreaField({ label, hint, error, optional, className, ...rest }: FieldShellProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <Shell id={id} {...{ label, hint, error, optional, className }}>
      <textarea id={id} className="textarea" aria-invalid={!!error || undefined} aria-describedby={describe(id, hint, error)} {...rest} />
    </Shell>
  );
}

/** Tiny validation helper: returns the first message per field, or an empty object when valid. */
export type Errors<T extends string> = Partial<Record<T, string>>;
export const hasErrors = (errors: object) => Object.keys(errors).length > 0;
export const isEmail = (value: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value.trim());
export const passwordProblem = (value: string): string | undefined =>
  value.length < 8 || !/[a-z]/.test(value) || !/[A-Z]/.test(value) || !/\d/.test(value)
    ? translate(getLang(), "auth.passwordWeak")
    : undefined;

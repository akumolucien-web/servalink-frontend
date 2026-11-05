import { useId, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { AlertCircle, Eye, EyeOff, Lock } from "lucide-react";
import { useT } from "../../i18n/I18nProvider";

interface AuthInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "children"> {
  /** Accessible name. Shown as the placeholder too, as in the design, but always a real <label> for screen readers. */
  label: string;
  icon: ReactNode;
  error?: string;
  hint?: string;
  right?: ReactNode;
}

/** Icon-led, rounded input used on every authentication screen. */
export function AuthInput({ label, icon, error, hint, right, placeholder, className, ...rest }: AuthInputProps) {
  const id = useId();
  const described = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={["afield", className].filter(Boolean).join(" ")}>
      <label htmlFor={id} className="sr-only">{label}</label>
      <div className={`afield-box${error ? " invalid" : ""}`}>
        <span className="afield-icon" aria-hidden="true">{icon}</span>
        <input id={id} className="afield-input" placeholder={placeholder ?? label} aria-invalid={!!error || undefined}
          aria-describedby={described} {...rest} />
        {right}
      </div>
      {hint && !error && <p className="afield-hint" id={`${id}-hint`}>{hint}</p>}
      {error && <p className="afield-error" id={`${id}-error`} role="alert"><AlertCircle size={14} aria-hidden="true" />{error}</p>}
    </div>
  );
}

export function AuthPasswordInput({ label, icon, ...rest }: Omit<AuthInputProps, "type" | "right" | "icon"> & { icon?: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const t = useT();
  return (
    <AuthInput label={label} icon={icon ?? <Lock size={19} />} type={visible ? "text" : "password"} {...rest}
      right={
        <button type="button" className="afield-toggle" onClick={() => setVisible((v) => !v)}
          aria-label={visible ? t("common.hidePassword") : t("common.showPassword")} aria-pressed={visible}>
          {visible ? <EyeOff size={19} /> : <Eye size={19} />}
        </button>
      } />
  );
}

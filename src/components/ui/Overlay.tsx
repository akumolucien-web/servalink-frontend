import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { CheckCircle2, CircleAlert, X } from "lucide-react";
import { useT } from "../../i18n/I18nProvider";
import { Button } from "./Button";

/* ---------------- Modal (native <dialog>: focus trap, Esc and backdrop built in) ---------------- */

export function Modal({ open, title, onClose, children, footer, wide }: {
  open: boolean; title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean;
}) {
  const t = useT();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    <dialog ref={ref} className={wide ? "modal wide" : "modal"} aria-labelledby="modal-title"
      onClose={onClose} onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (event.target === ref.current) onClose(); }}>
      {open && (
        <>
          <div className="modal-head">
            <h3 id="modal-title">{title}</h3>
            <button className="icon-btn" style={{ width: 32, height: 32, border: 0 }} onClick={onClose} aria-label={t("common.close")}><X size={18} /></button>
          </div>
          {children}
          {footer && <div className="modal-foot">{footer}</div>}
        </>
      )}
    </dialog>
  );
}

/* ---------------- Confirm dialog ---------------- */

interface ConfirmOptions {
  title: string;
  message: ReactNode;
  confirmLabel: string;
  tone?: "primary" | "danger";
}
type Confirm = (options: ConfirmOptions) => Promise<boolean>;
const ConfirmContext = createContext<Confirm | null>(null);

export function useConfirm(): Confirm {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error("useConfirm must be used inside OverlayProvider");
  return confirm;
}

/* ---------------- Toasts ---------------- */

interface ToastItem { id: number; tone: "success" | "error"; message: string }
interface Toasts { success: (message: string) => void; error: (message: string) => void }
const ToastContext = createContext<Toasts | null>(null);

export function useToast(): Toasts {
  const toasts = useContext(ToastContext);
  if (!toasts) throw new Error("useToast must be used inside OverlayProvider");
  return toasts;
}

export function OverlayProvider({ children }: { children: ReactNode }) {
  const t = useT();
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [pending, setPending] = useState<(ConfirmOptions & { resolve: (value: boolean) => void }) | null>(null);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((items) => items.filter((t) => t.id !== id)), []);
  const push = useCallback((tone: ToastItem["tone"], message: string) => {
    const id = nextId.current++;
    setToasts((items) => [...items.slice(-3), { id, tone, message }]);
    window.setTimeout(() => dismiss(id), tone === "error" ? 7000 : 4500);
  }, [dismiss]);

  const toastApi = useRef<Toasts>({ success: (m) => push("success", m), error: (m) => push("error", m) });
  toastApi.current = { success: (m) => push("success", m), error: (m) => push("error", m) };
  const [stableToasts] = useState<Toasts>(() => ({
    success: (m) => toastApi.current.success(m), error: (m) => toastApi.current.error(m),
  }));

  const confirm = useCallback<Confirm>((options) => new Promise((resolve) => setPending({ ...options, resolve })), []);
  const settle = (value: boolean) => { pending?.resolve(value); setPending(null); };

  return (
    <ToastContext.Provider value={stableToasts}>
      <ConfirmContext.Provider value={confirm}>
        {children}
        <Modal open={!!pending} title={pending?.title ?? ""} onClose={() => settle(false)}
          footer={<>
            <Button variant="ghost" onClick={() => settle(false)}>{t("common.cancel")}</Button>
            <Button variant={pending?.tone === "danger" ? "danger" : "primary"} onClick={() => settle(true)} autoFocus>{pending?.confirmLabel}</Button>
          </>}>
          <div className="modal-body">{pending?.message}</div>
        </Modal>
        <div className="toasts" aria-live="polite">
          {toasts.map((toast) => (
            <div key={toast.id} className={`toast ${toast.tone}`} role={toast.tone === "error" ? "alert" : "status"}>
              {toast.tone === "success" ? <CheckCircle2 size={18} /> : <CircleAlert size={18} />}
              <span>{toast.message}</span>
              <button onClick={() => dismiss(toast.id)} aria-label={t("common.dismiss")}><X size={16} /></button>
            </div>
          ))}
        </div>
      </ConfirmContext.Provider>
    </ToastContext.Provider>
  );
}

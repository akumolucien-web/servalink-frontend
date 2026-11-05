import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Bell } from "lucide-react";
import { api, type Booking } from "../../api";
import { useAuth } from "../../auth/AuthContext";
import { useT, type Key } from "../../i18n/I18nProvider";
import { usePopover } from "./usePopover";

/** `who` is null when the booking has no name for the person (shown as "a customer"). */
interface Item { key: string; to: string; title: Key; who: string | null; reference: string }

/**
 * The bell lists only real work waiting on the user, derived from their bookings
 * (there is no notifications endpoint): confirmations, reviews to leave, new requests.
 */
export function AttentionMenu() {
  const { hasProviderTools, needsSessionRefresh } = useAuth();
  const t = useT();
  const location = useLocation();
  const [items, setItems] = useState<Item[]>([]);
  const lastLoad = useRef(0);
  const { open, setOpen, anchor } = usePopover();

  useEffect(() => {
    if (Date.now() - lastLoad.current < 15_000) return;
    lastLoad.current = Date.now();
    let cancelled = false;
    (async () => {
      try {
        const citizen: Booking[] = await api.bookings("citizen");
        const provider: Booking[] = hasProviderTools ? await api.bookings("provider") : [];
        if (cancelled) return;
        const next: Item[] = [];
        for (const b of provider.filter((b) => b.status === "PENDING")) {
          next.push({ key: "p" + b.booking_id, to: `/app/bookings/${b.booking_id}`, title: "attn.newRequest", who: b.citizen_name || null, reference: b.reference });
        }
        for (const b of citizen.filter((b) => b.status === "AWAITING_CONFIRMATION")) {
          next.push({ key: "c" + b.booking_id, to: `/app/bookings/${b.booking_id}`, title: "attn.confirm", who: b.provider_name, reference: b.reference });
        }
        for (const b of citizen.filter((b) => b.status === "COMPLETED" && !b.reviewed)) {
          next.push({ key: "r" + b.booking_id, to: `/app/bookings/${b.booking_id}/review`, title: "bk.leaveReview", who: b.provider_name, reference: b.reference });
        }
        setItems(next);
      } catch { /* the bell is best-effort */ }
    })();
    return () => { cancelled = true; };
  }, [location.pathname, hasProviderTools]);

  const count = items.length + (needsSessionRefresh ? 1 : 0);
  return (
    <div className="pop-anchor" ref={anchor}>
      <button className="icon-btn" aria-label={count ? t("attn.countLabel", { n: count }) : t("attn.none")}
        aria-expanded={open} aria-haspopup="true" onClick={() => setOpen(!open)}>
        <Bell size={20} />
        {count > 0 && <span className="dot-count">{count}</span>}
      </button>
      {open && (
        <div className="popover" role="region" aria-label={t("attn.head")}>
          <div className="head">{t("attn.head")}</div>
          {needsSessionRefresh && (
            <Link className="item" to="/app/provider" onClick={() => setOpen(false)}>
              <strong>{t("attn.approved")}</strong>
              <span className="muted">{t("attn.approvedText")}</span>
            </Link>
          )}
          {items.map((item) => (
            <Link key={item.key} className="item" to={item.to} onClick={() => setOpen(false)}>
              <strong>{t(item.title)}</strong><span className="muted">{item.who ?? t("attn.aCustomer")} · {item.reference}</span>
            </Link>
          ))}
          {count === 0 && <div className="item muted">{t("attn.caughtUp")}</div>}
        </div>
      )}
    </div>
  );
}

import { useLayoutEffect, useRef, useState } from "react";
import { MapPin, ShieldCheck, Users } from "lucide-react";
import { useT, type Key } from "../../i18n/I18nProvider";

import photo from "../../assets/auth-painter.webp";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * Outline of the image panel: a rounded rectangle with a smoothly rounded notch cut from the top-left
 * and bottom-right corners (the white card shows through). Built from true circular arcs for the panel's
 * actual size, so the curves are never stretched.
 */
export function panelPath(w: number, h: number): string {
  const r = 36;                                   // outer corner radius
  const k = 28;                                   // radius of the notch curves
  const cw = clamp(w * 0.16, 84, 150), ch = clamp(h * 0.15, 84, 130);     // top-left notch
  const cw2 = clamp(w * 0.17, 90, 150), ch2 = clamp(h * 0.11, 84, 110);   // bottom-right notch
  return [
    `M 0 ${ch + k}`,
    `A ${k} ${k} 0 0 1 ${k} ${ch}`, `L ${cw - k} ${ch}`,
    `A ${k} ${k} 0 0 0 ${cw} ${ch - k}`, `L ${cw} ${k}`,
    `A ${k} ${k} 0 0 1 ${cw + k} 0`, `L ${w - r} 0`,
    `A ${r} ${r} 0 0 1 ${w} ${r}`, `L ${w} ${h - ch2 - k}`,
    `A ${k} ${k} 0 0 1 ${w - k} ${h - ch2}`, `L ${w - cw2 + k} ${h - ch2}`,
    `A ${k} ${k} 0 0 0 ${w - cw2} ${h - ch2 + k}`, `L ${w - cw2} ${h - k}`,
    `A ${k} ${k} 0 0 1 ${w - cw2 - k} ${h}`, `L ${r} ${h}`,
    `A ${r} ${r} 0 0 1 0 ${h - r}`, "Z",
  ].join(" ");
}

const FEATURES: { icon: typeof Users; label: Key }[] = [
  { icon: Users, label: "visual.verified" },
  { icon: ShieldCheck, label: "visual.safe" },
  { icon: MapPin, label: "visual.local" },
];

export function AuthVisual() {
  const t = useT();
  const ref = useRef<HTMLElement>(null);
  const [path, setPath] = useState<string>();
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => { if (element.clientWidth > 0) setPath(panelPath(element.clientWidth, element.clientHeight)); };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <aside ref={ref} className="auth-visual" aria-label={t("visual.about")}
      style={path ? { clipPath: `path('${path}')` } : undefined}>
      <div className="auth-visual-img" style={{ backgroundImage: `url(${photo})` }} aria-hidden="true" />
      <div className="auth-visual-shade" aria-hidden="true" />
      <div className="auth-visual-copy">
        <p className="auth-visual-title">{t("visual.title")}</p>
        <p className="auth-visual-text">{t("visual.text")}</p>
      </div>
      <ul className="auth-visual-features">
        {FEATURES.map(({ icon: Icon, label }) => (
          <li key={label}><span className="dot"><Icon size={19} aria-hidden="true" /></span><span>{t(label)}</span></li>
        ))}
      </ul>
    </aside>
  );
}

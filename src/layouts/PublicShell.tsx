import { useEffect, useState, type ReactNode } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { Brand, LocalModeBanner } from "../components/domain/Brand";
import { ButtonLink } from "../components/ui/Button";
import { useT } from "../i18n/I18nProvider";
import { LanguageSwitch } from "./LanguageSwitch";

export function PublicNav() {
  const { status, isAdmin } = useAuth();
  const t = useT();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setOpen(false), [location.pathname, location.hash]);
  const signedIn = status === "authenticated";
  const home = isAdmin ? "/admin" : "/app";
  const links = (
    <>
      <Link to="/">{t("nav.home")}</Link>
      <Link to="/search">{t("nav.findService")}</Link>
      <Link to="/#how-it-works">{t("nav.howItWorks")}</Link>
      <Link to="/#about">{t("nav.about")}</Link>
    </>
  );
  return (
    <header className="public-nav">
      <div className="inner">
        <Brand />
        <nav className="public-links" aria-label={t("nav.main")}>{links}</nav>
        <div className="public-actions">
          <LanguageSwitch />
          {signedIn ? (
            <ButtonLink to={home} size="sm">{t("nav.dashboard")}</ButtonLink>
          ) : (
            <>
              <ButtonLink to="/login" variant="ghost" size="sm" className="hide-sm">{t("nav.login")}</ButtonLink>
              <ButtonLink to="/register" size="sm">{t("nav.register")}</ButtonLink>
            </>
          )}
          <button className="menu-btn" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label={open ? t("nav.closeMenu") : t("nav.openMenu")}>
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="mobile-sheet" aria-label={t("nav.mobile")}>
          {links}
          {!signedIn && <Link to="/login">{t("nav.login")}</Link>}
        </nav>
      )}
    </header>
  );
}

export function Footer() {
  const t = useT();
  return (
    <footer className="footer">
      <div className="inner">
        <div className="stack-sm">
          <Brand />
          <p className="small" style={{ maxWidth: "36ch" }}>{t("footer.blurb")}</p>
        </div>
        <div>
          <h4>{t("footer.platform")}</h4>
          <Link to="/search">{t("nav.findService")}</Link>
          <Link to="/become-provider">{t("footer.becomeProvider")}</Link>
          <Link to="/#how-it-works">{t("nav.howItWorks")}</Link>
          <Link to="/#faq">{t("footer.faq")}</Link>
        </div>
        <div>
          <h4>{t("footer.account")}</h4>
          <Link to="/login">{t("nav.login")}</Link>
          <Link to="/register">{t("nav.register")}</Link>
          <Link to="/#about">{t("footer.about")}</Link>
          <Link to="/terms">{t("footer.terms")}</Link>
          <Link to="/privacy">{t("footer.privacy")}</Link>
        </div>
        <p className="legal">{t("footer.noPayments")}</p>
      </div>
    </footer>
  );
}

export function PublicShell({ children, contained = false }: { children?: ReactNode; contained?: boolean }) {
  const t = useT();
  return (
    <>
      <LocalModeBanner />
      <a className="skip-link" href="#main">{t("common.skipToContent")}</a>
      <PublicNav />
      <main id="main" className={`public-main${contained ? " public-content" : ""}`} tabIndex={-1}>
        {children ?? <Outlet />}
      </main>
      <Footer />
    </>
  );
}

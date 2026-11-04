import { useEffect, useState, type ReactNode } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { Brand, LocalModeBanner } from "../components/domain/Brand";
import { ButtonLink } from "../components/ui/Button";

export function PublicNav() {
  const { status, isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setOpen(false), [location.pathname, location.hash]);
  const signedIn = status === "authenticated";
  const home = isAdmin ? "/admin" : "/app";
  const links = (
    <>
      <Link to="/">Home</Link>
      <Link to="/search">Find a service</Link>
      <Link to="/#how-it-works">How it works</Link>
      <Link to="/#about">About</Link>
    </>
  );
  return (
    <header className="public-nav">
      <div className="inner">
        <Brand />
        <nav className="public-links" aria-label="Main">{links}</nav>
        <div className="public-actions">
          {signedIn ? (
            <ButtonLink to={home} size="sm">Go to my dashboard</ButtonLink>
          ) : (
            <>
              <ButtonLink to="/login" variant="ghost" size="sm" className="hide-sm">Log in</ButtonLink>
              <ButtonLink to="/register" size="sm">Create account</ButtonLink>
            </>
          )}
          <button className="menu-btn" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label={open ? "Close menu" : "Open menu"}>
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="mobile-sheet" aria-label="Mobile">
          {links}
          {!signedIn && <Link to="/login">Log in</Link>}
        </nav>
      )}
    </header>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="inner">
        <div className="stack-sm">
          <Brand />
          <p className="small" style={{ maxWidth: "36ch" }}>ServaLink connects people in Cameroon with local service providers. Search by category and city, explore profiles and work galleries, and manage your bookings in one place.</p>
        </div>
        <div>
          <h4>Platform</h4>
          <Link to="/search">Find a service</Link>
          <Link to="/become-provider">Become a provider</Link>
          <Link to="/#how-it-works">How it works</Link>
          <Link to="/#faq">FAQ</Link>
        </div>
        <div>
          <h4>Account</h4>
          <Link to="/login">Log in</Link>
          <Link to="/register">Create account</Link>
          <Link to="/#about">About ServaLink</Link>
          <Link to="/terms">Terms and Conditions</Link>
          <Link to="/privacy">Privacy notice</Link>
        </div>
        <p className="legal">ServaLink does not process payments. Agree on the work directly with your provider.</p>
      </div>
    </footer>
  );
}

export function PublicShell({ children, contained = false }: { children?: ReactNode; contained?: boolean }) {
  return (
    <>
      <LocalModeBanner />
      <a className="skip-link" href="#main">Skip to content</a>
      <PublicNav />
      <main id="main" className={`public-main${contained ? " public-content" : ""}`} tabIndex={-1}>
        {children ?? <Outlet />}
      </main>
      <Footer />
    </>
  );
}

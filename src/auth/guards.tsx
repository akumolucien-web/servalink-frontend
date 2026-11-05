import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Lock, RefreshCw } from "lucide-react";
import { useState } from "react";
import { ButtonLink, Button } from "../components/ui/Button";
import { EmptyState, Skeleton } from "../components/ui/Display";
import { useToast } from "../components/ui/Overlay";
import { landingAfterLogin } from "../lib/redirect";
import { useT } from "../i18n/I18nProvider";
import { useAuth } from "./AuthContext";

export function FullPageLoading() {
  const t = useT();
  return (
    <div style={{ minHeight: "60vh", display: "grid", placeItems: "center" }} role="status" aria-label={t("common.loading")}>
      <div style={{ width: "min(360px, 80vw)" }} className="stack"><Skeleton height={22} width="50%" /><Skeleton height={14} /><Skeleton height={14} width="80%" /></div>
    </div>
  );
}

/** Signed-in users only. Anonymous visitors go to /login and come back afterwards. */
export function RequireAuth({ children }: { children?: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();
  if (status === "loading") return <FullPageLoading />;
  if (status === "anonymous") {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }
  return <>{children ?? <Outlet />}</>;
}

/** Citizen workspace: needs a ServaLink profile (GET /profile). Admins use /admin instead. */
export function RequireProfile() {
  const { isAdmin, profile, accountLoading } = useAuth();
  const location = useLocation();
  if (isAdmin) return <Navigate to="/admin" replace />;
  if (accountLoading || profile === undefined) return <FullPageLoading />;
  if (profile === null && location.pathname !== "/app/onboarding") {
    // Keep the page the user was heading to (e.g. a notification link) through onboarding.
    const here = location.pathname + location.search;
    return <Navigate to={`/app/onboarding?next=${encodeURIComponent(here)}`} replace />;
  }
  return <Outlet />;
}

/** Non-admins are sent to their dashboard without any hint that an admin area exists (the API enforces it too). */
export function RequireAdmin() {
  const { isAdmin } = useAuth();
  return isAdmin ? <Outlet /> : <Navigate to="/app" replace />;
}

export function GuestOnly() {
  const { status, isAdmin } = useAuth();
  const location = useLocation();
  if (status === "loading") return <FullPageLoading />;
  if (status === "authenticated") {
    const next = new URLSearchParams(location.search).get("next");
    return <Navigate to={landingAfterLogin(next, isAdmin)} replace />;
  }
  return <Outlet />;
}

/** Provider Tools: PROVIDER group in the token AND an APPROVED provider record. */
export function RequireProviderTools() {
  const { hasProviderTools, needsSessionRefresh, provider, refreshSession } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  if (hasProviderTools) return <Outlet />;
  if (needsSessionRefresh) {
    return (
      <EmptyState icon={<RefreshCw size={24} />} title="You're approved. Refresh your access"
        action={<Button loading={busy} onClick={async () => {
          setBusy(true);
          const ok = await refreshSession();
          setBusy(false);
          if (!ok) toast.error("Your access hasn't updated yet. Sign out and sign in again.");
        }}>Refresh access</Button>}>
        An administrator approved your provider application. Your current sign-in was issued before that, so refresh it to unlock Provider Tools.
      </EmptyState>
    );
  }
  return (
    <EmptyState icon={<Lock size={24} />} title="Provider Tools are locked"
      action={<ButtonLink to="/app/become-provider">{provider ? "View application status" : "Become a provider"}</ButtonLink>}>
      {provider
        ? "Provider Tools unlock once your application is approved and active."
        : "Apply to become a provider to list your services and receive booking requests."}
    </EmptyState>
  );
}

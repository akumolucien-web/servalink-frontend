import type { ReactNode } from "react";
import { Link, Outlet } from "react-router-dom";
import { AuthLogo } from "../components/auth/AuthLogo";
import { AuthVisual } from "../components/auth/AuthVisual";
import { LocalModeBanner } from "../components/domain/Brand";
import { useT } from "../i18n/I18nProvider";
import { LanguageSwitch } from "./LanguageSwitch";

/**
 * Frame for every authentication screen (login, sign up, verify, password recovery, onboarding):
 * a large white rounded card on a light green page, form on the left, curved image panel on the right.
 * The panel is decorative and is hidden below 900px so the form always comes first on tablets and phones.
 */
export function AuthShell({ children }: { children?: ReactNode }) {
  const t = useT();
  return (
    <>
      <LocalModeBanner />
      <a className="skip-link" href="#main">{t("common.skipToContent")}</a>
      <div className="auth-page">
        <div className="auth-card">
          <main id="main" className="auth-left" tabIndex={-1}>
            <div className="auth-form-wrap">
              <div className="auth-lang"><LanguageSwitch /></div>
              <Link to="/" className="auth-logo"><AuthLogo /></Link>
              {children ?? <Outlet />}
            </div>
          </main>
          <AuthVisual />
        </div>
      </div>
    </>
  );
}

import { useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { FullPageLoading, GuestOnly, RequireAdmin, RequireAuth, RequireProfile, RequireProviderTools } from "./auth/guards";
import { AdaptiveShell } from "./layouts/AdaptiveShell";
import { AuthShell } from "./layouts/AuthShell";
import { PublicShell } from "./layouts/PublicShell";
import { WorkspaceShell } from "./layouts/WorkspaceShell";
import { useAuth } from "./auth/AuthContext";
import { ForgotPasswordPage } from "./pages/auth/ForgotPasswordPage";
import { LoginPage } from "./pages/auth/LoginPage";
import { OnboardingPage } from "./pages/auth/OnboardingPage";
import { RegisterPage } from "./pages/auth/RegisterPage";
import { VerifyCodePage } from "./pages/auth/VerifyCodePage";
import { AdminCategoriesPage } from "./pages/admin/AdminCategoriesPage";
import { AdminDashboardPage } from "./pages/admin/AdminDashboardPage";
import { AdminProvidersPage } from "./pages/admin/AdminProvidersPage";
import { AdminReportsPage } from "./pages/admin/AdminReportsPage";
import { BecomeProviderPage } from "./pages/citizen/BecomeProviderPage";
import { BookingDetailPage } from "./pages/citizen/BookingDetailPage";
import { BookingsPage } from "./pages/citizen/BookingsPage";
import { DashboardPage } from "./pages/citizen/DashboardPage";
import { NewBookingPage } from "./pages/citizen/NewBookingPage";
import { ProfilePage } from "./pages/citizen/ProfilePage";
import { ReportPage } from "./pages/citizen/ReportPage";
import { ReportsPage } from "./pages/citizen/ReportsPage";
import { ReviewPage } from "./pages/citizen/ReviewPage";
import { ReviewsPage } from "./pages/citizen/ReviewsPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { OwnProviderProfilePage } from "./pages/provider/OwnProviderProfilePage";
import { ProviderBookingsPage } from "./pages/provider/ProviderBookingsPage";
import { ProviderDashboardPage } from "./pages/provider/ProviderDashboardPage";
import { ProviderGalleryPage } from "./pages/provider/ProviderGalleryPage";
import { ProviderServicesPage } from "./pages/provider/ProviderServicesPage";
import { BecomeProviderInfoPage } from "./pages/public/BecomeProviderInfoPage";
import { HomePage } from "./pages/public/HomePage";
import { ProviderProfilePage } from "./pages/public/ProviderProfilePage";
import { PrivacyPage } from "./pages/public/PrivacyPage";
import { SearchPage } from "./pages/public/SearchPage";
import { TermsPage } from "./pages/public/TermsPage";

/** Scroll to top on navigation, or to the #anchor (How it works / About). */
function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const target = document.getElementById(hash.slice(1));
      if (target) { target.scrollIntoView({ behavior: "smooth" }); return; }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

export default function App() {
  const { status } = useAuth();
  if (status === "loading") return <FullPageLoading />;
  return (
    <>
      <ScrollManager />
      <Routes>
        <Route element={<PublicShell />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/become-provider" element={<BecomeProviderInfoPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
        </Route>

        <Route element={<AdaptiveShell />}>
          <Route path="/search" element={<SearchPage />} />
          <Route path="/providers/:id" element={<ProviderProfilePage />} />
        </Route>

        <Route element={<GuestOnly />}>
          <Route element={<AuthShell />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          </Route>
        </Route>
        <Route element={<AuthShell />}><Route path="/verify" element={<VerifyCodePage />} /></Route>

        <Route element={<RequireAuth />}>
          <Route element={<AuthShell />}><Route path="/app/onboarding" element={<OnboardingPage />} /></Route>

          <Route element={<RequireProfile />}>
            <Route element={<WorkspaceShell />}>
              <Route path="/app" element={<DashboardPage />} />
              <Route path="/app/bookings" element={<BookingsPage />} />
              <Route path="/app/bookings/:id" element={<BookingDetailPage />} />
              <Route path="/app/bookings/:id/review" element={<ReviewPage />} />
              <Route path="/app/bookings/:id/report" element={<ReportPage />} />
              <Route path="/app/book/:serviceId" element={<NewBookingPage />} />
              <Route path="/app/reviews" element={<ReviewsPage />} />
              <Route path="/app/reports" element={<ReportsPage />} />
              <Route path="/app/reports/:id" element={<ReportsPage />} />
              <Route path="/app/profile" element={<ProfilePage />} />
              <Route path="/app/become-provider" element={<BecomeProviderPage />} />
              <Route element={<RequireProviderTools />}>
                <Route path="/app/provider" element={<ProviderDashboardPage />} />
                <Route path="/app/provider/bookings" element={<ProviderBookingsPage />} />
                <Route path="/app/provider/services" element={<ProviderServicesPage />} />
                <Route path="/app/provider/gallery" element={<ProviderGalleryPage />} />
                <Route path="/app/provider/profile" element={<OwnProviderProfilePage />} />
              </Route>
            </Route>
          </Route>

          <Route element={<RequireAdmin />}>
            <Route element={<WorkspaceShell variant="admin" />}>
              <Route path="/admin" element={<AdminDashboardPage />} />
              <Route path="/admin/providers" element={<AdminProvidersPage />} />
              <Route path="/admin/providers/:id" element={<AdminProvidersPage />} />
              <Route path="/admin/reports" element={<AdminReportsPage />} />
              <Route path="/admin/reports/:id" element={<AdminReportsPage />} />
              <Route path="/admin/categories" element={<AdminCategoriesPage />} />
              <Route path="/admin/categories/:id" element={<AdminCategoriesPage />} />
            </Route>
          </Route>
        </Route>

        <Route element={<PublicShell />}><Route path="*" element={<NotFoundPage />} /></Route>
      </Routes>
    </>
  );
}

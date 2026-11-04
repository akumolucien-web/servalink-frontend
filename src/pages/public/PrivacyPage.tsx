import { Bullets, LegalDoc } from "../../components/domain/Legal";

export function PrivacyPage() {
  return (
    <LegalDoc title="Privacy notice" sections={[
      ["Data we collect", <Bullets items={["Your name, phone number and e-mail address", "Your region, city and quartier", "Photos you upload (profile photo, work gallery, report evidence)", "Booking details (service, date, notes, status)", "Reports and reviews you submit"]} />],
      ["Why we use it", <Bullets items={["to create and run your account", "to match customers with providers near them", "to manage bookings, reviews and reports", "to keep the platform safe and prevent abuse", "to contact you about your bookings and account"]} />],
      ["Who sees what", <p>Providers and customers see each other's name and public profile. Your phone number and address are only shared with the other party after a booking is accepted. Administrators can see account and report data when needed to moderate the platform. We do not sell your data.</p>],
      ["Storage and security", <p>Your data is stored on Amazon Web Services in the eu-north-1 region (Stockholm, Sweden). Data is encrypted in transit and access is restricted to what the service needs. No system is perfectly secure, so please choose a strong password.</p>],
      ["How long we keep it", <p>We keep your data while your account is active. After you ask us to delete your account we remove or anonymise your personal data, except what we must keep to meet legal obligations or to resolve disputes.</p>],
      ["Your rights", <><p>You can:</p><Bullets items={["access the personal data we hold about you", "correct it (most details can be edited in your profile)", "ask for your data to be deleted, by contacting us"]} /></>],
      ["Applicable law", <p>We process personal data in line with Cameroon's personal-data protection and cybersecurity laws, as applicable. [The exact legal citation must be confirmed by the reviewing lawyer.]</p>],
      ["Contact", <p>To exercise your rights or ask a question, use the contact details published on ServaLink (the official contact e-mail will be confirmed before public launch).</p>],
    ]} />
  );
}

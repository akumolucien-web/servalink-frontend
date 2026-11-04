import { Bullets, LegalDoc } from "../../components/domain/Legal";

export function TermsPage() {
  return (
    <LegalDoc title="Terms and Conditions" sections={[
      ["Who we are", <p>ServaLink is a platform that helps people in Cameroon find local service providers. It is operated by the ServaLink team ("we", "us").</p>],
      ["The platform is an intermediary", <p>ServaLink only connects customers and providers. Providers are independent professionals; they are not employed by ServaLink, and we do not supervise or guarantee their work. Any agreement for a job is between the customer and the provider.</p>],
      ["No payment through ServaLink", <p>In this version, ServaLink does not take or process payments. Prices shown are indicative and are agreed directly between the customer and the provider.</p>],
      ["Eligibility", <Bullets items={["You must be at least 18 years old.", "You must use your real identity.", "One account per person."]} />],
      ["Your obligations and prohibited conduct", <>
        <p>You agree to provide accurate information and to treat others with respect. You must not:</p>
        <Bullets items={["impersonate someone else or create a false profile", "post unlawful, abusive, discriminatory or misleading content", "use ServaLink for fraud, harassment or any illegal activity", "collect other users' data or interfere with the platform's operation"]} />
      </>],
      ["Bookings and cancellations", <p>A booking request is only confirmed once the provider accepts it. Either party should cancel as early as possible and in good faith. Repeated no-shows or late cancellations may lead to suspension.</p>],
      ["Reviews", <p>Reviews must be honest and may only be written by customers about jobs they actually booked through ServaLink. We may remove reviews that are false, abusive or unrelated to a real job.</p>],
      ["Reports and moderation", <p>You can report a user, booking or review. Our administrators examine reports and may remove content or restrict accounts where these terms are breached.</p>],
      ["Suspension and ban", <p>We may suspend or permanently ban accounts that breach these terms, put others at risk, or abuse the platform. You can stop using ServaLink at any time and ask for your account to be deleted.</p>],
      ["Limitation of liability", <p>ServaLink is provided "as is". To the extent permitted by law, we are not liable for the quality, safety or outcome of services delivered by providers, for disputes between users, or for losses caused by interruptions of the platform.</p>],
      ["Changes to these terms", <p>We may update these terms. When we do, we will change the version date and, where the change is significant, ask you to accept the new version.</p>],
      ["Governing law", <p>These terms are governed by the laws of the Republic of Cameroon.</p>],
      ["Contact", <p>For questions about these terms, use the contact details published on ServaLink (the official contact e-mail will be confirmed before public launch).</p>],
    ]} />
  );
}

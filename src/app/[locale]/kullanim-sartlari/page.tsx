import { LegalPage } from "@/components/LegalPage";
import { legalUpdatedAt, termsSections } from "@/lib/legal-content";

export default function TermsPage() {
  return <LegalPage title="Kullanım Şartları" updatedAt={legalUpdatedAt} sections={termsSections} />;
}

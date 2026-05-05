import { LegalPage } from "@/components/LegalPage";
import { explicitConsentSections, legalUpdatedAt } from "@/lib/legal-content";

export default function ExplicitConsentPage() {
  return <LegalPage title="Açık Rıza Metni" updatedAt={legalUpdatedAt} sections={explicitConsentSections} />;
}

import { LegalPage } from "@/components/LegalPage";
import { cookieSections, legalUpdatedAt } from "@/lib/legal-content";

export default function CookiePolicyPage() {
  return <LegalPage title="Çerez Politikası" updatedAt={legalUpdatedAt} sections={cookieSections} />;
}

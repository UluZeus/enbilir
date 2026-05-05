import { LegalPage } from "@/components/LegalPage";
import { kvkkSections, legalUpdatedAt } from "@/lib/legal-content";

export default function KvkkPage() {
  return <LegalPage title="KVKK Aydınlatma Metni" updatedAt={legalUpdatedAt} sections={kvkkSections} />;
}

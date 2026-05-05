import { LegalPage } from "@/components/LegalPage";
import { investmentDisclaimerSections, legalUpdatedAt } from "@/lib/legal-content";

export default function InvestmentDisclaimerPage() {
  return <LegalPage title="Yatırım Tavsiyesi Değildir" updatedAt={legalUpdatedAt} sections={investmentDisclaimerSections} />;
}

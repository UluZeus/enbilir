"use client";

type LegalTableOfContentsProps = {
  label: string;
  headings: string[];
};

export function LegalTableOfContents({ label, headings }: LegalTableOfContentsProps) {
  function handleSectionClick(sectionId: string) {
    const section = document.getElementById(sectionId);

    if (!section) return;

    section.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", `#${sectionId}`);
  }

  return (
    <nav className="legal-page-toc lg:sticky lg:top-28" aria-label={label}>
      <p className="text-xs font-black uppercase text-[#0f766e]">{label}</p>
      <ol className="mt-4 grid gap-2 border-l border-slate-300 pl-4">
        {headings.map((heading, index) => {
          const sectionId = `legal-section-${index + 1}`;

          return (
            <li key={heading}>
              <a
                href={`#${sectionId}`}
                className="text-sm font-semibold leading-5 text-slate-600 transition hover:text-[#0f766e]"
                onClick={(event) => {
                  event.preventDefault();
                  handleSectionClick(sectionId);
                }}
              >
                {index + 1}. {heading}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export const macroReportEventTypes = {
  read: "READ",
  pdfDownload: "PDF_DOWNLOAD",
  emailSent: "EMAIL_SENT",
  emailFailed: "EMAIL_FAILED",
} as const;

export type MacroReportEventType = typeof macroReportEventTypes[keyof typeof macroReportEventTypes];

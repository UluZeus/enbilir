import { prisma } from "@/lib/prisma";

export const visualSettingKeys = [
  "gradientPrimary",
  "gradientSecondary",
  "accentColor",
  "heroBackgroundImageUrl",
  "homeOverlayImageUrl",
  "adImageUrl",
  "animationsEnabled",
  "card3dEnabled",
  "whatsappButtonVariant",
] as const;

export type VisualSettingKey = (typeof visualSettingKeys)[number];
export type VisualSettingType = "TEXT" | "COLOR" | "IMAGE_URL" | "BOOLEAN";

export type VisualSettingDefinition = {
  key: VisualSettingKey;
  title: string;
  value: string;
  type: VisualSettingType;
  description: string;
};

export const defaultVisualSettings: VisualSettingDefinition[] = [
  {
    key: "gradientPrimary",
    title: "Ana gradient birinci renk",
    value: "#d8f7b7",
    type: "COLOR",
    description: "Global arka plan gecisinin sol alt tarafinda baskin kullanilan renk.",
  },
  {
    key: "gradientSecondary",
    title: "Ana gradient ikinci renk",
    value: "#8fd8ff",
    type: "COLOR",
    description: "Global arka plan gecisinin sag ust tarafinda baskin kullanilan renk.",
  },
  {
    key: "accentColor",
    title: "Vurgu rengi",
    value: "#f5a623",
    type: "COLOR",
    description: "CTA, parlama ve premium altin vurgularda kullanilan renk.",
  },
  {
    key: "heroBackgroundImageUrl",
    title: "Hero arka plan gorsel URL'si",
    value: "",
    type: "IMAGE_URL",
    description: "Ana sayfa hero alaninda CSS deseninin uzerinde hafif saydam kullanilir.",
  },
  {
    key: "homeOverlayImageUrl",
    title: "Ana sayfa seffaf arka plan gorsel URL'si",
    value: "",
    type: "IMAGE_URL",
    description: "Ana sayfa genelinde saydam dekoratif gorsel katman olarak kullanilir.",
  },
  {
    key: "adImageUrl",
    title: "Reklam gorsel URL'si",
    value: "",
    type: "IMAGE_URL",
    description: "Reklam/bilgi kartlarinda opsiyonel arka plan gorseli olarak kullanilir.",
  },
  {
    key: "animationsEnabled",
    title: "Animasyonlar aktif",
    value: "true",
    type: "BOOLEAN",
    description: "Global arka plan hareketleri ve mikro animasyonlari acip kapatir.",
  },
  {
    key: "card3dEnabled",
    title: "3D kart efektleri aktif",
    value: "true",
    type: "BOOLEAN",
    description: "Premium kartlarda desktop hover tilt/perspective efektini acip kapatir.",
  },
  {
    key: "whatsappButtonVariant",
    title: "WhatsApp buton tercihi",
    value: "text",
    type: "TEXT",
    description: "text veya image. Image secilirse kompakt gorsel rozet stili kullanilir.",
  },
];

export type SiteVisualSettings = Record<VisualSettingKey, string>;

function normalizeSettingValue(type: VisualSettingType, value: string) {
  if (type === "BOOLEAN") {
    return value === "true" ? "true" : "false";
  }

  return value.trim();
}

export function isVisualEnabled(settings: SiteVisualSettings, key: "animationsEnabled" | "card3dEnabled") {
  return settings[key] === "true";
}

export function getSettingDefinition(key: string) {
  return defaultVisualSettings.find((setting) => setting.key === key);
}

export async function getSiteVisualSettings(): Promise<SiteVisualSettings> {
  const defaults = Object.fromEntries(
    defaultVisualSettings.map((setting) => [setting.key, setting.value]),
  ) as SiteVisualSettings;

  try {
    const rows = await prisma.siteVisualSetting.findMany({
      where: { key: { in: [...visualSettingKeys] } },
    });

    return rows.reduce<SiteVisualSettings>((settings, row) => {
      const definition = getSettingDefinition(row.key);

      if (definition) {
        settings[definition.key] = normalizeSettingValue(definition.type, row.value);
      }

      return settings;
    }, defaults);
  } catch {
    return defaults;
  }
}

export async function ensureDefaultVisualSettings() {
  for (const setting of defaultVisualSettings) {
    await prisma.siteVisualSetting.upsert({
      where: { key: setting.key },
      create: setting,
      update: {
        title: setting.title,
        type: setting.type,
        description: setting.description,
      },
    });
  }
}

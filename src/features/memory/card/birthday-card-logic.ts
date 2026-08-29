export type CardTemplate = "coral-birthday" | "cream-wishes";
export type MessageDensity = "short" | "medium" | "long" | "maximum";

export function resolveCardTemplate(templateId: string): CardTemplate {
  return templateId === "cream-wishes" ? "cream-wishes" : "coral-birthday";
}

export function countVisibleCharacters(value: string): number {
  return Array.from(value.replace(/\s/g, "")).length;
}

export function getMessageDensity(message: string): MessageDensity {
  const length = countVisibleCharacters(message);
  if (length <= 45) return "short";
  if (length <= 95) return "medium";
  if (length <= 150) return "long";
  return "maximum";
}

export function needsCompactName(value: string): boolean {
  return countVisibleCharacters(value) > 12;
}

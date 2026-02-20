import { promises as fs } from "fs";
import path from "path";
import type { TemplateConfig } from "./schema";

export async function loadTemplate(templateId: string): Promise<TemplateConfig> {
  const filePath = path.join(process.cwd(), "templates", `${templateId}.json`);
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw) as TemplateConfig;
}

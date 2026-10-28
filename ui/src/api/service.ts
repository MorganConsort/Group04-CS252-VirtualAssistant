import { createApiCheckService } from "./client";
import { readCheckConfig } from "./config";
import type { LearningCheckService } from "./types";

// An explicit error is shown for invalid configuration; it never activates demo mode.
export const checkSetup = (() => {
  try {
    return { config: readCheckConfig(import.meta.env), error: null };
  } catch (error) {
    return { config: null, error: (error as Error).message };
  }
})();
export async function getCheckService(): Promise<LearningCheckService> {
  const { config, error } = checkSetup;
  if (!config)
    throw new Error(error ?? "Invalid learning-check configuration.");
  if (config.mode === "api") return createApiCheckService(config.baseUrl);
  const { createDemoCheckService } = await import("../demo/checkService");
  return createDemoCheckService();
}

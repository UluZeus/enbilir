import { describe, expect, it } from "vitest";

import {
  PRODUCTION_APP_DIRECTORY,
  PRODUCTION_ENV_FILE,
} from "../../../scripts/lib/production-paths.mjs";

describe("production runtime paths", () => {
  it("keeps cron jobs on the canonical immutable release symlink and external environment file", () => {
    expect(PRODUCTION_APP_DIRECTORY).toBe("/srv/enbilir/current");
    expect(PRODUCTION_ENV_FILE).toBe("/etc/enbilir/enbilir.env");
  });
});

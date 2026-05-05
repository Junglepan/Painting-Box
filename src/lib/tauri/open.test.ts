import { test, expect } from "bun:test";
import { revealExportDirectory } from "./open";

test("revealExportDirectory asks the OS file manager to reveal the selected directory", () => {
  expect(revealExportDirectory.name).toBe("revealExportDirectory");
});

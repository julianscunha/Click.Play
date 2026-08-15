import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readEnvFile, writeEnvFile } from "./env-file.js";

let filePath: string;

beforeEach(() => {
  filePath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cp-env-")), ".env");
});

afterEach(() => {
  fs.rmSync(path.dirname(filePath), { recursive: true, force: true });
});

describe("env-file", () => {
  it("reads KEY=VALUE pairs, ignoring comments and blank lines", () => {
    fs.writeFileSync(filePath, "# comment\nFOO=bar\n\nBAZ=qux\n");
    expect(readEnvFile(filePath)).toEqual({ FOO: "bar", BAZ: "qux" });
  });

  it("returns empty object when the file does not exist", () => {
    expect(readEnvFile(filePath)).toEqual({});
  });

  it("writes new keys to a nonexistent file", () => {
    writeEnvFile(filePath, { FOO: "bar" });
    expect(readEnvFile(filePath)).toEqual({ FOO: "bar" });
  });

  it("updates an existing key in place, preserving other lines untouched", () => {
    fs.writeFileSync(filePath, "# header comment\nFOO=old\nBAZ=qux\n");
    writeEnvFile(filePath, { FOO: "new" });

    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("# header comment");
    expect(readEnvFile(filePath)).toEqual({ FOO: "new", BAZ: "qux" });
  });

  it("appends a key that did not exist yet", () => {
    fs.writeFileSync(filePath, "FOO=bar\n");
    writeEnvFile(filePath, { NEW_KEY: "value" });
    expect(readEnvFile(filePath)).toEqual({ FOO: "bar", NEW_KEY: "value" });
  });
});

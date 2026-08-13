import { describe, expect, it } from "vitest";
import { getArchetype, listArchetypes } from "./archetype-registry.js";

describe("archetype-registry", () => {
  it("lists 19 archetypes: 14 do OpenReels + 5 novos Click.Play", () => {
    expect(listArchetypes()).toHaveLength(19);
    expect(listArchetypes()).toContain("kids_cartoon");
    expect(listArchetypes()).toContain("musical_singalong");
  });

  it("resolves kids_cartoon with bold_outline caption default", () => {
    expect(getArchetype("kids_cartoon").captionStyle).toBe("bold_outline");
  });

  it("resolves musical_singalong with karaoke_sweep caption default", () => {
    expect(getArchetype("musical_singalong").captionStyle).toBe("karaoke_sweep");
  });

  it("throws on unknown archetype", () => {
    expect(() => getArchetype("does_not_exist")).toThrow("Unknown archetype");
  });
});

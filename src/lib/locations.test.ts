import { describe, expect, it } from "vitest";
import { citiesOf, fold, quartiersOf, REGIONS, regionName } from "./locations";

describe("locations", () => {
  it("folds like the backend", () => {
    expect(fold("  Yaoundé ")).toBe("yaounde");
    expect(fold("Électricité   Générale")).toBe("electricite generale");
  });
  it("exposes the dataset", () => {
    expect(REGIONS).toHaveLength(10);
    expect(citiesOf("LT").map((c) => c.name)).toContain("Douala");
    expect(citiesOf("XX")).toEqual([]);
    expect(quartiersOf("LT", "douala").length).toBeGreaterThanOrEqual(40);
    expect(quartiersOf(undefined, "DOUALA").length).toBeGreaterThanOrEqual(40);
    expect(quartiersOf("LT", "nowhere")).toEqual([]);
    expect(regionName("LT")).toBe("Littoral");
    expect(regionName("LT", "fr")).toBe("Littoral");
    expect(regionName("XX")).toBe("XX");
  });
});

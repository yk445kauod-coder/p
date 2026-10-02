import { dailyQuote, quotesFor, QUOTES_AR, QUOTES_EN } from "../src/domain/quotes";

describe("dailyQuote", () => {
  it("is stable for the same day and language", () => {
    const d = new Date("2026-05-04T08:00:00Z");
    expect(dailyQuote("en", d)).toEqual(dailyQuote("en", d));
  });

  it("changes with the offset (the shuffle button)", () => {
    const d = new Date("2026-05-04T08:00:00Z");
    expect(dailyQuote("en", d, 1)).not.toEqual(dailyQuote("en", d, 0));
  });

  it("picks from the right deck", () => {
    const d = new Date("2026-05-04T08:00:00Z");
    expect(QUOTES_EN).toContainEqual(dailyQuote("en", d));
    expect(QUOTES_AR).toContainEqual(dailyQuote("ar", d));
  });

  it("wraps negative offsets instead of returning undefined", () => {
    const d = new Date("2026-01-01T00:00:00Z");
    const q = dailyQuote("en", d, -1);
    expect(q).toBeDefined();
    expect(q.text.length).toBeGreaterThan(0);
  });
});

describe("quotesFor", () => {
  it("returns a non-empty deck per language", () => {
    expect(quotesFor("en").length).toBeGreaterThan(0);
    expect(quotesFor("ar").length).toBeGreaterThan(0);
  });
});

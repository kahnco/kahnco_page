import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LIVE_COUNT, LIVE_SERVICES, SERVICES, UPCOMING_SERVICES } from "./services";
import { PORTFOLIO, PORTFOLIO_COUNT } from "./portfolio";
import { careerYears, STORY, WAYS, LAYERS } from "./home";

const all = PORTFOLIO.flatMap((g) => g.items);

describe("services", () => {
  it("lists five services in story order", () => {
    expect(SERVICES.map((s) => s.name)).toEqual([
      "그래서요", "사주쿠키", "Atomic Demolition", "베라페이블", "더그아웃",
    ]);
  });
  it("splits live and upcoming", () => {
    expect(LIVE_COUNT).toBe(3);
    expect(LIVE_SERVICES.every((s) => s.status === "live")).toBe(true);
    expect(UPCOMING_SERVICES.map((s) => s.statusLabel)).toEqual(["비공개 베타 모집 중", "개발 중"]);
  });
  it("every screenshot exists in public/", () => {
    for (const s of SERVICES) {
      if (s.shot) expect(existsSync(join(__dirname, "../../public", s.shot.src)), s.shot.src).toBe(true);
    }
  });
});

describe("portfolio", () => {
  it("has 12 items including 쿠펀", () => {
    expect(PORTFOLIO_COUNT).toBe(12);
    const coufun = all.find((i) => i.title.startsWith("쿠펀"));
    expect(coufun?.period).toBe("의뢰 · 약 8개월 (실작업 약 2개월)");
  });
  it("축신 shows handover", () => {
    expect(all.find((i) => i.title === "축신")?.period).toBe("2024.12 ~ 2026.04 · 인수인계 완료");
  });
});

describe("home", () => {
  it("counts career years from 2021-08", () => {
    expect(careerYears(new Date(2026, 9, 19))).toBe(5);
    expect(careerYears(new Date(2026, 6, 31))).toBe(4);
    expect(careerYears(new Date(2026, 7, 1))).toBe(5);
  });
  it("has three story years, four layers, four ways", () => {
    expect(STORY.map((s) => s.year)).toEqual(["2021", "2024", "2026"]);
    expect(LAYERS.map((l) => l.name)).toEqual(["앱", "웹", "서버", "인프라"]);
    expect(WAYS).toHaveLength(4);
  });
});

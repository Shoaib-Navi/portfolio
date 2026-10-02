import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime, formatDay, timeAgo } from "./format";

describe("format", () => {
  it("formats day keys without depending on locale or time zone", () => {
    expect(formatDay("2026-09-02", "axis")).toBe("2 Sep");
    expect(formatDay("2026-09-02")).toBe("Wed 2 Sep");
    expect(formatDay("2026-09-02", "long")).toBe("Wednesday 2 September");
  });

  it("shows timestamps in India time", () => {
    // 20:35 UTC is 02:05 the next day in India.
    expect(formatDate("2026-09-30T20:35:00Z")).toBe("1 Oct 2026");
    expect(formatDateTime("2026-09-30T20:35:00Z")).toBe("1 Oct 2026, 02:05");
    expect(formatDateTime("2026-01-05T00:00:00Z")).toBe("5 Jan 2026, 05:30");
  });

  it("describes elapsed time relative to a given clock", () => {
    const now = Date.parse("2026-10-01T12:00:00Z");
    expect(timeAgo(undefined, now)).toBe("never");
    expect(timeAgo("2026-10-01T11:59:30Z", now)).toBe("just now");
    expect(timeAgo("2026-10-01T11:40:00Z", now)).toBe("20 min ago");
    expect(timeAgo("2026-10-01T09:00:00Z", now)).toBe("3 h ago");
    expect(timeAgo("2026-09-28T12:00:00Z", now)).toBe("3 d ago");
  });
});

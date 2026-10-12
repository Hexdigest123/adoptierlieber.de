import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { visitSection } from "./stats";

describe("visitSection", () => {
	it("maps route ids to coarse sections", () => {
		expect(visitSection("/")).toBe("landing");
		expect(visitSection("/app")).toBe("app");
		expect(visitSection("/app/animals/[id]")).toBe("app");
		expect(visitSection("/animals/[id]")).toBe("animal");
		expect(visitSection("/shelter/settings/team")).toBe("shelter");
		expect(visitSection("/login")).toBe("auth");
		expect(visitSection("/mfa/setup")).toBe("auth");
		expect(visitSection("/datenschutz")).toBe("other");
		expect(visitSection("/profile")).toBe("other");
	});

	it("does not count admin, api or pages without a route", () => {
		expect(visitSection("/admin")).toBeNull();
		expect(visitSection("/admin/catalog/users/[id]")).toBeNull();
		expect(visitSection("/api/[...path]")).toBeNull();
		expect(visitSection(null)).toBeNull();
	});
});

describe("beacons", () => {
	const sendBeacon = vi.fn<(url: string, data: Blob) => boolean>();
	const fetchMock = vi.fn<typeof fetch>();

	beforeEach(() => {
		vi.resetModules();
		sendBeacon.mockReset().mockReturnValue(true);
		fetchMock.mockReset().mockResolvedValue(new Response("{}"));
		vi.stubGlobal("navigator", { sendBeacon });
		vi.stubGlobal("fetch", fetchMock);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("sends only the section, once per page, and skips repeats of the same path", async () => {
		const { trackVisit } = await import("./stats");
		trackVisit("/animals/[id]", "/animals/123");
		trackVisit("/animals/[id]", "/animals/123");
		trackVisit("/", "/");
		trackVisit("/admin", "/admin");

		expect(sendBeacon).toHaveBeenCalledTimes(2);
		const [url, blob] = sendBeacon.mock.calls[0];
		expect(url).toBe("/api/stats/visit");
		expect(blob.type).toBe("application/json");
		expect(await blob.text()).toBe('{"section":"animal"}');
		expect(await sendBeacon.mock.calls[1][1].text()).toBe('{"section":"landing"}');
	});

	it("posts the shelter id for donation clicks", async () => {
		const { trackDonationClick } = await import("./stats");
		trackDonationClick("10ab0ff5-7460-4e37-98fe-3c4f1f18dc68");

		const [url, blob] = sendBeacon.mock.calls[0];
		expect(url).toBe("/api/shelters/10ab0ff5-7460-4e37-98fe-3c4f1f18dc68/donation-click");
		expect(await blob.text()).toBe("{}");
	});

	it("falls back to a keepalive fetch when the beacon is refused", async () => {
		sendBeacon.mockReturnValue(false);
		const { trackVisit } = await import("./stats");
		trackVisit("/", "/");

		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [url, init] = fetchMock.mock.calls[0];
		expect(url).toBe("/api/stats/visit");
		expect(init).toMatchObject({ method: "POST", keepalive: true, credentials: "omit" });
		expect(init?.body).toBe('{"section":"landing"}');
	});

	it("never throws, even when the beacon API blows up", async () => {
		sendBeacon.mockImplementation(() => {
			throw new Error("boom");
		});
		fetchMock.mockRejectedValue(new Error("offline"));
		const { trackVisit, trackDonationClick } = await import("./stats");

		expect(() => trackVisit("/", "/")).not.toThrow();
		expect(() => trackDonationClick("abc")).not.toThrow();
		vi.stubGlobal("navigator", {});
		fetchMock.mockImplementation(() => {
			throw new Error("sync failure");
		});
		expect(() => trackDonationClick("abc")).not.toThrow();
	});
});

import { describe, expect, it } from "vitest";
import { catalogListPath, type CatalogFilters } from "./api";
import { searchParams } from "$lib/query";

const base: CatalogFilters = {
	type: "users",
	q: "",
	status: "",
	city: "",
	verified: "",
	species: "",
};

function parse(path: string) {
	const url = new URL(path, "https://example.test");
	return { pathname: url.pathname, params: Object.fromEntries(url.searchParams) };
}

describe("searchParams", () => {
	it("drops empty values", () => {
		expect(searchParams({ a: "1", b: "", c: null, d: undefined }).toString()).toBe("a=1");
	});
});

describe("catalogListPath", () => {
	it("pages users with their filters", () => {
		const path = catalogListPath({ ...base, q: "anna", status: "active", verified: "no" }, 3);
		expect(parse(path)).toEqual({
			pathname: "/api/admin/users",
			params: { page: "3", per_page: "24", q: "anna", status: "active", verified: "no" },
		});
	});

	it("sends a shelter status as verification_status", () => {
		const path = catalogListPath({ ...base, type: "shelters", status: "pending", city: "Köln" }, 1);
		expect(parse(path).params).toEqual({
			page: "1",
			per_page: "24",
			city: "Köln",
			verification_status: "pending",
		});
	});

	it("ignores city and verified for animals", () => {
		const path = catalogListPath(
			{ ...base, type: "animals", city: "Berlin", verified: "yes", species: "cat" },
			2,
		);
		expect(parse(path)).toEqual({
			pathname: "/api/admin/animals",
			params: { page: "2", per_page: "24", species: "cat" },
		});
	});
});

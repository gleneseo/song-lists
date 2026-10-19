import { describe, expect, it } from "vitest";
import { BASE_SORTS } from "@/lib/lists/extra-columns";
import {
  defaultsFor,
  listHref,
  MASTER_LIST_NAME,
  parseListView,
  searchedFor,
  sortedBy,
  type ListView,
} from "@/lib/lists/list-view";

/** Parses as a list with no optional columns would. */
const parse = (
  params: Parameters<typeof parseListView>[0],
  defaults: Parameters<typeof parseListView>[1],
) => parseListView(params, defaults, BASE_SORTS);

const listDefaults = defaultsFor("On A Boat!");
const masterDefaults = defaultsFor(MASTER_LIST_NAME);

const defaultView: ListView = {
  query: "",
  sort: "title",
  direction: "asc",
  page: 1,
  defaults: listDefaults,
};

describe("defaultsFor", () => {
  it("should sort an ordinary list by title, A to Z", () => {
    expect(defaultsFor("Getting Lit")).toEqual({
      sort: "title",
      direction: "asc",
    });
  });

  it("should sort The Master List by artist, A to Z", () => {
    expect(defaultsFor("The Master List")).toEqual({
      sort: "artist",
      direction: "asc",
    });
  });

  it("should only treat the exact name as the master list", () => {
    expect(defaultsFor("The Master List 2").sort).toBe("title");
    expect(defaultsFor("the master list").sort).toBe("title");
  });
});

describe("parseListView", () => {
  it("should fall back to the list's own defaults when there are no params", () => {
    expect(parse({}, listDefaults)).toEqual(defaultView);
    expect(parse({}, masterDefaults)).toMatchObject({
      sort: "artist",
      direction: "asc",
    });
  });

  it("should read every param", () => {
    expect(
      parse(
        { q: "prince", sort: "added", dir: "desc", page: "3" },
        listDefaults,
      ),
    ).toEqual({
      query: "prince",
      sort: "added",
      direction: "desc",
      page: 3,
      defaults: listDefaults,
    });
  });

  it("should trim the search", () => {
    expect(parse({ q: "  prince  " }, listDefaults).query).toBe("prince");
  });

  it("should cap an overlong search", () => {
    expect(parse({ q: "a".repeat(500) }, listDefaults).query).toHaveLength(100);
  });

  it("should fall back to the defaults for an unknown sort column or direction", () => {
    const actual = parse(
      { sort: "popularity", dir: "sideways" },
      masterDefaults,
    );

    expect(actual.sort).toBe("artist");
    expect(actual.direction).toBe("asc");
  });

  it("should use the first value when a param is repeated", () => {
    const actual = parse(
      { q: ["a", "b"], sort: ["title", "artist"] },
      listDefaults,
    );

    expect(actual.query).toBe("a");
    expect(actual.sort).toBe("title");
  });

  it("should accept a production sort only on a list that offers it", () => {
    const params = { sort: "production" };
    const withProductions = [...BASE_SORTS, "production" as const];

    expect(parseListView(params, listDefaults, withProductions).sort).toBe(
      "production",
    );
    expect(parseListView(params, listDefaults, BASE_SORTS).sort).toBe("title");
  });

  it("should fall back to page 1 for a bad page", () => {
    expect(parse({ page: "banana" }, listDefaults).page).toBe(1);
  });
});

describe("sortedBy", () => {
  const view: ListView = {
    query: "prince",
    sort: "title",
    direction: "asc",
    page: 4,
    defaults: listDefaults,
  };

  it("should flip the direction of the column already sorted by", () => {
    expect(sortedBy(view, "title").direction).toBe("desc");
    expect(sortedBy({ ...view, direction: "desc" }, "title").direction).toBe(
      "asc",
    );
  });

  it("should start the other text column A to Z when first chosen", () => {
    expect(sortedBy(view, "artist")).toMatchObject({
      sort: "artist",
      direction: "asc",
    });
  });

  it("should start the production column A to Z when first chosen", () => {
    expect(sortedBy(view, "production")).toMatchObject({
      sort: "production",
      direction: "asc",
    });
  });

  it("should start the date column newest first when first chosen", () => {
    expect(sortedBy(view, "added")).toMatchObject({
      sort: "added",
      direction: "desc",
    });
  });

  it("should go back to the first page but keep the search and defaults", () => {
    expect(sortedBy(view, "artist")).toMatchObject({
      page: 1,
      query: "prince",
      defaults: listDefaults,
    });
  });
});

describe("searchedFor", () => {
  it("should set the search, trimmed, and go back to the first page", () => {
    const view: ListView = { ...defaultView, sort: "artist", page: 5 };

    expect(searchedFor(view, "  bowie ")).toEqual({
      query: "bowie",
      sort: "artist",
      direction: "asc",
      page: 1,
      defaults: listDefaults,
    });
  });
});

describe("listHref", () => {
  it("should be just the path for a list in its default view", () => {
    expect(listHref("/lists/2", defaultView)).toBe("/lists/2");
  });

  it("should be just the path for the master list in its own default view", () => {
    const master: ListView = {
      ...defaultView,
      sort: "artist",
      defaults: masterDefaults,
    };

    expect(listHref("/lists/1", master)).toBe("/lists/1");
  });

  it("should spell out a sort that is the default elsewhere but not for this list", () => {
    const master: ListView = {
      ...defaultView,
      sort: "title",
      defaults: masterDefaults,
    };

    expect(listHref("/lists/1", master)).toBe("/lists/1?sort=title");
  });

  it("should include every non-default part", () => {
    expect(
      listHref("/lists/2", {
        query: "tom waits",
        sort: "added",
        direction: "desc",
        page: 2,
        defaults: listDefaults,
      }),
    ).toBe("/lists/2?q=tom+waits&sort=added&dir=desc&page=2");
  });

  it("should leave out parts that match the default", () => {
    expect(listHref("/lists/2", { ...defaultView, page: 2 })).toBe(
      "/lists/2?page=2",
    );
  });

  it("should encode characters that are special in a URL", () => {
    expect(listHref("/lists/2", { ...defaultView, query: "R&B / 50%" })).toBe(
      "/lists/2?q=R%26B+%2F+50%25",
    );
  });

  it.each([
    ["an ordinary list", listDefaults],
    ["the master list", masterDefaults],
  ])("should round-trip through parseListView for %s", (_label, defaults) => {
    const view: ListView = {
      query: "a&b=c",
      sort: "added",
      direction: "desc",
      page: 7,
      defaults,
    };
    const search = Object.fromEntries(
      new URLSearchParams(listHref("/x", view).split("?")[1]),
    );

    expect(parse(search, defaults)).toEqual(view);
  });
});

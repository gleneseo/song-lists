import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  LIVE_ATTRIBUTE,
  PENDING_ENTITY_CLICK_SCRIPT,
  PENDING_HREF_KEY,
} from "@/lib/entity-links/pending-click-script";

class FakeElement {
  attributes = new Map<string, string>();

  constructor(
    private readonly matchesEntityLink: boolean,
    attributes: Record<string, string> = {},
  ) {
    Object.entries(attributes).forEach(([name, value]) => {
      this.attributes.set(name, value);
    });
  }

  closest() {
    return this.matchesEntityLink ? this : null;
  }

  hasAttribute(name: string) {
    return this.attributes.has(name);
  }

  getAttribute(name: string) {
    return this.attributes.get(name) ?? null;
  }
}

interface FakeClick {
  target: unknown;
  defaultPrevented: boolean;
  button: number;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  preventDefault: () => void;
}

function click(
  target: unknown,
  overrides: Partial<FakeClick> = {},
): FakeClick & { prevented: boolean } {
  const event = {
    target,
    defaultPrevented: false,
    button: 0,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    prevented: false,
    ...overrides,
    preventDefault() {
      event.prevented = true;
    },
  };

  return event;
}

describe("the pending entity click script", () => {
  let handler: (event: FakeClick) => void;
  let capture: unknown;
  let window: Record<string, unknown> & { location: { href: string } };

  beforeEach(() => {
    vi.useFakeTimers();
    window = { location: { href: "/lists/1" } };
    new Function("document", "window", "Element", PENDING_ENTITY_CLICK_SCRIPT)(
      {
        addEventListener: (
          type: string,
          listener: (event: FakeClick) => void,
          useCapture: unknown,
        ) => {
          expect(type).toBe("click");
          handler = listener;
          capture = useCapture;
        },
      },
      window,
      FakeElement,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should listen for clicks in the capture phase, ahead of everything else", () => {
    expect(capture).toBe(true);
  });

  it("should hold back a click on a link that isn't live yet, and remember where it was going", () => {
    const event = click(new FakeElement(true, { href: "/song/7" }));

    handler(event);

    expect(event.prevented).toBe(true);
    expect(window[PENDING_HREF_KEY]).toBe("/song/7");
  });

  it("should leave a click on a live link to the router", () => {
    const event = click(
      new FakeElement(true, { href: "/song/7", [LIVE_ATTRIBUTE]: "" }),
    );

    handler(event);

    expect(event.prevented).toBe(false);
    expect(window[PENDING_HREF_KEY]).toBeUndefined();
  });

  it("should leave a click on anything else alone", () => {
    const event = click(new FakeElement(false));

    handler(event);

    expect(event.prevented).toBe(false);
  });

  it("should leave a click that isn't on an element alone", () => {
    const event = click({});

    handler(event);

    expect(event.prevented).toBe(false);
  });

  it.each([
    ["a command-click", { metaKey: true }],
    ["a control-click", { ctrlKey: true }],
    ["a shift-click", { shiftKey: true }],
    ["an alt-click", { altKey: true }],
    ["a middle click", { button: 1 }],
    ["a click something already handled", { defaultPrevented: true }],
  ] as [string, Partial<FakeClick>][])(
    "should leave %s alone, so opening a link elsewhere still works",
    (_name, overrides) => {
      const event = click(
        new FakeElement(true, { href: "/song/7" }),
        overrides,
      );

      handler(event);

      expect(event.prevented).toBe(false);
      expect(window[PENDING_HREF_KEY]).toBeUndefined();
    },
  );

  it("should send a held click to the page directly if its link never comes alive", () => {
    handler(click(new FakeElement(true, { href: "/song/7" })));

    vi.advanceTimersByTime(9_999);
    expect(window.location.href).toBe("/lists/1");

    vi.advanceTimersByTime(1);
    expect(window.location.href).toBe("/song/7");
  });

  it("should do nothing more once the link has picked up its click", () => {
    handler(click(new FakeElement(true, { href: "/song/7" })));
    window[PENDING_HREF_KEY] = undefined;

    vi.advanceTimersByTime(20_000);

    expect(window.location.href).toBe("/lists/1");
  });

  it("should follow the latest click when there are several", () => {
    handler(click(new FakeElement(true, { href: "/song/7" })));
    handler(click(new FakeElement(true, { href: "/artist/9" })));

    vi.advanceTimersByTime(10_000);

    expect(window.location.href).toBe("/artist/9");
  });
});

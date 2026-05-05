import { expect, test } from "bun:test";
import { scrollHorizontallyWithWheel } from "./scroll";

test("scrollHorizontallyWithWheel maps vertical wheel movement to horizontal scroll", () => {
  const element = { scrollLeft: 10, scrollWidth: 300, clientWidth: 100 };
  let prevented = false;

  scrollHorizontallyWithWheel(element, {
    deltaX: 0,
    deltaY: 40,
    preventDefault: () => {
      prevented = true;
    },
  });

  expect(element.scrollLeft).toBe(50);
  expect(prevented).toBe(true);
});

test("scrollHorizontallyWithWheel leaves non-scrollable strips alone", () => {
  const element = { scrollLeft: 0, scrollWidth: 100, clientWidth: 100 };
  let prevented = false;

  scrollHorizontallyWithWheel(element, {
    deltaX: 0,
    deltaY: 40,
    preventDefault: () => {
      prevented = true;
    },
  });

  expect(element.scrollLeft).toBe(0);
  expect(prevented).toBe(false);
});

export function scrollHorizontallyWithWheel(
  element: Pick<HTMLElement, "scrollLeft" | "scrollWidth" | "clientWidth">,
  event: Pick<WheelEvent, "deltaX" | "deltaY" | "preventDefault">,
) {
  const maxScrollLeft = Math.max(0, element.scrollWidth - element.clientWidth);
  if (maxScrollLeft <= 0) return;

  const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY)
    ? event.deltaX
    : event.deltaY;
  if (delta === 0) return;

  const next = Math.min(maxScrollLeft, Math.max(0, element.scrollLeft + delta));
  if (next === element.scrollLeft) return;
  event.preventDefault();
  element.scrollLeft = next;
}

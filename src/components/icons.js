// Лінійні іконки 24×24, колір — currentColor.
const wrap = (body) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`

export const icons = {
  dumbbell: wrap('<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/>'),
  list: wrap(
    '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
  ),
  food: wrap(
    '<path d="M7 3v8a2 2 0 0 0 2 2v8M5 3v5a2 2 0 0 0 2 2M11 3v5a2 2 0 0 1-2 2"/><path d="M17 21V3c-2 1.5-3 4-3 7v3h3"/>',
  ),
  scale: wrap('<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M7 11a5 5 0 0 1 10 0"/><path d="M12 11l2.5-3"/>'),
  more: wrap('<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>'),
  chart: wrap('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
  chevronLeft: wrap('<path d="M15 18l-6-6 6-6"/>'),
  chevronRight: wrap('<path d="M9 18l6-6-6-6"/>'),
  plus: wrap('<path d="M12 5v14M5 12h14"/>'),
  search: wrap('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>'),
  edit: wrap('<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M14 6l4 4"/>'),
  target: wrap('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>'),
  close: wrap('<path d="M6 6l12 12M18 6L6 18"/>'),
  clock: wrap('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  trash: wrap('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
}

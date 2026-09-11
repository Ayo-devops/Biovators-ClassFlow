export default function Icon({ name = "grid", size = 20 }) {
  const paths = {
    grid: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
    book: "M4 4h6l2 2 2-2h6v16h-6l-2 2-2-2H4z M12 6v16",
    bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4",
    plus: "M12 5v14 M5 12h14",
    arrow: "M5 12h14 M14 7l5 5-5 5",
    search: "M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
    calendar:
      "M5 5h14a2 2 0 0 1 2 2v13H3V7a2 2 0 0 1 2-2 M7 2v6 M17 2v6 M3 11h18",
    clock: "M12 8v5l3 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
    users:
      "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M17 3a4 4 0 0 1 0 8",
    download: "M12 3v12 M7 10l5 5 5-5 M4 16v5h16v-5",
    check: "M5 12l4 4L19 6",
    shield: "M12 2l9 4v6c0 5-9 10-9 10S3 17 3 12V6z M8 12l3 3 5-6",
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] || paths.grid} />
    </svg>
  );
}

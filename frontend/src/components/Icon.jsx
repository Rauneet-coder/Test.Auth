const paths = {
  arrow: "M5 12h14m-5-5 5 5-5 5",
  chevron: "m9 5 7 7-7 7",
  chevronDown: "m6 9 6 6 6-6",
  grid: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
  shield: "m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6zM8 12l3 3 5-6",
  activity: "M3 12h4l3-8 4 16 3-8h4",
  code: "m8 7-5 5 5 5m8-10 5 5-5 5m-3-14-2 18",
  book: "M12 5v16M12 5C9 2 4 3 2 4v15c3-1 7-1 10 2 3-3 7-3 10-2V4c-2-1-7-2-10 1Z",
  external: "M14 3h7v7M21 3 10 14M10 3H3v18h18v-7",
  sun: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1",
  moon: "M21 13a9 9 0 1 1-10-10 7 7 0 0 0 10 10Z",
  menu: "M4 6h16M4 12h16M4 18h16",
  close: "m6 6 12 12M6 18 18 6",
  check: "m5 12 4 4L19 6",
  lock: "M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5z",
  mail: "M3 5h18v14H3zM3 5l9 7 9-7",
  help: "M9 8a3 3 0 1 1 5 2c-2 1-2 2-2 3m0 3h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  collapse: "M9 4v16M3 4h18v16H3zM15 9l-3 3 3 3",
};

export default function Icon({ name = "arrow", size = 20, ...props }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[name] || paths.arrow} /></svg>;
}

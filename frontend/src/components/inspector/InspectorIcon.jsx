export default function InspectorIcon({ name = 'code', size = 18, ...props }) {
  const paths = {
    code: 'm8 7-5 5 5 5m8-10 5 5-5 5m-3-14-2 18',
    shield: 'm12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z',
    lock: 'M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5z',
    user: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M4 21v-2a8 8 0 0 1 16 0v2',
    refresh: 'M20 7v5h-5M4 17v-5h5M6 6a8 8 0 0 1 13 3M5 15a8 8 0 0 0 13 3',
    arrow: 'M5 12h14m-5-5 5 5-5 5',
    chevron: 'm9 5 7 7-7 7',
    copy: 'M8 8h12v13H8zM16 8V3H3v13h5',
    download: 'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',
    activity: 'M3 12h4l3-8 4 16 3-8h4',
    search: 'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
    close: 'm6 6 12 12M6 18 18 6',
    check: 'm5 12 4 4L19 6',
    clock: 'M12 7v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[name] || paths.code} /></svg>;
}

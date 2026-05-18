export function useFaviconBadge() {
  const setBadge = (count: number | string | null) => {
    // Access the global helper injected in index.html
    // @ts-ignore
    const setter = (window as any).setFaviconBadge;
    if (typeof setter === 'function') {
      setter(count);
    }
  };

  return { setBadge };
}



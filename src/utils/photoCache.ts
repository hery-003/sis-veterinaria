const cache = new Map<string, string>();

export function getPhotoDataUrl(filePath: string | null): Promise<string | null> {
  if (!filePath) return Promise.resolve(null);
  const cached = cache.get(filePath);
  if (cached !== undefined) return Promise.resolve(cached);
  return window.api
    .getPhotoDataUrl(filePath)
    .then((url: string | null) => {
      if (url) cache.set(filePath, url);
      return url;
    })
    .catch(() => null);
}

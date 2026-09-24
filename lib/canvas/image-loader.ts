const cache = new Map<string, Promise<HTMLImageElement>>();

function pendingImage(url: string) {
  const existing = cache.get(url);
  if (existing) return existing;
  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => { cache.delete(url); reject(new Error(`Cannot load outfit image: ${url}`)); };
    image.src = url;
  });
  cache.set(url, promise);
  return promise;
}

export function loadCanvasImage(url: string, signal?: AbortSignal): Promise<HTMLImageElement> {
  if (!url) return Promise.reject(new Error("Image URL is required."));
  if (signal?.aborted) return Promise.reject(new DOMException("Image loading aborted.", "AbortError"));
  const loading = pendingImage(url);
  if (!signal) return loading;
  return new Promise((resolve, reject) => {
    const abort = () => reject(new DOMException("Image loading aborted.", "AbortError"));
    signal.addEventListener("abort", abort, { once: true });
    loading.then(image => { signal.removeEventListener("abort", abort); resolve(image); }, error => { signal.removeEventListener("abort", abort); reject(error); });
  });
}

export function clearCanvasImageCache() { cache.clear(); }

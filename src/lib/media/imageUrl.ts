/**
 * Smaller, modern image for ImageKit-hosted photos (the owner's teacher/book images). ImageKit resizes and
 * re-encodes on its side (`tr` parameter), so the browser downloads a 720 px WebP instead of the original file.
 * Any other URL, or one that already carries `tr`, is returned unchanged.
 */
export function imageKitUrl(url: string, width = 720): string {
  try {
    const u = new URL(url);
    if (u.hostname !== 'ik.imagekit.io' || u.searchParams.has('tr')) return url;
    u.searchParams.set('tr', `w-${width},q-80,f-auto`);
    return u.toString();
  } catch {
    return url;
  }
}

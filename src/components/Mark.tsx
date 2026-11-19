/** Use the extracted source symbol consistently, including its original pointed sweeps. */
export function Mark({ size = 40, title }: { size?: number; title?: string }) {
  return <img src="/brand/infinity-extracted.webp" onError={event => { if (!event.currentTarget.src.endsWith('.png')) event.currentTarget.src = '/brand/infinity-extracted.png'; }} width={size} height={size * 936 / 2787} alt={title ?? ''} aria-hidden={title ? undefined : true} />;
}

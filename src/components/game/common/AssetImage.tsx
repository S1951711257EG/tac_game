"use client";

/**
 * Image with graceful fallback: if the asset fails to load, renders a themed
 * color block (token role) so gameplay never shows broken images. Fallbacks
 * are a safety net, not a substitute for the real assets.
 */
import { useState } from "react";

export interface AssetImageProps {
  src: string;
  alt: string;
  /** Token color path used for the fallback block, e.g. "color.player". */
  fallbackColor?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function AssetImage({ src, alt, fallbackColor, className, style }: AssetImageProps) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={className}
        style={{ ...style, backgroundColor: fallbackColor ? `var(--im-${fallbackColor.replace(/\./g, "-")})` : "var(--im-color-line)" }}
      />
    );
  }
  return (
<img
      src={src}
      alt={alt}
      className={className}
      style={style}
      draggable={false}
      onError={() => setFailed(true)}
    />
  );
}

/* eslint-disable @next/next/no-img-element */
"use client";

interface DynamicAvatarImageProps {
  src: string;
  alt: string;
  className?: string;
  title?: string;
  /**
   * Intrinsic square size hint in px. Avatars are always displayed as
   * squares/circles sized by CSS; the width/height attributes only need to
   * reserve a correctly-shaped box before the image loads, killing layout
   * shift (CLS). 96 covers the largest rendered avatar (~96 CSS px).
   */
  size?: number;
}

export default function DynamicAvatarImage({
  src,
  alt,
  className,
  title,
  size = 96,
}: DynamicAvatarImageProps) {
  return (
    <img
      src={src}
      alt={alt}
      title={title}
      className={className}
      width={size}
      height={size}
      style={{ aspectRatio: "1 / 1" }}
      loading="lazy"
      decoding="async"
    />
  );
}

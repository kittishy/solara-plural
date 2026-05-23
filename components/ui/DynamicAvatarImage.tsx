/* eslint-disable @next/next/no-img-element */
"use client";

interface DynamicAvatarImageProps {
  src: string;
  alt: string;
  className?: string;
  title?: string;
}

export default function DynamicAvatarImage({
  src,
  alt,
  className,
  title,
}: DynamicAvatarImageProps) {
  return (
    <img
      src={src}
      alt={alt}
      title={title}
      className={className}
      loading="lazy"
      decoding="async"
    />
  );
}

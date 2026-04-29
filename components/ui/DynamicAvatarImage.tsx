type DynamicAvatarImageProps = {
  src: string;
  alt: string;
  className?: string;
  title?: string;
};

export default function DynamicAvatarImage({ src, alt, className, title }: DynamicAvatarImageProps) {
  // User-provided avatar URLs can come from any HTTPS host or a data URL, so
  // rendering them through next/image would crash unless every host is whitelisted.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} title={title} className={className} loading="lazy" decoding="async" />;
}

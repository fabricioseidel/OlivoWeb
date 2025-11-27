"use client";

import React, { useState } from "react";

// Accept both string src and StaticImageData (next/image imports)
type MaybeStatic = string | { src?: string } | undefined;

// Omit native src to allow StaticImageData-like objects
interface Props extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  fallback?: string;
  src?: MaybeStatic;
}

const DEFAULT_FALLBACK = "/file.svg";

function normalizeSrc(s?: MaybeStatic) {
  if (!s) return undefined;
  if (typeof s === "string") return s;
  if (typeof s === "object" && s && "src" in s) return (s as any).src;
  return undefined;
}

const ImageWithFallback: React.FC<Props> = ({
  fallback = DEFAULT_FALLBACK,
  src,
  alt,
  className = "",
  ...rest
}) => {
  const initial = normalizeSrc(src) || fallback;
  const [imgSrc, setImgSrc] = useState(initial);
  const [hasError, setHasError] = useState(false);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...rest}
      src={imgSrc}
      alt={alt || "Imagen"}
      className={`max-w-full ${hasError ? 'object-contain' : 'object-cover'} ${className}`}
      onError={() => {
        if (imgSrc !== fallback) {
          setImgSrc(fallback);
          setHasError(true);
        }
      }}
      style={{
        maxHeight: hasError ? '100%' : undefined,
        ...rest.style
      }}
    />
  );
};

export default ImageWithFallback;


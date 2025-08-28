"use client";

import React, { useState } from "react";

// Accept both string src and StaticImageData (next/image imports)
type MaybeStatic = string | { src?: string } | undefined;

// Omit native src to allow StaticImageData-like objects
interface Props extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  fallback?: string;
  src?: MaybeStatic;
}

const DEFAULT_FALLBACK = "/uploads/upload-1755295276091-ywcxpk.png";

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
  ...rest
}) => {
  const initial = normalizeSrc(src) || fallback;
  const [imgSrc, setImgSrc] = useState(initial);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...rest}
      src={imgSrc}
      alt={alt || "Imagen"}
      onError={() => {
        if (imgSrc !== fallback) setImgSrc(fallback);
      }}
    />
  );
};

export default ImageWithFallback;


"use client";

import React from "react";
import ImageWithFallback from "@/components/ui/ImageWithFallback";

type CardProps = {
  children: React.ReactNode;
  as?: React.ElementType;
  className?: string;
};

export function Card({ children, as: Tag = "div", className = "" }: CardProps) {
  return (
    <Tag
      className={`group rounded-2xl bg-white ring-1 ring-gray-200 shadow-sm hover:shadow-md transition-shadow ${className}`}
    >
      {children}
    </Tag>
  );
}

type CardMediaProps = {
  src?: string | null;
  alt: string;
  fallback?: string;
  className?: string;
};

export function CardMedia({
  src,
  alt,
  fallback = "/file.svg",
  className = "",
}: CardMediaProps) {
  const finalSrc = src || fallback;
  return (
    <div className={`img-container square rounded-t-2xl ${className}`}>
      <ImageWithFallback src={finalSrc} alt={alt} className="w-full h-full object-cover" />
    </div>
  );
}

export function CardBody({ children, className = "" }: CardProps) {
  return <div className={`p-4 ${className}`}>{children}</div>;
}

export function CardTitle({ children, className = "" }: CardProps) {
  return (
    <h3 className={`text-base font-semibold text-gray-900 line-clamp-2 ${className}`}>
      {children}
    </h3>
  );
}

export function CardSubtitle({ children, className = "" }: CardProps) {
  return <p className={`text-sm text-gray-500 ${className}`}>{children}</p>;
}

export function CardFooter({ children, className = "" }: CardProps) {
  return <div className={`p-4 pt-0 ${className}`}>{children}</div>;
}

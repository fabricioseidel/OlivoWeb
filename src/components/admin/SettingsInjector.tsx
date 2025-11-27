"use client";

import { useEffect } from "react";
import { useStoreSettings } from "@/hooks/useStoreSettings";

/**
 * Componente que aplica dinámicamente los colores y configuraciones de la tienda
 * Inyecta CSS variables globales y meta tags
 */
export function SettingsInjector() {
  const { settings } = useStoreSettings();

  useEffect(() => {
    if (!settings) return;

    // Inyectar colores como CSS variables
    const root = document.documentElement;
    
    if (settings.appearance?.primaryColor) {
      root.style.setProperty("--color-primary", settings.appearance.primaryColor);
    }
    if (settings.appearance?.secondaryColor) {
      root.style.setProperty("--color-secondary", settings.appearance.secondaryColor);
    }
    if (settings.appearance?.accentColor) {
      root.style.setProperty("--color-accent", settings.appearance.accentColor);
    }
    if (settings.appearance?.footerBackgroundColor) {
      root.style.setProperty("--color-footer-bg", settings.appearance.footerBackgroundColor);
    }
    if (settings.appearance?.footerTextColor) {
      root.style.setProperty("--color-footer-text", settings.appearance.footerTextColor);
    }

    // Aplicar modo oscuro si está habilitado
    if (settings.appearance?.enableDarkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    // Actualizar meta tags SEO
    const updateMetaTag = (name: string, content: string) => {
      let tag = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute("name", name);
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", content);
    };

    const updateOpenGraphTag = (property: string, content: string) => {
      let tag = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement;
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute("property", property);
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", content);
    };

    if (settings.seoTitle) updateMetaTag("og:title", settings.seoTitle);
    if (settings.seoDescription) updateMetaTag("description", settings.seoDescription);
    if (settings.seoKeywords) updateMetaTag("keywords", settings.seoKeywords);
    if (settings.ogImageUrl) updateOpenGraphTag("og:image", settings.ogImageUrl);
    if (settings.storeName) updateMetaTag("og:site_name", settings.storeName);

    // Actualizar título de la página
    if (settings.seoTitle) {
      document.title = settings.seoTitle;
    }

    // Inyectar favicon
    if (settings.appearance?.faviconUrl) {
      let link = document.querySelector("link[rel='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = settings.appearance.faviconUrl;
    }
  }, [settings]);

  return null;
}

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

    // Solo tocar tags marcados como inyectados por nosotros (NUNCA los que Next.js renderiza,
    // porque al removerlos React pierde la referencia y revienta con removeChild on null al navegar)
    const updateMetaTag = (name: string, content: string) => {
      let tag = document.querySelector(`meta[name="${name}"][data-injected="settings"]`) as HTMLMetaElement | null;
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute("name", name);
        tag.setAttribute("data-injected", "settings");
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", content);
    };

    const updateOpenGraphTag = (property: string, content: string) => {
      let tag = document.querySelector(`meta[property="${property}"][data-injected="settings"]`) as HTMLMetaElement | null;
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute("property", property);
        tag.setAttribute("data-injected", "settings");
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

    // Favicon: solo actualizar/crear NUESTRO link (no tocar el de Next.js, eso rompe React)
    const faviconUrl = settings.appearance?.faviconUrl;
    if (faviconUrl && (faviconUrl.startsWith('https://') || faviconUrl.startsWith('http://'))) {
      let link = document.querySelector("link[rel='icon'][data-injected='settings']") as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        link.setAttribute("data-injected", "settings");
        document.head.appendChild(link);
      }
      if (link.href !== faviconUrl) link.href = faviconUrl;
    }
  }, [settings]);

  return null;
}

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
    if (!settings) {
      console.warn("[SettingsInjector] No settings available yet");
      return;
    }

    console.log(`[SettingsInjector] ⏰ ${new Date().toLocaleTimeString()} - Settings received:`, {
      primary: settings.appearance?.primaryColor,
      secondary: settings.appearance?.secondaryColor,
      accent: settings.appearance?.accentColor,
      footerBg: settings.appearance?.footerBackgroundColor,
      footerText: settings.appearance?.footerTextColor,
    });

    // Helper para convertir hex a rgb
    const hexToRgb = (hex: string) => {
      // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
      const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
      hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);

      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      const rgb = result ? `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}` : null;
      if (!rgb) console.warn(`[SettingsInjector] Failed to convert hex to RGB: ${hex}`);
      return rgb;
    };

    console.log(`[SettingsInjector] 🎨 Applying settings at ${new Date().toLocaleTimeString()}`);

    // Inyectar colores como CSS variables y sus versiones RGB
    const root = document.documentElement;

    console.log("[SettingsInjector] Injecting CSS variables to document root");

    if (settings.appearance?.primaryColor) {
      root.style.setProperty("--color-primary", settings.appearance.primaryColor);
      const rgb = hexToRgb(settings.appearance.primaryColor);
      if (rgb) {
        root.style.setProperty("--color-primary-rgb", rgb);
        console.log(`[SettingsInjector] ✓ Primary: ${settings.appearance.primaryColor} → RGB(${rgb})`);
      }
    }
    if (settings.appearance?.secondaryColor) {
      root.style.setProperty("--color-secondary", settings.appearance.secondaryColor);
      const rgb = hexToRgb(settings.appearance.secondaryColor);
      if (rgb) {
        root.style.setProperty("--color-secondary-rgb", rgb);
        console.log(`[SettingsInjector] ✓ Secondary: ${settings.appearance.secondaryColor} → RGB(${rgb})`);
      }
    }
    if (settings.appearance?.accentColor) {
      root.style.setProperty("--color-accent", settings.appearance.accentColor);
      const rgb = hexToRgb(settings.appearance.accentColor);
      if (rgb) {
        root.style.setProperty("--color-accent-rgb", rgb);
        console.log(`[SettingsInjector] ✓ Accent: ${settings.appearance.accentColor} → RGB(${rgb})`);
      }
    }
    if (settings.appearance?.footerBackgroundColor) {
      root.style.setProperty("--color-footer-bg", settings.appearance.footerBackgroundColor);
      const rgb = hexToRgb(settings.appearance.footerBackgroundColor);
      if (rgb) {
        root.style.setProperty("--color-footer-bg-rgb", rgb);
        console.log(`[SettingsInjector] ✓ Footer BG: ${settings.appearance.footerBackgroundColor} → RGB(${rgb})`);
      }
    }
    if (settings.appearance?.footerTextColor) {
      root.style.setProperty("--color-footer-text", settings.appearance.footerTextColor);
      const rgb = hexToRgb(settings.appearance.footerTextColor);
      if (rgb) {
        root.style.setProperty("--color-footer-text-rgb", rgb);
        console.log(`[SettingsInjector] ✓ Footer Text: ${settings.appearance.footerTextColor} → RGB(${rgb})`);
      }
    }

    console.log("[SettingsInjector] CSS variable injection complete");

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

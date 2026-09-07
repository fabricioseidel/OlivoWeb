import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import AvisoConcursoInstagram from "@/components/AvisoConcursoInstagram";

// Mock useStoreSettings
vi.mock("@/hooks/useStoreSettings", () => ({
  useStoreSettings: () => ({
    settings: {
      socialMedia: {
        contest: {
          enabled: true,
          title: "¡Estamos de concurso en Instagram!",
          description: "Participa por tu premio: dale like y comenta el reel.",
          buttonText: "Participar ahora",
          reelUrl: "https://www.instagram.com/reel/test",
          endDate: "2029-12-31",
        },
      },
    },
    loading: false,
  }),
}));

describe("AvisoConcursoInstagram", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("renderiza correctamente con los textos configurados", () => {
    render(<AvisoConcursoInstagram />);
    expect(screen.getByText("¡Estamos de concurso en Instagram!")).toBeDefined();
    expect(
      screen.getByText("Participa por tu premio: dale like y comenta el reel.")
    ).toBeDefined();
    const btn = screen.getByRole("link", { name: /Participar ahora/i });
    expect(btn.getAttribute("href")).toBe("https://www.instagram.com/reel/test");
  });

  it("no se renderiza si está deshabilitado en customConfig", () => {
    const { container } = render(
      <AvisoConcursoInstagram customConfig={{ enabled: false }} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("no se renderiza si la fecha de término ya expiró", () => {
    const { container } = render(
      <AvisoConcursoInstagram
        customConfig={{
          enabled: true,
          endDate: "2020-01-01",
        }}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("se oculta al hacer click en cerrar y guarda en localStorage", () => {
    render(<AvisoConcursoInstagram />);
    const closeBtn = screen.getByRole("button", {
      name: /Cerrar aviso del concurso/i,
    });
    fireEvent.click(closeBtn);

    expect(screen.queryByText("¡Estamos de concurso en Instagram!")).toBeNull();
    expect(localStorage.getItem("olivo:aviso-concurso-ig:2029-12-31")).toBe("1");
  });

  it("en previewMode se muestra siempre ignorando localStorage", () => {
    localStorage.setItem("olivo:aviso-concurso-ig:2029-12-31", "1");
    render(<AvisoConcursoInstagram previewMode={true} />);
    expect(screen.getByText("¡Estamos de concurso en Instagram!")).toBeDefined();
  });
});

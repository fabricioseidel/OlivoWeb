import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useLaserScanner } from "../useLaserScanner";

const fireKeys = (chars: string[], intervalMs = 5) => {
  let now = 0;
  vi.setSystemTime(new Date(0));
  for (const ch of chars) {
    now += intervalMs;
    vi.setSystemTime(new Date(now));
    window.dispatchEvent(new KeyboardEvent("keydown", { key: ch, bubbles: true }));
  }
};

describe("useLaserScanner", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("emits a code when characters arrive quickly and terminate with Enter", () => {
    const onDetected = vi.fn();
    renderHook(() => useLaserScanner({ onDetected }));

    fireKeys(["7", "8", "0", "1", "2", "3", "4"], 5);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));

    expect(onDetected).toHaveBeenCalledWith("7801234");
  });

  it("ignores slow human typing", () => {
    const onDetected = vi.fn();
    renderHook(() => useLaserScanner({ onDetected }));

    fireKeys(["1", "2", "3", "4"], 200);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));

    expect(onDetected).toHaveBeenCalledTimes(0);
  });

  it("skips events when an editable element is focused", () => {
    const onDetected = vi.fn();
    renderHook(() => useLaserScanner({ onDetected }));

    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    const dispatch = (key: string) =>
      input.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));

    for (const c of ["9", "8", "7", "6", "5"]) dispatch(c);
    dispatch("Enter");

    expect(onDetected).toHaveBeenCalledTimes(0);
    document.body.removeChild(input);
  });

  it("passes through inputs marked with data-laser-passthrough", () => {
    const onDetected = vi.fn();
    renderHook(() => useLaserScanner({ onDetected }));

    const input = document.createElement("input");
    input.setAttribute("data-laser-passthrough", "");
    document.body.appendChild(input);
    input.focus();

    vi.setSystemTime(new Date(0));
    let t = 0;
    for (const c of ["5", "5", "5", "5"]) {
      t += 5;
      vi.setSystemTime(new Date(t));
      input.dispatchEvent(new KeyboardEvent("keydown", { key: c, bubbles: true }));
    }
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

    expect(onDetected).toHaveBeenCalledWith("5555");
    document.body.removeChild(input);
  });

  it("respects the enabled flag", () => {
    const onDetected = vi.fn();
    renderHook(() => useLaserScanner({ onDetected, enabled: false }));

    fireKeys(["1", "2", "3", "4"], 5);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));

    expect(onDetected).toHaveBeenCalledTimes(0);
  });
});

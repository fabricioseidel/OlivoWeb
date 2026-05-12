"use client";
import { Component, ErrorInfo, ReactNode } from "react";

interface Props { children: ReactNode }
interface State { hasError: boolean }

export class DevErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (process.env.NODE_ENV !== "development") return;
    fetch("/api/debug/client-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack,
        componentStack: info.componentStack,
      }),
    }).catch(() => {});
  }

  static getDerivedStateFromError(): State {
    return { hasError: false }; // no bloquea el render
  }

  render() { return this.props.children; }
}

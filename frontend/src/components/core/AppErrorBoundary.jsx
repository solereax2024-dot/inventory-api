import React from "react";

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error?.message || "Unexpected application error"
    };
  }

  componentDidCatch(error, errorInfo) {
    // Keep diagnostics in console to help pinpoint production-only UI crashes.
    // eslint-disable-next-line no-console
    console.error("AppErrorBoundary caught error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "24px",
          background: "#f8fafc",
          color: "#0f172a",
          fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
        }}
      >
        <section
          style={{
            width: "100%",
            maxWidth: "560px",
            border: "1px solid #cbd5e1",
            borderRadius: "14px",
            background: "#ffffff",
            padding: "20px"
          }}
        >
          <h1 style={{ margin: "0 0 8px", fontSize: "20px" }}>Something went wrong</h1>
          <p style={{ margin: "0 0 14px", color: "#475569", fontSize: "14px" }}>
            The page failed to render. Try reloading. If this keeps happening, open browser console and share the first error line.
          </p>
          <code
            style={{
              display: "block",
              background: "#f1f5f9",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              padding: "10px",
              fontSize: "12px",
              color: "#334155",
              wordBreak: "break-word"
            }}
          >
            {this.state.message}
          </code>
          <button
            type="button"
            onClick={this.handleReload}
            style={{
              marginTop: "14px",
              border: "1px solid #334155",
              background: "#0f172a",
              color: "#fff",
              padding: "10px 14px",
              borderRadius: "10px",
              cursor: "pointer"
            }}
          >
            Reload page
          </button>
        </section>
      </main>
    );
  }
}


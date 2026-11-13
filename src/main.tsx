import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./app";
import { ErrorBoundary } from "./components/error-boundary";
import "./index.css";

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Root element #root not found.");

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);

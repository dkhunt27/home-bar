import { Component, type ErrorInfo, type ReactNode } from "react";
import { useRouteError } from "react-router-dom";
import styles from "./error-boundary.module.css";
import ui from "./ui.module.css";

/** Last-resort screen for a crash: says what broke, offers a reload. */
export function ErrorScreen({ message }: { message: string }) {
  return (
    <div className="app-column">
      <main className={styles.screen}>
        <h1 className={ui.screenTitle}>Spilled something.</h1>
        <p className={styles.detail}>{message}</p>
        <button type="button" className={ui.primaryButton} onClick={() => window.location.reload()}>
          Reload
        </button>
      </main>
    </div>
  );
}

/** The router's errorElement: render errors inside a route land here, not in
 * React Router's built-in developer page. */
export function RouteError() {
  const error = useRouteError();
  console.error("[RouteError]", error);
  return <ErrorScreen message={error instanceof Error ? error.message : "Unexpected error"} />;
}

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/** Catches anything thrown outside the router (providers, the router itself). */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.error) return <ErrorScreen message={this.state.error.message} />;
    return this.props.children;
  }
}

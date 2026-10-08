import { cloneElement, isValidElement } from "react";
import { useTetrisAuth } from "../../hooks";
import TetrisRegistrationModal from "./TetrisRegistrationModal";

export default function TetrisGameWrapper({ children }) {
  const { isAuthenticated, isLoading, login, user } = useTetrisAuth();

  if (isLoading) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        color: "#fff",
        fontSize: "1.2rem",
      }}>
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <TetrisRegistrationModal
        isVisible={true}
        onAuthenticated={login}
        onClose={null}
      />
    );
  }

  if (isValidElement(children)) {
    return cloneElement(children, { authenticatedUser: user });
  }

  return children;
}


import { cloneElement, isValidElement } from "react";
import { useNavigate } from "react-router-dom";
import { useTetrisAuth } from "../../hooks";
import TetrisRegistrationModal from "./TetrisRegistrationModal";

export default function TetrisGameWrapper({ children }) {
  const { isAuthenticated, isLoading, login, user, token } = useTetrisAuth();
  const navigate = useNavigate();

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
        onClose={() => navigate("/collections")}
      />
    );
  }

  if (isValidElement(children)) {
    return cloneElement(children, {
      authenticatedUser: user,
      authenticatedToken: token,
    });
  }

  return children;
}


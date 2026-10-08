import { useEffect, useState } from "react";
import { X, Upload, AlertCircle, Check, Loader } from "lucide-react";
import { apiRequest } from "../../utils/api";
import "./TetrisRegistrationModal.css";

export default function TetrisRegistrationModal({ isVisible, onAuthenticated, onClose }) {
  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    password: "",
    profileImage: null,
    profileImagePreview: null,
  });
  const [mode, setMode] = useState("register");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    return () => {
      if (formData.profileImagePreview) {
        URL.revokeObjectURL(formData.profileImagePreview);
      }
    };
  }, [formData.profileImagePreview]);

  const isLoginMode = mode === "login";

  const resetMessages = () => {
    setError("");
    setSuccess("");
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    resetMessages();
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError("");
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        setError("Please upload a valid image file");
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("Image must be less than 5MB");
        return;
      }

      if (formData.profileImagePreview) {
        URL.revokeObjectURL(formData.profileImagePreview);
      }

      const preview = URL.createObjectURL(file);
      setFormData((prev) => ({
        ...prev,
        profileImage: file,
        profileImagePreview: preview,
      }));
      setError("");
    }
  };

  const validateForm = () => {
    if (!formData.username.trim()) {
      setError("Username is required");
      return false;
    }
    if (formData.username.length < 3) {
      setError("Username must be at least 3 characters");
      return false;
    }
    if (!formData.password) {
      setError("Password is required");
      return false;
    }
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return false;
    }
    if (!isLoginMode) {
      if (!formData.fullName.trim()) {
        setError("Full name is required");
        return false;
      }
      if (formData.fullName.length < 2) {
        setError("Full name must be at least 2 characters");
        return false;
      }
      if (!formData.profileImage) {
        setError("Profile image is required for authenticity");
        return false;
      }
    }
    return true;
  };

  const readResponseBody = async (response) => {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return response.json().catch(() => ({}));
    }
    const text = await response.text().catch(() => "");
    return text ? { message: text } : {};
  };

  if (!isVisible) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    resetMessages();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      let data;

      if (isLoginMode) {
        data = await apiRequest("/api/auth/login", "POST", {
          username: formData.username.trim(),
          password: formData.password,
        });
      } else {
        const formDataToSubmit = new FormData();
        formDataToSubmit.append("fullName", formData.fullName.trim());
        formDataToSubmit.append("username", formData.username.trim());
        formDataToSubmit.append("password", formData.password);
        formDataToSubmit.append("profileImage", formData.profileImage);

        const response = await fetch("/api/auth/register", {
          method: "POST",
          body: formDataToSubmit,
        });

        data = await readResponseBody(response);

        if (!response.ok) {
          throw new Error(data.message || "Registration failed. Please try again.");
        }
      }

      const session = {
        token: data?.token,
        username: data?.username || formData.username.trim(),
        fullName: data?.fullName || formData.fullName.trim() || data?.username || formData.username.trim(),
      };

      if (!session.token || !session.username) {
        throw new Error("Authentication failed. Please try again.");
      }

      setSuccess(isLoginMode ? "✓ Login successful! Starting game..." : "✓ Registration successful! Starting game...");

      window.setTimeout(() => {
        if (onAuthenticated) {
          onAuthenticated(session);
        }
      }, 900);
    } catch (err) {
      setError(err?.message || (isLoginMode ? "An error occurred during login" : "An error occurred during registration"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tetris-registration-overlay" role="dialog" aria-modal="true">
      <div className="tetris-registration-modal">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="tetris-registration-close-btn"
            aria-label="Close registration"
          >
            <X size={20} />
          </button>
        )}

        <div className="tetris-registration-header">
          <h2>{isLoginMode ? "Welcome Back" : "Register to Play"}</h2>
          <p className="tetris-registration-subtitle">
            {isLoginMode
              ? "Use your username and password to continue playing."
              : "Create your account first, then you can start playing right away."}
          </p>

          <div className="tetris-auth-mode-toggle" role="tablist" aria-label="Authentication mode">
            <button
              type="button"
              role="tab"
              aria-selected={!isLoginMode}
              className={`tetris-auth-mode-btn ${!isLoginMode ? "is-active" : ""}`}
              onClick={() => switchMode("register")}
              disabled={loading}
            >
              Register
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={isLoginMode}
              className={`tetris-auth-mode-btn ${isLoginMode ? "is-active" : ""}`}
              onClick={() => switchMode("login")}
              disabled={loading}
            >
              Login
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="tetris-registration-form">
          {!isLoginMode && (
            <>
              {/* Full Name Field */}
              <div className="tetris-form-group">
                <label htmlFor="fullName" className="tetris-form-label">
                  Full Name *
                </label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  className="tetris-form-input"
                  placeholder="Your full name"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  disabled={loading}
                />
              </div>

              {/* Profile Image Upload */}
              <div className="tetris-form-group">
                <label htmlFor="profileImage" className="tetris-form-label">
                  Profile Picture * <span className="tetris-form-hint">(Facebook screenshot for authenticity)</span>
                </label>
                <div className="tetris-image-upload-container">
                  {formData.profileImagePreview ? (
                    <div className="tetris-image-preview-wrapper">
                      <img
                        src={formData.profileImagePreview}
                        alt="Profile preview"
                        className="tetris-image-preview"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (formData.profileImagePreview) {
                            URL.revokeObjectURL(formData.profileImagePreview);
                          }
                          setFormData((prev) => ({
                            ...prev,
                            profileImage: null,
                            profileImagePreview: null,
                          }));
                        }}
                        className="tetris-image-remove-btn"
                        disabled={loading}
                      >
                        ✕ Remove
                      </button>
                    </div>
                  ) : (
                    <label className="tetris-image-upload-label">
                      <div className="tetris-image-upload-content">
                        <Upload size={32} />
                        <span>Click to upload image</span>
                        <small>PNG, JPG up to 5MB</small>
                      </div>
                      <input
                        type="file"
                        id="profileImage"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="tetris-file-input"
                        disabled={loading}
                      />
                    </label>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Username Field */}
          <div className="tetris-form-group">
            <label htmlFor="username" className="tetris-form-label">
              Username *
            </label>
            <input
              type="text"
              id="username"
              name="username"
              className="tetris-form-input"
              placeholder="Choose a username"
              value={formData.username}
              onChange={handleInputChange}
              disabled={loading}
            />
          </div>

          {/* Password Field */}
          <div className="tetris-form-group">
            <label htmlFor="password" className="tetris-form-label">
              Password *
            </label>
            <input
              type="password"
              id="password"
              name="password"
              className="tetris-form-input"
              placeholder="At least 6 characters"
              value={formData.password}
              onChange={handleInputChange}
              disabled={loading}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="tetris-form-error">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="tetris-form-success">
              <Check size={18} />
              <span>{success}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className="tetris-registration-submit-btn"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader size={18} className="tetris-spinner" />
                {isLoginMode ? "Logging In..." : "Creating Account..."}
              </>
            ) : (
              isLoginMode ? "Login & Play" : "Create Account & Play"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}


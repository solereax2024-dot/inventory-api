import { useEffect, useState } from "react";
import { X, Upload, AlertCircle, Check, Loader } from "lucide-react";
import { apiRequest } from "../../utils/api";
import { DEFAULT_GIVEAWAY_SETTINGS, giveawayImageList, normalizeGiveawaySettings } from "../../constants/giveaway";
import "./TetrisRegistrationModal.css";

export default function TetrisRegistrationModal({ isVisible, onAuthenticated, onClose }) {
  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    password: "",
    facebookWinnerContactConsent: false,
    profileImage: null,
    profileImagePreview: null,
  });
  const [mode, setMode] = useState("register");
  const [hasConfirmedFollow, setHasConfirmedFollow] = useState(false);
  const [giveawaySettings, setGiveawaySettings] = useState(DEFAULT_GIVEAWAY_SETTINGS);
  const [activePrizeImageIndex, setActivePrizeImageIndex] = useState(0);

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

  useEffect(() => {
    if (!isVisible) return;

    setHasConfirmedFollow(false);
    setMode("register");
    setError("");
    setSuccess("");
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) return undefined;

    let isCancelled = false;

    apiRequest("/api/public/settings/giveaway")
      .then((data) => {
        if (!isCancelled) {
          setGiveawaySettings(normalizeGiveawaySettings(data));
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setGiveawaySettings(DEFAULT_GIVEAWAY_SETTINGS);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [isVisible]);

  const prizeImageSources = giveawayImageList(giveawaySettings);

  useEffect(() => {
    setActivePrizeImageIndex(0);
  }, [isVisible, prizeImageSources.length]);

  useEffect(() => {
    if (!isVisible || prizeImageSources.length <= 1) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setActivePrizeImageIndex((previousIndex) => (previousIndex + 1) % prizeImageSources.length);
    }, 2600);

    return () => window.clearInterval(intervalId);
  }, [isVisible, prizeImageSources.length]);

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
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
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
        setError("Facebook profile image is required");
        return false;
      }
      if (!formData.facebookWinnerContactConsent) {
        setError("Please agree to be contacted via Facebook if you win.");
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
        formDataToSubmit.append("facebookWinnerContactConsent", String(formData.facebookWinnerContactConsent));
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
            className="tetris-modal-close tetris-registration-close-btn"
            aria-label="Close registration"
          >
            <X size={18} />
          </button>
        )}

        <div className="tetris-registration-header">
          <h2>
            {!hasConfirmedFollow
              ? (giveawaySettings.title || "Join the Giveaway")
              : (isLoginMode ? "Welcome Back" : "Register to Play")}
          </h2>
          <p className="tetris-registration-subtitle">
            {!hasConfirmedFollow
              ? (giveawaySettings.intro || "Play the Giveaway challenge for a chance to win. Before you continue, please confirm that you follow our page and can upload proof.")
              : (isLoginMode
                ? "Use your username and password to continue playing."
                : "Create your account first, then upload your Facebook profile screenshot for authenticity." )}
          </p>

          {hasConfirmedFollow ? (
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
          ) : null}
        </div>

        {!hasConfirmedFollow ? (
          <div className="tetris-registration-gate">
            <div className="tetris-registration-gate-card">
              {giveawaySettings.howToJoinTitle ? (
                <p className="tetris-registration-gate-label">{giveawaySettings.howToJoinTitle}</p>
              ) : null}

               {prizeImageSources.length > 0 ? (
                 <div className="tetris-bonus-prize-card tetris-registration-prize-card">
                   <div className="tetris-bonus-prize-image-rotator">
                     {prizeImageSources.map((imageSrc, index) => (
                       <img
                         key={`${imageSrc}-${index}`}
                         className={`tetris-bonus-prize-image${index === activePrizeImageIndex ? " is-active" : ""}`}
                         src={imageSrc}
                         alt={giveawaySettings.prizeImageAlt || "Giveaway prize"}
                       />
                     ))}
                   </div>
                   {prizeImageSources.length > 1 ? (
                     <div className="tetris-bonus-prize-rail" aria-label="Giveaway prize images">
                       {prizeImageSources.map((imageSrc, index) => (
                         <button
                           key={`prize-dot-${imageSrc}-${index}`}
                           type="button"
                           className={`tetris-bonus-prize-rail-dot${index === activePrizeImageIndex ? " is-active" : ""}`}
                           aria-label={`Show giveaway image ${index + 1}`}
                           aria-pressed={index === activePrizeImageIndex}
                           onClick={() => setActivePrizeImageIndex(index)}
                         />
                       ))}
                     </div>
                   ) : null}
                 </div>
               ) : null}

              {giveawaySettings.steps.filter((step) => Boolean(String(step || "").trim())).length ? (
                <ul className="tetris-registration-gate-list">
                  {giveawaySettings.steps
                    .filter((step) => Boolean(String(step || "").trim()))
                    .map((step) => (
                      <li key={step}>
                        <Check size={16} />
                        <span>{step}</span>
                      </li>
                    ))}
                </ul>
              ) : null}
              {giveawaySettings.accountDeletionNote ? (
                <div className="tetris-registration-gate-note" role="note">
                  <strong>Account Access Notice</strong>
                  <p>{giveawaySettings.accountDeletionNote}</p>
                </div>
              ) : null}
            </div>

            <div className="tetris-registration-gate-actions">
              {onClose ? (
                <button
                  type="button"
                  className="tetris-registration-secondary-btn"
                  onClick={onClose}
                >
                  Not Yet
                </button>
              ) : null}
              <button
                type="button"
                className="tetris-registration-submit-btn"
                onClick={() => setHasConfirmedFollow(true)}
              >
                I Follow, Continue
              </button>
            </div>
          </div>
        ) : (
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
                  Facebook Profile * <span className="tetris-form-hint">(Upload a Facebook profile screenshot for authenticity)</span>
                </label>
                <div className="tetris-image-upload-container">
                  {formData.profileImagePreview ? (
                    <div className="tetris-image-preview-wrapper">
                      <img
                        src={formData.profileImagePreview}
                          alt="Facebook profile preview"
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
                        <span>Upload Facebook profile screenshot</span>
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

          {!isLoginMode && (
            <label className="tetris-consent-card">
              <input
                type="checkbox"
                name="facebookWinnerContactConsent"
                className="tetris-consent-checkbox"
                checked={formData.facebookWinnerContactConsent}
                onChange={handleInputChange}
                disabled={loading}
              />
              <div className="tetris-consent-copy">
                <span className="tetris-consent-title">Winner contact consent *</span>
                <span className="tetris-consent-text">
                  I agree that I may be contacted using my Facebook profile details if I win the Tetris challenge.
                </span>
              </div>
            </label>
          )}

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
        )}
      </div>
    </div>
  );
}


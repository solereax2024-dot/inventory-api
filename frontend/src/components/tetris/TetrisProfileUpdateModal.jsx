import { useState, useEffect } from "react";
import { X, Upload, AlertCircle, Check, Loader, User } from "lucide-react";
import { getFriendlyUploadErrorMessage } from "../../utils/api";
import "./TetrisProfileUpdateModal.css";

export default function TetrisProfileUpdateModal({ isVisible, onClose, userToken, username, onUpdateSuccess }) {
  const [formData, setFormData] = useState({
    profileImage: null,
    profileImagePreview: null,
  });

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
    if (!isVisible) {
      setError("");
      setSuccess("");
      setFormData({
        profileImage: null,
        profileImagePreview: null,
      });
    }
  }, [isVisible]);

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
        setError("This image is too large. Please compress it or choose a smaller one (max 5MB).");
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.profileImage) {
      setError("Please select an image to upload");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const formDataToSubmit = new FormData();
      formDataToSubmit.append("profileImage", formData.profileImage);

      const response = await fetch("/api/auth/profile/update-image", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
        body: formDataToSubmit,
      });

      const contentType = response.headers.get("content-type") || "";
      let responseData;
      
      if (contentType.includes("application/json")) {
        responseData = await response.json().catch(() => ({}));
      } else {
        const text = await response.text().catch(() => "");
        responseData = text ? { message: text } : {};
      }

      if (!response.ok) {
        setError(
          responseData.message ||
          getFriendlyUploadErrorMessage(response, "Failed to update profile image. Please try again.")
        );
        return;
      }

      setSuccess("✓ Profile picture uploaded. Waiting for admin review.");
      setFormData({
        profileImage: null,
        profileImagePreview: null,
      });

      // Call callback and close after delay
      window.setTimeout(() => {
        if (onUpdateSuccess) {
          onUpdateSuccess();
        }
        onClose?.();
      }, 1500);
    } catch (err) {
      setError(err?.message || "An error occurred while updating your profile");
    } finally {
      setLoading(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="tetris-profile-update-overlay" role="dialog" aria-modal="true">
      <div className="tetris-profile-update-modal">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="tetris-modal-close tetris-profile-update-close-btn"
            aria-label="Close profile update"
          >
            <X size={18} />
          </button>
        )}

        <div className="tetris-profile-update-header">
          <div className="tetris-profile-update-icon">
            <User size={32} />
          </div>
          <h2>Update Profile Picture</h2>
          <p className="tetris-profile-update-subtitle">
            {username ? `Playing as ${username}` : "Update your profile"}
          </p>
          <p className="tetris-profile-update-note">
            Please upload the same profile image you use on Facebook so we can easily identify and contact you if you win.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="tetris-profile-update-form">
          {/* Profile Image Upload */}
          <div className="tetris-form-group">
            <label htmlFor="profileImage" className="tetris-form-label">
              New Profile Picture <span className="tetris-form-hint">(JPG, PNG up to 5MB)</span>
            </label>
            <div className="tetris-profile-image-upload-container">
              {formData.profileImagePreview ? (
                <div className="tetris-profile-image-preview-wrapper">
                  <img
                    src={formData.profileImagePreview}
                    alt="Profile picture preview"
                    className="tetris-profile-image-preview"
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
                    className="tetris-profile-image-remove-btn"
                    disabled={loading}
                  >
                    ✕ Remove
                  </button>
                </div>
              ) : (
                <label className="tetris-profile-image-upload-label">
                  <div className="tetris-profile-image-upload-content">
                    <Upload size={40} />
                    <span>Upload your profile picture</span>
                    <small>Click to select or drag & drop</small>
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

          {/* Error Message */}
          {error && (
            <div className="tetris-profile-form-error">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="tetris-profile-form-success">
              <Check size={18} />
              <span>{success}</span>
            </div>
          )}

          {/* Submit Button */}
          <div className="tetris-profile-update-actions">
            {onClose && (
              <button
                type="button"
                className="tetris-profile-cancel-btn"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="tetris-profile-submit-btn"
              disabled={loading || !formData.profileImage}
            >
              {loading ? (
                <>
                  <Loader size={18} className="tetris-spinner" />
                  Updating...
                </>
              ) : (
                "Update Picture"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


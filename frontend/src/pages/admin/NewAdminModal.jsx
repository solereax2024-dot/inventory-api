export default function NewAdminModal({
  newAdminModal,
  setNewAdminModal,
  newAdminForm,
  setNewAdminForm,
  createAdminUser
}) {
  if (!newAdminModal.isOpen) return null;

  return (
    <div className="modal-overlay" onClick={() => setNewAdminModal({ isOpen: false })}>
      <section className="modal-panel modal-panel-compact" onClick={(e) => e.stopPropagation()}>
        <div className="breakdown-header">
          <h2>Add Admin User</h2>
          <button type="button" className="modal-close-btn" onClick={() => setNewAdminModal({ isOpen: false })}>
            ✕
          </button>
        </div>
        <input
          type="text"
          placeholder="Username"
          value={newAdminForm.username}
          onChange={(e) => setNewAdminForm((prev) => ({ ...prev, username: e.target.value }))}
          autoFocus
          style={{ marginBottom: "10px" }}
        />
        <input
          type="password"
          placeholder="Password (min 8 characters)"
          value={newAdminForm.password}
          onChange={(e) => setNewAdminForm((prev) => ({ ...prev, password: e.target.value }))}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              createAdminUser();
            }
          }}
          style={{ marginBottom: "16px" }}
        />
        <button type="button" className="btn-primary" onClick={createAdminUser}>
          Add Admin
        </button>
      </section>
    </div>
  );
}

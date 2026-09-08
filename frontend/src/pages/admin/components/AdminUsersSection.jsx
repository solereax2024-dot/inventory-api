import { PlusCircle, ShieldCheck, ShieldX } from "lucide-react";

export default function AdminUsersSection({
  adminUsers,
  onAddAdmin,
  onToggleUserStatus,
  onError
}) {
  return (
    <section className="card products-card admin-section">
      <div className="section-head">
        <h2>Admin Users</h2>
        <button type="button" className="btn-primary" onClick={onAddAdmin}>
          <PlusCircle size={16} />
          <span>Add Admin</span>
        </button>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Role</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {adminUsers.map((user) => (
              <tr key={user.id}>
                <td>{user.username}</td>
                <td>{user.role}</td>
                <td>{user.enabled ? "Active" : "Disabled"}</td>
                <td>
                  {user.role === "ADMIN" ? (
                    <div className="admin-user-action">
                      {user.enabled ? (
                        <button
                          type="button"
                          className="btn-delete admin-action-btn quick-tooltip"
                          data-tooltip="Disable"
                          aria-label="Disable admin"
                          onClick={() => onToggleUserStatus(user.id, false).catch((err) => onError(err.message))}
                        >
                          <ShieldX size={15} />
                          <span className="admin-action-label">Disable</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="admin-action-btn quick-tooltip"
                          data-tooltip="Enable"
                          aria-label="Enable admin"
                          onClick={() => onToggleUserStatus(user.id, true).catch((err) => onError(err.message))}
                        >
                          <ShieldCheck size={15} />
                          <span className="admin-action-label">Enable</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    "-"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}


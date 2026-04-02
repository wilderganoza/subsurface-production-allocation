import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { useApp } from '../context/AppContext';
import '../components/ui/ui.css';
import './ModulePage.css';

function UserFormModal({ mode, initialValues, onClose, onSubmit }) {
  const [username, setUsername] = useState(initialValues?.username || '');
  const [isAdmin, setIsAdmin] = useState(initialValues?.is_admin || false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const title = mode === 'create' ? 'Create User' : 'Edit User';
  const requirePassword = mode === 'create';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!username.trim()) {
      setError('Username is required');
      return;
    }

    if (requirePassword && password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    setSaving(true);
    try {
      await onSubmit({ username: username.trim(), password: password || undefined, is_admin: isAdmin });
    } catch (err) {
      setError(err.message || 'Failed to save user');
      setSaving(false);
      return;
    }
    setSaving(false);
    onClose();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="btn btn-icon" onClick={onClose}>
            &times;
          </button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label>Username</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} disabled={saving} />
          </div>

          <div className="form-group checkbox">
            <label>
              <input
                type="checkbox"
                checked={isAdmin}
                onChange={(e) => setIsAdmin(e.target.checked)}
                disabled={saving}
              />
              Administrator
            </label>
          </div>

          <div className="form-group">
            <label>{requirePassword ? 'Password' : 'New Password (optional)'}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={requirePassword ? 'Enter password' : 'Leave blank to keep current'}
              disabled={saving}
            />
          </div>

          <div className="form-group">
            <label>{requirePassword ? 'Confirm Password' : 'Confirm (if changing)'}</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder={requirePassword ? 'Confirm password' : 'Required if new password entered'}
              disabled={saving}
            />
          </div>

          {error && <div className="module-status error">{error}</div>}

          <div className="modal-footer">
            <button type="button" className="btn" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ConfirmDeleteModal({ user, onClose, onConfirm }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  const handleDelete = async () => {
    setError(null);
    setDeleting(true);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to delete user');
      setDeleting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-header">
          <h3>Delete User</h3>
          <button className="btn btn-icon" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="modal-body">
          <p>
            Are you sure you want to delete <strong>{user.username}</strong>? This action cannot be undone.
          </p>
          {error && <div className="module-status error">{error}</div>}
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose} disabled={deleting}>
            Cancel
          </button>
          <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const { state, dispatch } = useApp();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [deleteUser, setDeleteUser] = useState(null);

  const filteredUsers = useMemo(() => {
    if (!filter.trim()) return users;
    const lower = filter.trim().toLowerCase();
    return users.filter(u => u.username.toLowerCase().includes(lower));
  }, [users, filter]);

  useEffect(() => {
    if (!state.user?.is_admin) {
      dispatch({ type: 'SET_MODULE', payload: 'wells' });
      return;
    }

    api.getAdminUsers()
      .then(data => setUsers(data))
      .catch(err => setError(err.message || 'Failed to load users'))
      .finally(() => setLoading(false));
  }, [state.user, dispatch]);

  const refreshUsers = async () => {
    const data = await api.getAdminUsers();
    setUsers(data);
  };

  const handleCreate = async (payload) => {
    await api.createAdminUser(payload);
    await refreshUsers();
  };

  const handleUpdate = async (payload) => {
    await api.updateAdminUser(editUser.id, payload);
    await refreshUsers();
  };

  const handleDelete = async () => {
    await api.deleteAdminUser(deleteUser.id);
    await refreshUsers();
  };

  if (!state.user?.is_admin) {
    return null;
  }

  return (
    <div className="module-page">
      <div className="module-header">
        <div>
          <h2>User Management</h2>
          <p className="module-desc">
            Create, update, and remove application users. Only administrators can access this module.
          </p>
        </div>
        <div className="module-header-actions">
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            + New User
          </button>
        </div>
      </div>

      {error && <div className="module-status error">{error}</div>}
      {loading ? (
        <div className="module-status info">Loading users…</div>
      ) : filteredUsers.length === 0 ? (
        <div className="module-status info">No users found.</div>
      ) : (
        <div className="wells-table-wrapper">
          <table className="wells-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Username</th>
                <th>Role</th>
                <th>Created at</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td>{user.username}</td>
                  <td>{user.is_admin ? 'Admin' : 'Standard'}</td>
                  <td>{new Date(user.created_at).toLocaleDateString()}</td>
                  <td>
                    <div className="table-actions">
                      <button className="btn btn-sm" onClick={() => setEditUser(user)}>
                        Edit
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => setDeleteUser(user)}
                        disabled={user.id === state.user.id}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <UserFormModal
          mode="create"
          onClose={() => setShowCreate(false)}
          onSubmit={handleCreate}
        />
      )}

      {editUser && (
        <UserFormModal
          mode="edit"
          initialValues={editUser}
          onClose={() => setEditUser(null)}
          onSubmit={handleUpdate}
        />
      )}

      {deleteUser && (
        <ConfirmDeleteModal
          user={deleteUser}
          onClose={() => setDeleteUser(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}

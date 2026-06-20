import React from 'react';

interface LoginScreenProps {
  newUsername: string;
  setNewUsername: (username: string) => void;
  newPassword: string;
  setNewPassword: (password: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  error: string;
  loading: boolean;
}

export function LoginScreen({
  newUsername,
  setNewUsername,
  newPassword,
  setNewPassword,
  onSubmit,
  error,
  loading,
}: LoginScreenProps): React.JSX.Element {
  return (
    <div className="modal">
      <div className="modal-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <img src="/logo.png" alt="Edu App Logo" style={{ width: '64px', height: '64px', borderRadius: '12px', marginBottom: '12px' }} />
        <h2 style={{ marginBottom: '8px' }}>Edu App</h2>
        <p className="modal-hint" style={{ textAlign: 'center' }}>Enter your username and password to sign in or create an account.</p>
        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              required
              placeholder="Enter your username"
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              placeholder="Enter your password (min 6 characters)"
              minLength={6}
            />
          </div>
          {error && <div className="error">{error}</div>}
          <div className="button-group">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Entering…' : 'Enter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

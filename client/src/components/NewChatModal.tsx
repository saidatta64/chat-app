import React from 'react';

interface NewChatModalProps {
  selectedUserId: string;
  setSelectedUserId: (id: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  loading: boolean;
}

export function NewChatModal({
  selectedUserId,
  setSelectedUserId,
  onSubmit,
  onClose,
  loading,
}: NewChatModalProps): React.JSX.Element {
  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Start New Chat</h2>
        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label>User ID</label>
            <input
              type="text"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              required
              placeholder="Paste user ID here"
              autoFocus
            />
            <small>💡 Share your ID (tap the ID badge in the header) and ask them to paste it here.</small>
          </div>
          <div className="button-group">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating…' : 'Create Chat'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

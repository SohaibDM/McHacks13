import React from 'react';
import './DeleteConfirmModal.css';

interface Props {
  visible: boolean;
  itemName?: string;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
}

const DeleteConfirmModal: React.FC<Props> = ({ visible, itemName, onClose, onConfirm }) => {
  if (!visible) return null;

  return (
    <div className="del-modal-overlay">
      <div className="del-modal">
        <div className="del-header">
          <h3>Confirm Delete</h3>
        </div>

        <div className="del-body">
          <p>Are you sure you want to delete <strong>{itemName}</strong>? This action cannot be undone.</p>
        </div>

        <div className="del-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal;

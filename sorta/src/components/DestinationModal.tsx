import React, { useState, useMemo } from 'react';
import { Folder } from 'lucide-react';
import './DestinationModal.css';

interface Props {
  visible: boolean;
  tree: any[]; // array of FileItem-like nodes
  onClose: () => void;
  onConfirm: (destination: string) => Promise<void> | void;
  title?: string;
}

const DestinationModal: React.FC<Props> = ({ visible, tree, onClose, onConfirm, title }) => {
  const [selected, setSelected] = useState<string | null>(null);

  // Build a flat list of folders with path for quick display when confirming
  const folders = useMemo(() => {
    const out: { name: string; path: string }[] = [];
    const walk = (nodes: any[]) => {
      for (const n of nodes || []) {
        if (!n) continue;
        if (n.type === 'folder') {
          out.push({ name: n.name, path: n.path });
          if (n.children && n.children.length) walk(n.children);
        }
      }
    };
    walk(tree || []);
    // ensure root is selectable
    out.unshift({ name: 'My Files', path: '/' });
    return out;
  }, [tree]);

  if (!visible) return null;

  return (
    <div className="dst-modal-overlay">
      <div className="dst-modal">
        <div className="dst-header">
          <h3>{title || 'Select Destination'}</h3>
          <button className="dst-close" onClick={onClose}>✕</button>
        </div>

        <div className="dst-body">
          <div className="dst-list">
            {folders.map(f => (
              <button
                key={f.path}
                className={`dst-item ${selected === f.path ? 'selected' : ''}`}
                onClick={() => setSelected(f.path)}
              >
                <span className="dst-icon"><Folder size={16} /></span>
                <span className="dst-name">{f.path === '/' ? 'My Files (root)' : f.path}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="dst-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!selected} onClick={() => { if (selected) onConfirm(selected); }}>Move Here</button>
        </div>
      </div>
    </div>
  );
};

export default DestinationModal;

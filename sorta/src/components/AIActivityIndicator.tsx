import React, { useState, useEffect } from 'react';
import { Sparkles, CheckCircle2 } from 'lucide-react';
import './AIActivityIndicator.css';

interface AIActivity {
  id: string;
  message: string;
  status: 'processing' | 'completed';
  timestamp: Date;
}

const AIActivityIndicator: React.FC = () => {
  const [activities, setActivities] = useState<AIActivity[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  // Simulate AI activities
  useEffect(() => {
    const simulateActivity = () => {
      const messages = [
        'Analyzing "Financial Report Q4.pdf"...',
        'Moving "Vacation Photos.jpg" to Personal/Photos',
        'Organizing recent downloads...',
        'Creating "Tax Documents 2026" folder',
        'Sorted 3 files into Work/Projects'
      ];

      const randomMessage = messages[Math.floor(Math.random() * messages.length)];
      
      const newActivity: AIActivity = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
        message: randomMessage,
        status: 'processing',
        timestamp: new Date()
      };

      setActivities(prev => [newActivity, ...prev].slice(0, 5));
      setIsVisible(true);

      // Mark as completed after 3 seconds
      setTimeout(() => {
        setActivities(prev =>
          prev.map(a => a.id === newActivity.id ? { ...a, status: 'completed' } : a)
        );
      }, 3000);

      // Hide after 5 seconds
      setTimeout(() => {
        setIsVisible(false);
      }, 5000);
    };

    // Simulate activity every 10-20 seconds
    const interval = setInterval(() => {
      if (Math.random() > 0.3) {
        simulateActivity();
      }
    }, 15000);

    // Initial activity after 3 seconds
    setTimeout(simulateActivity, 3000);

    return () => clearInterval(interval);
  }, []);

  if (!isVisible || activities.length === 0) {
    return null;
  }

  return (
    <div className="ai-activity-indicator">
      <div className="ai-activity-header">
        <Sparkles size={16} />
        <span>AI Activity</span>
      </div>
      <div className="ai-activity-list">
        {activities.slice(0, 3).map(activity => (
          <div key={activity.id} className={`ai-activity-item ${activity.status}`}>
            <div className="activity-icon">
              {activity.status === 'processing' ? (
                <div className="spinner" />
              ) : (
                <CheckCircle2 size={14} />
              )}
            </div>
            <span className="activity-message">{activity.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AIActivityIndicator;

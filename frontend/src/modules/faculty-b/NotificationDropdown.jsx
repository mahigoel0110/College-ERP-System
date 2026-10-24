import { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';

export default function NotificationDropdown({ token }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ notifications: [], unread_count: 0 });
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  async function loadNotifications() {
    if (!token) return;
    try {
      setLoading(true);
      const res = await api('/faculty/notifications', { token });
      setData(res || { notifications: [], unread_count: 0 });
    } catch (e) {
      // silent fail for notification polling
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000); // 30s poll
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function markAsRead(id) {
    try {
      await api(`/faculty/notifications/${id}/read`, { token, method: 'POST' });
      setData(prev => ({
        ...prev,
        unread_count: Math.max(0, prev.unread_count - 1),
        notifications: prev.notifications.map(n => n.notification_id === id ? { ...n, is_read: 1 } : n)
      }));
    } catch (e) {
      console.error(e);
    }
  }

  async function markAllAsRead() {
    try {
      await api('/faculty/notifications/read-all', { token, method: 'POST' });
      setData(prev => ({
        ...prev,
        unread_count: 0,
        notifications: prev.notifications.map(n => ({ ...n, is_read: 1 }))
      }));
    } catch (e) {
      console.error(e);
    }
  }

  function formatTime(isoStr) {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="notif-dropdown-wrap" ref={dropdownRef}>
      <button 
        type="button" 
        className="notif-btn" 
        onClick={() => setOpen(!open)}
        aria-label="View notifications"
        title="In-app notifications"
      >
        <span aria-hidden="true">🔔</span>
        <span>Alerts</span>
        {data.unread_count > 0 && (
          <span className="notif-count-pill">{data.unread_count}</span>
        )}
      </button>

      {open && (
        <div className="notif-menu">
          <div className="notif-menu-header">
            <span>Notifications ({data.notifications.length})</span>
            {data.unread_count > 0 && (
              <button 
                type="button" 
                className="btn btn-link btn-sm p-0 text-decoration-none" 
                style={{ fontSize: '11px', color: '#2563eb' }}
                onClick={markAllAsRead}
              >
                Mark all read
              </button>
            )}
          </div>
          <ul className="notif-list">
            {data.notifications.length === 0 ? (
              <li className="p-3 text-center text-muted" style={{ fontSize: '12px' }}>
                No notifications right now.
              </li>
            ) : (
              data.notifications.map(n => (
                <li 
                  key={n.notification_id} 
                  className={`notif-item${!n.is_read ? ' unread' : ''}`}
                  onClick={() => !n.is_read && markAsRead(n.notification_id)}
                >
                  <div className="notif-title">
                    {!n.is_read && <span style={{ color: '#2563eb', marginRight: '5px' }}>●</span>}
                    {n.title}
                  </div>
                  <div className="notif-body">{n.message}</div>
                  <div className="notif-time">{formatTime(n.created_at)}</div>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import { useAdminLiveSync } from '../../../hooks/useAdminLiveSync';
import { AdminReminder } from '../../../types';
import { playerCrmApi } from '../../../services/playerCrmApi';
import { Clock, CheckCircle2, AlertCircle, Plus, Trash2, Check, RefreshCw, Calendar, User } from 'lucide-react';

interface AdminRemindersViewProps {
  passcode: string;
  onViewPlayer?: (playerId: string) => void;
}

export const AdminRemindersView: React.FC<AdminRemindersViewProps> = ({ passcode, onViewPlayer }) => {
  const [reminders, setReminders] = useState<AdminReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('pending');

  // New reminder form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newDueDate, setNewDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().slice(0, 10);
  });
  const [submitting, setSubmitting] = useState(false);

  const loadReminders = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await playerCrmApi.getAdminReminders(passcode, { status: statusFilter });
      setReminders(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load reminders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReminders();
  }, [statusFilter]);

  const handleToggle = async (r: AdminReminder) => {
    const nextStatus = r.status === 'completed' ? 'pending' : 'completed';
    try {
      await playerCrmApi.updateAdminReminder(passcode, r.id, {
        status: nextStatus,
        completedAt: nextStatus === 'completed' ? new Date().toISOString() : undefined,
      });
      loadReminders();
    } catch (err: any) {
      alert(err.message || 'Failed to update reminder.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this reminder?')) return;
    try {
      await playerCrmApi.deleteAdminReminder(passcode, id);
      loadReminders();
    } catch (err: any) {
      alert(err.message || 'Failed to delete reminder.');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setSubmitting(true);
    try {
      await playerCrmApi.createAdminReminder(passcode, {
        title: newTitle.trim(),
        playerName: newPlayerName.trim() || 'General Customer',
        dueDate: newDueDate,
        status: 'pending',
      });
      setNewTitle('');
      setNewPlayerName('');
      setShowAddForm(false);
      loadReminders();
    } catch (err: any) {
      alert(err.message || 'Failed to create reminder.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-brand-surface border border-brand-border rounded-3xl p-5 shadow-xl">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand-orange" />
            CRM Follow-Up Reminders
          </h3>
          <p className="text-xs text-brand-subtle">
            Scheduled customer reminders, feedback check-ins, and tournament invites.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-brand-surfaceElevated border border-brand-border rounded-xl px-3 py-1.5 text-xs text-white font-mono"
          >
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="all">All Reminders</option>
          </select>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-3 py-1.5 rounded-xl bg-brand-pink hover:bg-brand-pinkHover text-white text-xs font-mono font-bold flex items-center gap-1.5 shadow-luxury-pink"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Reminder</span>
          </button>
        </div>
      </div>

      {showAddForm && (
        <form onSubmit={handleCreate} className="bg-brand-surface border border-brand-border rounded-3xl p-5 shadow-xl space-y-3 animate-fadeIn">
          <h4 className="text-xs font-bold text-white uppercase font-mono">Create Follow-Up Reminder</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              required
              placeholder="Reminder Title (e.g. Call for FC25 tournament)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="sm:col-span-1 px-3 py-2 text-xs rounded-xl bg-brand-surfaceElevated border border-brand-border text-white"
            />
            <input
              type="text"
              placeholder="Player Name (Optional)"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl bg-brand-surfaceElevated border border-brand-border text-white"
            />
            <input
              type="date"
              required
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl bg-brand-surfaceElevated border border-brand-border text-white font-mono"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 rounded-xl text-xs font-mono text-brand-subtle hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-1.5 rounded-xl bg-brand-pink text-white text-xs font-mono font-bold"
            >
              {submitting ? 'Saving...' : 'Save Reminder'}
            </button>
          </div>
        </form>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Reminders List */}
      <div className="bg-brand-surface border border-brand-border rounded-3xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-brand-subtle font-mono">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-brand-pink mb-2" />
            <span>Loading reminders...</span>
          </div>
        ) : reminders.length === 0 ? (
          <div className="p-12 text-center text-brand-subtle space-y-2">
            <Clock className="w-8 h-8 mx-auto text-brand-subtle/50" />
            <p className="text-xs font-mono">No reminders found in this view.</p>
          </div>
        ) : (
          <div className="divide-y divide-brand-border/40">
            {reminders.map((r) => {
              const isPastDue = r.status === 'pending' && r.dueDate < new Date().toISOString().slice(0, 10);
              return (
                <div
                  key={r.id}
                  className="p-4 flex items-center justify-between gap-4 hover:bg-brand-surfaceElevated/40 transition"
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => handleToggle(r)}
                      className={`w-5 h-5 rounded-md border flex items-center justify-center mt-0.5 transition ${
                        r.status === 'completed'
                          ? 'bg-emerald-600 border-emerald-500 text-white'
                          : 'border-brand-border hover:border-brand-pink'
                      }`}
                    >
                      {r.status === 'completed' && <Check className="w-3.5 h-3.5" />}
                    </button>
                    <div>
                      <span className={`text-xs font-bold block ${
                        r.status === 'completed' ? 'line-through text-brand-subtle' : 'text-white'
                      }`}>
                        {r.title}
                      </span>
                      <div className="flex items-center gap-3 text-[11px] font-mono text-brand-subtle mt-0.5">
                        {r.playerName && (
                          <span className="flex items-center gap-1 text-[#ED249B]">
                            <User className="w-3 h-3" />
                            {r.playerName}
                          </span>
                        )}
                        <span className={`flex items-center gap-1 ${isPastDue ? 'text-red-400 font-bold' : ''}`}>
                          <Calendar className="w-3 h-3" />
                          Due: {r.dueDate} {isPastDue && '(Overdue)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {r.playerId && onViewPlayer && (
                      <button
                        type="button"
                        onClick={() => r.playerId && onViewPlayer(r.playerId)}
                        className="text-[10px] font-mono px-2 py-1 rounded bg-brand-surfaceElevated hover:bg-brand-surface text-brand-subtle hover:text-white"
                      >
                        Profile →
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(r.id)}
                      className="p-1.5 rounded-lg text-brand-subtle hover:text-red-400 hover:bg-brand-surfaceElevated"
                      title="Delete Reminder"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

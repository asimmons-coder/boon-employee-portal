import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import {
  fetchSlackConnectionStatus,
  getSlackConnectUrl,
  disconnectSlack,
  updateSlackSettings,
  fetchNudgeHistory,
} from '../lib/dataFetcher';
import type { SlackConnectionStatus, SlackNudge } from '../lib/types';

export default function Settings() {
  const { employee, signOut } = useAuth();
  const [slackStatus, setSlackStatus] = useState<SlackConnectionStatus>({
    connected: false,
    settings: null,
  });
  const [nudgeHistory, setNudgeHistory] = useState<SlackNudge[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  // Form state
  const [nudgeEnabled, setNudgeEnabled] = useState(true);
  const [nudgeFrequency, setNudgeFrequency] = useState<'smart' | 'daily' | 'weekly' | 'none'>('smart');
  const [preferredTime, setPreferredTime] = useState('09:00');
  const [timezone, setTimezone] = useState('America/New_York');

  // Check for success/error params from OAuth redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('slack_connected') === 'true') {
      // Clear the URL param
      window.history.replaceState({}, '', window.location.pathname);
    }
    if (params.get('error')) {
      console.error('Slack connection error:', params.get('error'));
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [status, history] = await Promise.all([
          fetchSlackConnectionStatus(),
          employee?.company_email ? fetchNudgeHistory(employee.company_email) : Promise.resolve([]),
        ]);

        setSlackStatus(status);
        setNudgeHistory(history);

        // Initialize form with current settings
        if (status.settings) {
          setNudgeEnabled(status.settings.nudge_enabled);
          setNudgeFrequency(status.settings.nudge_frequency);
          setPreferredTime(status.settings.preferred_time?.slice(0, 5) || '09:00');
          setTimezone(status.settings.timezone || 'America/New_York');
        }
      } catch (err) {
        console.error('Error loading settings:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [employee?.company_email]);

  async function handleSaveSettings() {
    setSaving(true);
    try {
      const success = await updateSlackSettings({
        nudge_enabled: nudgeEnabled,
        nudge_frequency: nudgeFrequency,
        preferred_time: preferredTime,
        timezone,
      });

      if (success) {
        setSlackStatus((prev) => ({
          ...prev,
          settings: prev.settings
            ? {
                ...prev.settings,
                nudge_enabled: nudgeEnabled,
                nudge_frequency: nudgeFrequency,
                preferred_time: preferredTime,
                timezone,
              }
            : null,
        }));
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm('Are you sure you want to disconnect Slack? You will stop receiving coaching nudges.')) {
      return;
    }

    setDisconnecting(true);
    try {
      const success = await disconnectSlack();
      if (success) {
        setSlackStatus({ connected: false, settings: null });
      }
    } finally {
      setDisconnecting(false);
    }
  }

  function handleConnect() {
    if (employee?.company_email) {
      window.location.href = getSlackConnectUrl(employee.company_email);
    }
  }

  const timezones = [
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'America/Phoenix', label: 'Arizona (no DST)' },
    { value: 'Pacific/Honolulu', label: 'Hawaii Time' },
    { value: 'America/Anchorage', label: 'Alaska Time' },
    { value: 'Europe/London', label: 'London (GMT/BST)' },
    { value: 'Europe/Paris', label: 'Central European Time' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-boon-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-boon-text">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your notifications and integrations</p>
      </div>

      {/* Slack Integration Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#4A154B] rounded-xl flex items-center justify-center">
              <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.124 2.521a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.52 2.521h-2.522V8.834zm-1.271 0a2.528 2.528 0 0 1-2.521 2.521 2.528 2.528 0 0 1-2.521-2.521V2.522A2.528 2.528 0 0 1 15.166 0a2.528 2.528 0 0 1 2.521 2.522v6.312zm-2.521 10.124a2.528 2.528 0 0 1 2.521 2.522A2.528 2.528 0 0 1 15.166 24a2.528 2.528 0 0 1-2.521-2.52v-2.522h2.521zm0-1.271a2.528 2.528 0 0 1-2.521-2.521 2.528 2.528 0 0 1 2.521-2.521h6.312A2.528 2.528 0 0 1 24 15.165a2.528 2.528 0 0 1-2.52 2.521h-6.313z" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-boon-text">Slack Nudges</h2>
              <p className="text-sm text-gray-500">
                Get friendly reminders about your coaching goals and action items
              </p>
            </div>
            {slackStatus.connected ? (
              <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
                Connected
              </span>
            ) : (
              <span className="px-3 py-1 bg-gray-100 text-gray-500 text-sm font-medium rounded-full">
                Not connected
              </span>
            )}
          </div>
        </div>

        {slackStatus.connected ? (
          <div className="p-6 space-y-6">
            {/* Nudge Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-boon-text">Enable Nudges</h3>
                <p className="text-sm text-gray-500">Receive Slack messages about your coaching journey</p>
              </div>
              <button
                onClick={() => setNudgeEnabled(!nudgeEnabled)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  nudgeEnabled ? 'bg-boon-blue' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    nudgeEnabled ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {nudgeEnabled && (
              <>
                {/* Frequency */}
                <div>
                  <h3 className="font-medium text-boon-text mb-3">Nudge Frequency</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { value: 'smart', label: 'Smart', desc: 'Based on your activity' },
                      { value: 'daily', label: 'Daily', desc: 'Once per day' },
                      { value: 'weekly', label: 'Weekly', desc: 'Monday digest' },
                      { value: 'none', label: 'None', desc: 'Only urgent' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setNudgeFrequency(option.value as typeof nudgeFrequency)}
                        className={`p-3 rounded-xl border-2 text-left transition-colors ${
                          nudgeFrequency === option.value
                            ? 'border-boon-blue bg-boon-lightBlue/30'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-medium text-boon-text">{option.label}</div>
                        <div className="text-xs text-gray-500">{option.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preferred Time */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium text-boon-text mb-2">Preferred Time</label>
                    <input
                      type="time"
                      value={preferredTime}
                      onChange={(e) => setPreferredTime(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-boon-blue/20 focus:border-boon-blue"
                    />
                    <p className="text-xs text-gray-500 mt-1">Nudges will be sent around this time</p>
                  </div>
                  <div>
                    <label className="block font-medium text-boon-text mb-2">Timezone</label>
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-boon-blue/20 focus:border-boon-blue"
                    >
                      {timezones.map((tz) => (
                        <option key={tz.value} value={tz.value}>
                          {tz.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            )}

            {/* Save / Disconnect buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="px-4 py-2 text-red-600 hover:text-red-700 font-medium text-sm transition-colors disabled:opacity-50"
              >
                {disconnecting ? 'Disconnecting...' : 'Disconnect Slack'}
              </button>
              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="px-6 py-2.5 bg-boon-blue text-white font-medium rounded-xl hover:bg-boon-blue/90 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6">
            <div className="bg-boon-lightBlue/30 rounded-xl p-4 mb-4">
              <h3 className="font-medium text-boon-text mb-2">What you'll get:</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-boon-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Reminders about your action items before they're due
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-boon-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Check-ins on your coaching goals a few days after sessions
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-boon-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Session prep prompts before upcoming coaching sessions
                </li>
              </ul>
            </div>
            <button
              onClick={handleConnect}
              className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-[#4A154B] text-white font-medium rounded-xl hover:bg-[#3a1039] transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.124 2.521a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.52 2.521h-2.522V8.834zm-1.271 0a2.528 2.528 0 0 1-2.521 2.521 2.528 2.528 0 0 1-2.521-2.521V2.522A2.528 2.528 0 0 1 15.166 0a2.528 2.528 0 0 1 2.521 2.522v6.312zm-2.521 10.124a2.528 2.528 0 0 1 2.521 2.522A2.528 2.528 0 0 1 15.166 24a2.528 2.528 0 0 1-2.521-2.52v-2.522h2.521zm0-1.271a2.528 2.528 0 0 1-2.521-2.521 2.528 2.528 0 0 1 2.521-2.521h6.312A2.528 2.528 0 0 1 24 15.165a2.528 2.528 0 0 1-2.52 2.521h-6.313z" />
              </svg>
              Connect Slack
            </button>
          </div>
        )}
      </div>

      {/* Nudge History (only show if connected and has history) */}
      {slackStatus.connected && nudgeHistory.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-boon-text">Recent Nudges</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {nudgeHistory.slice(0, 5).map((nudge) => (
              <div key={nudge.id} className="p-4 flex items-center gap-4">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    nudge.status === 'responded'
                      ? 'bg-green-100'
                      : nudge.status === 'sent'
                      ? 'bg-blue-100'
                      : 'bg-gray-100'
                  }`}
                >
                  {nudge.nudge_type === 'action_reminder' && (
                    <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  )}
                  {nudge.nudge_type === 'goal_checkin' && (
                    <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  {nudge.nudge_type === 'session_prep' && (
                    <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-boon-text">
                    {nudge.nudge_type === 'action_reminder' && 'Action Reminder'}
                    {nudge.nudge_type === 'goal_checkin' && 'Goal Check-in'}
                    {nudge.nudge_type === 'session_prep' && 'Session Prep'}
                    {nudge.nudge_type === 'weekly_digest' && 'Weekly Digest'}
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(nudge.sent_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
                <div>
                  {nudge.status === 'responded' && nudge.response && (
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                      {nudge.response.replace('action_', '').replace('progress_', '')}
                    </span>
                  )}
                  {nudge.status === 'sent' && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs font-medium rounded-full">
                      Sent
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Account Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-boon-text">Account</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-boon-text">
                {employee?.first_name} {employee?.last_name}
              </div>
              <div className="text-sm text-gray-500">{employee?.company_email}</div>
            </div>
          </div>
          <div className="pt-4 border-t border-gray-100">
            <button
              onClick={signOut}
              className="flex items-center gap-2 text-red-600 hover:text-red-700 font-medium text-sm transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

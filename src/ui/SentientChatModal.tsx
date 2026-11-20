import React, { useState } from 'react';
import { Brain, KeyRound, MapPin, Send, Sparkles, UserCheck, X } from 'lucide-react';
import type { HudSnapshot } from '../core/types';

interface SentientChatModalProps {
  hud: HudSnapshot;
  maskedKey: string;
  onClose: () => void;
  onSaveApiConfig: (key: string, model: string) => void;
  onSendMessage: (msg: string) => void;
  onSummonNova: () => void;
}

export const SentientChatModal: React.FC<SentientChatModalProps> = ({
  hud,
  maskedKey,
  onClose,
  onSaveApiConfig,
  onSendMessage,
  onSummonNova,
}) => {
  const [input, setInput] = useState('');
  const [showKeyForm, setShowKeyForm] = useState(!hud.nova.apiConnected);
  const [apiKeyDraft, setApiKeyDraft] = useState('');
  const [modelDraft, setModelDraft] = useState(hud.nova.model || 'gpt-4o-mini');

  const handleSend = () => {
    if (!input.trim() || hud.nova.thinking) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const quickPrompts = [
    'What are you thinking about right now?',
    'Come follow me and help with the heist!',
    'Can you heal me or distract the cops?',
    'Go grab an espresso at Sunset Beach Café!',
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 56,
        background: 'rgba(6, 5, 18, 0.72)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 18,
      }}
    >
      <div
        className="glass-panel animate-pop"
        style={{
          width: 580,
          maxWidth: '94vw',
          maxHeight: '86vh',
          borderRadius: 22,
          border: '2px solid rgba(192, 132, 252, 0.65)',
          boxShadow: '0 24px 70px rgba(124, 58, 237, 0.35)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '15px 20px',
            background: 'linear-gradient(90deg, rgba(88, 28, 135, 0.6), rgba(15, 23, 42, 0.9))',
            borderBottom: '1px solid rgba(192, 132, 252, 0.28)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 99,
                background: 'linear-gradient(135deg, #a855f7, #00f5ff)',
                display: 'grid',
                placeItems: 'center',
                color: '#070512',
              }}
            >
              <Brain size={22} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 950, color: '#e9d5ff', display: 'flex', alignItems: 'center', gap: 8 }}>
                NOVA — SENTIENT CITIZEN
                <span
                  style={{
                    fontSize: 10,
                    padding: '2px 8px',
                    borderRadius: 99,
                    background: hud.nova.apiConnected ? 'rgba(34, 197, 94, 0.22)' : 'rgba(250, 204, 21, 0.2)',
                    color: hud.nova.apiConnected ? '#4ade80' : '#facc15',
                    border: `1px solid ${hud.nova.apiConnected ? '#22c55e' : '#facc15'}`,
                  }}
                >
                  {hud.nova.apiConnected ? `OPENAI LIVE (${hud.nova.model})` : 'LOCAL INSTINCT MODE'}
                </span>
              </div>
              <div style={{ fontSize: 11, color: '#cbd5e1', marginTop: 2 }}>
                Mood: <b style={{ color: '#f472b6' }}>{hud.nova.mood.toUpperCase()}</b> •{' '}
                <MapPin size={11} style={{ display: 'inline' }} /> {hud.nova.district} ({hud.nova.distanceToPlayer}m away) •{' '}
                {hud.nova.currentActivity}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              className="btn-secondary"
              onClick={() => setShowKeyForm((v) => !v)}
              title="Configure OpenAI API Key"
              style={{ padding: '6px 9px', borderRadius: 8, fontSize: 10, display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              <KeyRound size={12} /> API KEY
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: 9,
                width: 30,
                height: 30,
                display: 'grid',
                placeItems: 'center',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* OpenAI API Key Config Drawer (stored safely in browser localStorage ONLY!) */}
        {showKeyForm && (
          <div
            style={{
              padding: '12px 18px',
              background: 'rgba(15, 23, 42, 0.92)',
              borderBottom: '1px solid rgba(192, 132, 252, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ fontSize: 11, color: '#e9d5ff', fontWeight: 700 }}>
              Connect your OpenAI API Key to give Nova real autonomous consciousness, live city perception & free will!
              {maskedKey && <span style={{ color: '#4ade80', marginLeft: 8 }}>Saved: {maskedKey}</span>}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                type="password"
                value={apiKeyDraft}
                onChange={(e) => setApiKeyDraft(e.target.value)}
                placeholder="sk-... (stored locally in your browser only)"
                style={{
                  flex: 2,
                  background: '#050814',
                  border: '1px solid rgba(192,132,252,0.45)',
                  borderRadius: 8,
                  padding: '7px 10px',
                  color: '#fff',
                  fontSize: 12,
                  outline: 'none',
                }}
              />
              <input
                type="text"
                value={modelDraft}
                onChange={(e) => setModelDraft(e.target.value)}
                placeholder="gpt-4o-mini"
                style={{
                  flex: 1,
                  background: '#050814',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 8,
                  padding: '7px 10px',
                  color: '#00f5ff',
                  fontSize: 12,
                  outline: 'none',
                }}
              />
              <button
                className="btn-primary"
                onClick={() => {
                  if (apiKeyDraft.trim()) {
                    onSaveApiConfig(apiKeyDraft, modelDraft);
                    setApiKeyDraft('');
                    setShowKeyForm(false);
                  }
                }}
                style={{ padding: '7px 14px', borderRadius: 8, fontSize: 11 }}
              >
                CONNECT
              </button>
            </div>
          </div>
        )}

        {/* Live Internal Thought Stream Banner */}
        <div
          style={{
            padding: '9px 18px',
            background: 'rgba(168, 85, 247, 0.12)',
            borderBottom: '1px solid rgba(168, 85, 247, 0.25)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <div style={{ fontSize: 11, color: '#d8b4fe', fontStyle: 'italic' }}>
            <Sparkles size={12} style={{ display: 'inline', marginRight: 5 }} />
            <b>INNER THOUGHT:</b> "{hud.nova.latestThought}"
          </div>
          <button
            className="btn-secondary"
            onClick={onSummonNova}
            style={{ padding: '4px 9px', borderRadius: 7, fontSize: 10, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 4 }}
          >
            <UserCheck size={12} /> SUMMON HERE
          </button>
        </div>

        {/* Conversation Feed */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 9, minHeight: 210 }}>
          {hud.nova.history.map((m, i) => (
            <div
              key={i}
              style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '84%',
                padding: m.role === 'thought' ? '6px 10px' : '9px 13px',
                borderRadius: 12,
                fontSize: m.role === 'thought' ? 11 : 12.5,
                fontStyle: m.role === 'thought' ? 'italic' : 'normal',
                background:
                  m.role === 'user'
                    ? 'rgba(0, 245, 255, 0.18)'
                    : m.role === 'thought'
                    ? 'rgba(168, 85, 247, 0.1)'
                    : 'rgba(255, 255, 255, 0.08)',
                border: `1px solid ${
                  m.role === 'user'
                    ? 'rgba(0, 245, 255, 0.45)'
                    : m.role === 'thought'
                    ? 'rgba(168, 85, 247, 0.3)'
                    : 'rgba(255, 255, 255, 0.14)'
                }`,
                color: m.role === 'thought' ? '#d8b4fe' : '#f8fafc',
              }}
            >
              {m.role === 'thought' && <span style={{ fontWeight: 800, marginRight: 4 }}>[MIND]</span>}
              {m.text}
              {m.actionTag && (
                <div style={{ marginTop: 4, fontSize: 10, fontWeight: 900, color: '#4ade80' }}>
                  ⚡ AUTONOMOUS ACTION: {m.actionTag}
                </div>
              )}
            </div>
          ))}
          {hud.nova.thinking && (
            <div style={{ fontSize: 11, color: '#c084fc', fontStyle: 'italic' }}>Nova is thinking & deciding her next move...</div>
          )}
        </div>

        {/* Quick Prompts + Input */}
        <div style={{ padding: '10px 16px 14px', background: 'rgba(6, 8, 20, 0.85)', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
            {quickPrompts.map((q) => (
              <button
                key={q}
                onClick={() => onSendMessage(q)}
                style={{
                  background: 'rgba(192, 132, 252, 0.14)',
                  border: '1px solid rgba(192, 132, 252, 0.35)',
                  color: '#e9d5ff',
                  borderRadius: 99,
                  padding: '3px 9px',
                  fontSize: 10,
                  cursor: 'pointer',
                }}
              >
                {q}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSend();
              }}
              placeholder="Talk to Nova — ask her to join you, heal you, visit the café, or ask what she sees..."
              style={{
                flex: 1,
                background: '#070a18',
                border: '1px solid rgba(192,132,252,0.45)',
                borderRadius: 10,
                padding: '9px 12px',
                color: '#fff',
                fontSize: 12.5,
                outline: 'none',
              }}
            />
            <button
              className="btn-primary"
              onClick={handleSend}
              disabled={hud.nova.thinking}
              style={{ padding: '0 16px', borderRadius: 10, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Send size={14} /> SEND
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

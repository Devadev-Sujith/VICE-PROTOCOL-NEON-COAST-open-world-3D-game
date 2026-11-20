import React, { useState } from 'react';
import { Disc3, ExternalLink, Music2, Play, Power, X } from 'lucide-react';
import type { SpotifyTrackPreset } from '../core/types';

export const SPOTIFY_PRESETS: SpotifyTrackPreset[] = [
  {
    id: 'synthwave',
    title: 'Outrun & Synthwave Night Drive',
    artist: 'Spotify Playlist • Neon Coast Picks',
    embedUrl: 'https://open.spotify.com/embed/playlist/37i9dQZF1DXdLEN7aqioXM?utm_source=generator&theme=0',
  },
  {
    id: 'night_rider',
    title: 'Night Rider / Midnight Cruise',
    artist: 'Spotify Playlist • GTA Vibes',
    embedUrl: 'https://open.spotify.com/embed/playlist/37i9dQZF1DX6GJXiuZRisr?utm_source=generator&theme=0',
  },
  {
    id: 'phonk',
    title: 'Drift Phonk & Street Racing',
    artist: 'Spotify Playlist • High Octane',
    embedUrl: 'https://open.spotify.com/embed/playlist/37i9dQZF1DWWY64wDtewQt?utm_source=generator&theme=0',
  },
  {
    id: 'miami_lofi',
    title: 'Sunset Beach Lo-Fi Beats',
    artist: 'Spotify Playlist • Ocean Drive',
    embedUrl: 'https://open.spotify.com/embed/playlist/37i9dQZF1DWWQRwui0ExPn?utm_source=generator&theme=0',
  },
];

export function parseSpotifyInputToEmbed(raw: string): { embedUrl: string; title: string } | null {
  const s = raw.trim();
  if (!s) return null;

  // Match https://open.spotify.com/(track|playlist|album|artist)/ID
  const urlMatch = s.match(/open\.spotify\.com\/(?:intl-[a-z-]+\/)?(track|playlist|album|artist)\/([a-zA-Z0-9]+)/);
  if (urlMatch) {
    const [, kind, id] = urlMatch;
    return {
      embedUrl: `https://open.spotify.com/embed/${kind}/${id}?utm_source=generator&theme=0`,
      title: `Custom Spotify ${kind.toUpperCase()}`,
    };
  }

  // Match spotify:(track|playlist|album|artist):ID
  const uriMatch = s.match(/spotify:(track|playlist|album|artist):([a-zA-Z0-9]+)/);
  if (uriMatch) {
    const [, kind, id] = uriMatch;
    return {
      embedUrl: `https://open.spotify.com/embed/${kind}/${id}?utm_source=generator&theme=0`,
      title: `Custom Spotify ${kind.toUpperCase()}`,
    };
  }

  return null;
}

interface SpotifyConnectPanelProps {
  activeEmbedUrl: string;
  activeTitle: string;
  spotifyActive: boolean;
  onSelectTrack: (embedUrl: string, title: string) => void;
  onToggleActive: (active: boolean) => void;
  compact?: boolean;
  onClose?: () => void;
  modeLabel?: string;
}

export const SpotifyConnectPanel: React.FC<SpotifyConnectPanelProps> = ({
  activeEmbedUrl,
  activeTitle,
  spotifyActive,
  onSelectTrack,
  onToggleActive,
  compact = false,
  onClose,
  modeLabel = 'CAR INFOTAINMENT • SPOTIFY CONNECT',
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLoadCustom = () => {
    const parsed = parseSpotifyInputToEmbed(urlInput);
    if (!parsed) {
      setErrorMsg('Paste a valid Spotify Track, Album, or Playlist URL (open.spotify.com/...)');
      return;
    }
    setErrorMsg(null);
    onSelectTrack(parsed.embedUrl, parsed.title);
    setUrlInput('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {!compact && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 99,
                background: '#1db954',
                display: 'grid',
                placeItems: 'center',
                color: '#04120a',
              }}
            >
              <Music2 size={17} />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 950, color: '#1db954', letterSpacing: '0.1em' }}>
                {modeLabel}
              </div>
              <div style={{ fontSize: 11, color: '#cbd5e1' }}>
                {spotifyActive ? `Streaming: ${activeTitle}` : 'Connected & Ready — Pick a playlist or paste any song URL'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => onToggleActive(!spotifyActive)}
              style={{
                background: spotifyActive ? 'rgba(29, 185, 84, 0.22)' : 'rgba(255,255,255,0.08)',
                border: `1px solid ${spotifyActive ? '#1db954' : 'rgba(255,255,255,0.2)'}`,
                color: spotifyActive ? '#4ade80' : '#cbd5e1',
                borderRadius: 8,
                padding: '5px 10px',
                fontSize: 10,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Power size={12} /> {spotifyActive ? 'SPOTIFY ON' : 'ACTIVATE'}
            </button>
            {onClose && (
              <button
                onClick={onClose}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: 8,
                  width: 28,
                  height: 28,
                  display: 'grid',
                  placeItems: 'center',
                  color: '#fff',
                  cursor: 'pointer',
                }}
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Paste ANY real Spotify Song / Playlist URL */}
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          type="text"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleLoadCustom();
          }}
          placeholder="Paste any Spotify song / playlist URL..."
          style={{
            flex: 1,
            background: 'rgba(6, 10, 22, 0.9)',
            border: '1px solid rgba(29, 185, 84, 0.45)',
            borderRadius: 8,
            padding: '7px 10px',
            color: '#fff',
            fontSize: 11,
            outline: 'none',
          }}
        />
        <button
          onClick={handleLoadCustom}
          style={{
            background: '#1db954',
            color: '#04120a',
            border: 'none',
            borderRadius: 8,
            padding: '0 12px',
            fontSize: 11,
            fontWeight: 900,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <Play size={12} fill="currentColor" /> PLAY
        </button>
      </div>
      {errorMsg && <div style={{ fontSize: 10, color: '#fb7185', fontWeight: 700 }}>{errorMsg}</div>}

      {/* Official Live Spotify Embed Player (Real Spotify Audio!) */}
      <div
        style={{
          borderRadius: 12,
          overflow: 'hidden',
          border: '1px solid rgba(29, 185, 84, 0.4)',
          background: '#121212',
        }}
      >
        <iframe
          title="Spotify Connect Player"
          src={activeEmbedUrl}
          width="100%"
          height={compact ? 152 : 152}
          frameBorder="0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          style={{ display: 'block' }}
        />
      </div>

      {/* Curated Instant Vice City Spotify Playlists */}
      <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : '1fr 1fr', gap: 6 }}>
        {SPOTIFY_PRESETS.map((p) => {
          const selected = activeEmbedUrl === p.embedUrl;
          return (
            <button
              key={p.id}
              onClick={() => onSelectTrack(p.embedUrl, p.title)}
              style={{
                textAlign: 'left',
                padding: '7px 10px',
                borderRadius: 9,
                background: selected ? 'rgba(29, 185, 84, 0.2)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${selected ? '#1db954' : 'rgba(255,255,255,0.12)'}`,
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Disc3 size={16} color={selected ? '#1db954' : '#94a3b8'} style={{ flexShrink: 0 }} />
              <div style={{ overflow: 'hidden' }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: selected ? '#4ade80' : '#f8fafc',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {p.title}
                </div>
                <div style={{ fontSize: 9, color: '#94a3b8' }}>{p.artist}</div>
              </div>
            </button>
          );
        })}
      </div>

      <div style={{ fontSize: 10, color: '#94a3b8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Auto-mutes FM radio while Spotify is active • Works in Cockpit & Phone!</span>
        <a
          href="https://open.spotify.com"
          target="_blank"
          rel="noreferrer"
          style={{ color: '#1db954', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 3, fontWeight: 700 }}
        >
          Open Spotify <ExternalLink size={10} />
        </a>
      </div>
    </div>
  );
};

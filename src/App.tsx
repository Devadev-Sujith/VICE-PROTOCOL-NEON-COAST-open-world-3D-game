import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from './core/GameEngine';
import type { HudSnapshot, ShopCatalogItem } from './core/types';
import { DemoToolbar } from './ui/DemoToolbar';
import { FullMapModal } from './ui/FullMapModal';
import { HUD } from './ui/HUD';
import { InventoryModal } from './ui/InventoryModal';
import { Minimap } from './ui/Minimap';
import { Overlays } from './ui/Overlays';
import { SentientChatModal } from './ui/SentientChatModal';
import { Smartphone } from './ui/Smartphone';
import { SPOTIFY_PRESETS, SpotifyConnectPanel } from './ui/SpotifyWidget';
import { TitleScreen } from './ui/TitleScreen';

export function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [hud, setHud] = useState<HudSnapshot | null>(null);

  const [phoneOpen, setPhoneOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [spotifyDashOpen, setSpotifyDashOpen] = useState(false);
  const [bagOpen, setBagOpen] = useState(false);
  const [shopVenue, setShopVenue] = useState<ShopCatalogItem['venue'] | null>(null);
  const [novaOpen, setNovaOpen] = useState(false);

  // Shared Spotify Connect state (synced between Car Infotainment Dashboard & Phone!)
  const [spotifyEmbedUrl, setSpotifyEmbedUrl] = useState(SPOTIFY_PRESETS[0].embedUrl);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const engine = new GameEngine(el, {
      onHudUpdate: (snap) => setHud(snap),
      onOpenShopVenue: (venue) => {
        setPhoneOpen(false);
        setMapOpen(false);
        setBagOpen(false);
        setNovaOpen(false);
        setShopVenue(venue);
      },
      onOpenNovaChat: () => {
        setPhoneOpen(false);
        setMapOpen(false);
        setBagOpen(false);
        setShopVenue(null);
        setNovaOpen(true);
      },
    });
    engineRef.current = engine;
    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // Global UI hotkeys: Tab=Phone, M=Map, P=Director, B=Bag, N=Nova Sentient AI, K=Car Spotify, Esc=Close
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const eng = engineRef.current;
      if (!eng || eng.mode !== 'playing') return;

      if (e.code === 'Tab') {
        e.preventDefault();
        setMapOpen(false);
        setBagOpen(false);
        setShopVenue(null);
        setNovaOpen(false);
        setSpotifyDashOpen(false);
        setPhoneOpen((v) => !v);
      } else if (e.code === 'KeyM') {
        setPhoneOpen(false);
        setBagOpen(false);
        setShopVenue(null);
        setNovaOpen(false);
        setMapOpen((v) => !v);
      } else if (e.code === 'KeyB') {
        setPhoneOpen(false);
        setMapOpen(false);
        setShopVenue(null);
        setNovaOpen(false);
        setBagOpen((v) => !v);
      } else if (e.code === 'KeyN') {
        setPhoneOpen(false);
        setMapOpen(false);
        setBagOpen(false);
        setShopVenue(null);
        setNovaOpen((v) => !v);
      } else if (e.code === 'KeyK') {
        setPhoneOpen(false);
        setMapOpen(false);
        setBagOpen(false);
        setShopVenue(null);
        setNovaOpen(false);
        setSpotifyDashOpen((v) => !v);
      } else if (e.code === 'KeyP') {
        setDemoOpen((v) => !v);
      } else if (e.code === 'Escape') {
        setPhoneOpen(false);
        setMapOpen(false);
        setBagOpen(false);
        setShopVenue(null);
        setNovaOpen(false);
        setSpotifyDashOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Block driving/shooting input when full modals (Map, Bag, Shop, Nova Chat) are open
  useEffect(() => {
    engineRef.current?.setUiBlocksInput(mapOpen || bagOpen || shopVenue !== null || novaOpen);
  }, [mapOpen, bagOpen, shopVenue, novaOpen]);

  const eng = engineRef.current;

  const handleSelectSpotify = (url: string, title: string) => {
    setSpotifyEmbedUrl(url);
    eng?.setSpotifyStatus(true, title);
  };

  const handleToggleSpotifyActive = (active: boolean) => {
    const preset = SPOTIFY_PRESETS.find((p) => p.embedUrl === spotifyEmbedUrl);
    eng?.setSpotifyStatus(active, preset?.title ?? 'Spotify Connect');
  };

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      <div ref={mountRef} style={{ position: 'absolute', inset: 0 }} />

      {hud && hud.mode === 'title' && eng && (
        <TitleScreen
          onStartCampaign={() => eng.startCampaign()}
          onStartFreeRoam={() => eng.startFreeRoam()}
        />
      )}

      {hud && hud.mode !== 'title' && eng && (
        <>
          <HUD
            hud={hud}
            phoneOpen={phoneOpen}
            spotifyOpen={spotifyDashOpen}
            onTogglePhone={() => {
              setSpotifyDashOpen(false);
              setMapOpen(false);
              setPhoneOpen((v) => !v);
            }}
            onToggleSpotify={() => {
              setPhoneOpen(false);
              setSpotifyDashOpen((v) => !v);
            }}
            onOpenBag={() => {
              setShopVenue(null);
              setBagOpen(true);
            }}
            onOpenNova={() => setNovaOpen(true)}
            onOpenFullMap={() => {
              setPhoneOpen(false);
              setMapOpen(true);
            }}
            onQuickLaunchNextMission={() => eng.launchMission(eng.missions.getNextCampaignMissionId())}
            onTriggerHack={(k) => eng.activateNetHack(k)}
          />

          <Minimap
            hud={hud}
            onOpenFullMap={() => {
              setPhoneOpen(false);
              setMapOpen(true);
            }}
          />

          <DemoToolbar
            hud={hud}
            open={demoOpen}
            onToggle={() => setDemoOpen((v) => !v)}
            onSetTime={(t) => eng.setTimeOfDay(t)}
            onAddStar={() => eng.demoAddWantedStar()}
            onClearStars={() => eng.demoClearWanted()}
            onSpawnHypercar={() => eng.summonVehicle('hypercar')}
            onAddCash={() => eng.demoAddCash()}
            onTeleport={(loc) => eng.demoTeleport(loc)}
          />

          {/* In-Car Dashboard Spotify Connect Infotainment Console ([K]) */}
          {spotifyDashOpen && (
            <div
              className="glass-panel animate-pop"
              style={{
                position: 'fixed',
                right: 22,
                bottom: 84,
                width: 440,
                maxWidth: '92vw',
                padding: 16,
                borderRadius: 20,
                border: '2px solid rgba(29, 185, 84, 0.72)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.8), 0 0 28px rgba(29,185,84,0.28)',
                zIndex: 46,
              }}
            >
              <SpotifyConnectPanel
                activeEmbedUrl={spotifyEmbedUrl}
                activeTitle={hud.spotifyTitle}
                spotifyActive={hud.spotifyActive}
                onSelectTrack={handleSelectSpotify}
                onToggleActive={handleToggleSpotifyActive}
                onClose={() => setSpotifyDashOpen(false)}
                modeLabel={hud.inVehicle ? `${hud.vehicleName} • SPOTIFY DASH` : 'SPOTIFY CONNECT PLAYER'}
              />
            </div>
          )}

          {phoneOpen && (
            <Smartphone
              hud={hud}
              spotifyEmbedUrl={spotifyEmbedUrl}
              onSelectSpotify={handleSelectSpotify}
              onToggleSpotifyActive={handleToggleSpotifyActive}
              onClose={() => setPhoneOpen(false)}
              onLaunchMission={(id) => eng.launchMission(id)}
              onLaunchRace={(id) => eng.launchStreetRace(id)}
              onTriggerHack={(k) => eng.activateNetHack(k)}
              onBuyUpgrade={(k) => eng.buyUpgrade(k)}
              onSummonVehicle={(t) => eng.summonVehicle(t)}
              onRepaintVehicle={() => eng.repaintCurrentVehicle()}
              onSetRadio={(st) => eng.setRadioStation(st)}
              onSetVolumes={(m, mus, sfx) => eng.setAudioVolumes(m, mus, sfx)}
            />
          )}

          {mapOpen && (
            <FullMapModal
              hud={hud}
              onClose={() => setMapOpen(false)}
              onSetWaypoint={(pt) => eng.setCustomWaypoint(pt)}
            />
          )}

          {(bagOpen || shopVenue !== null) && (
            <InventoryModal
              hud={hud}
              mode={shopVenue !== null ? 'shop' : 'bag'}
              venue={shopVenue}
              onClose={() => {
                setBagOpen(false);
                setShopVenue(null);
              }}
              onBuyItem={(id, eatNow) => eng.buyShopItem(id, eatNow)}
              onUseItem={(id) => eng.useInventoryItem(id)}
            />
          )}

          {novaOpen && (
            <SentientChatModal
              hud={hud}
              maskedKey={eng.nova.getApiKeyMasked()}
              onClose={() => setNovaOpen(false)}
              onSaveApiConfig={(k, m) => eng.setNovaApiConfig(k, m)}
              onSendMessage={(msg) => void eng.sendMessageToNova(msg)}
              onSummonNova={() => eng.summonNovaNearby()}
            />
          )}

          <Overlays hud={hud} onContinueVictory={() => eng.continueAfterVictory()} />
        </>
      )}
    </div>
  );
}

export default App;

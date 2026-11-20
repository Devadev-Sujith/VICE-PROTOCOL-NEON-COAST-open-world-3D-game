import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from './core/GameEngine';
import type { HudSnapshot, ShopCatalogItem } from './core/types';
import { FullMapModal } from './ui/FullMapModal';
import { HUD } from './ui/HUD';
import { InventoryModal } from './ui/InventoryModal';
import { Minimap } from './ui/Minimap';
import { Overlays } from './ui/Overlays';
import { SettingsMenuModal } from './ui/SettingsMenuModal';
import { type PhoneAppId, Smartphone } from './ui/Smartphone';
import { SPOTIFY_PRESETS, SpotifyConnectPanel } from './ui/SpotifyWidget';
import { TitleScreen } from './ui/TitleScreen';

export function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [hud, setHud] = useState<HudSnapshot | null>(null);

  const [phoneOpen, setPhoneOpen] = useState(false);
  const [phoneInitialApp, setPhoneInitialApp] = useState<PhoneAppId>('home');
  const [phoneInitialThread, setPhoneInitialThread] = useState<string | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [carSpotifyOpen, setCarSpotifyOpen] = useState(false);
  const [shopVenue, setShopVenue] = useState<ShopCatalogItem['venue'] | null>(null);

  // Shared Spotify Connect state (synced between In-Car Music Player & Phone Spotify App!)
  const [spotifyEmbedUrl, setSpotifyEmbedUrl] = useState(SPOTIFY_PRESETS[0].embedUrl);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const engine = new GameEngine(el, {
      onHudUpdate: (snap) => setHud(snap),
      onOpenShopVenue: (venue) => {
        setPhoneOpen(false);
        setMapOpen(false);
        setSettingsOpen(false);
        setCarSpotifyOpen(false);
        setShopVenue(venue);
      },
      onOpenPhoneMessages: (threadId) => {
        setMapOpen(false);
        setSettingsOpen(false);
        setCarSpotifyOpen(false);
        setShopVenue(null);
        setPhoneInitialApp('messages');
        setPhoneInitialThread(threadId ?? null);
        setPhoneOpen(true);
      },
    });
    engineRef.current = engine;
    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // Global Hotkeys: Tab=Phone, M=Complex City Map, K=Car Music Player (inside vehicle), Esc=Settings/Close
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const eng = engineRef.current;
      if (!eng || eng.mode !== 'playing') return;

      if (e.code === 'Tab') {
        e.preventDefault();
        setMapOpen(false);
        setSettingsOpen(false);
        setShopVenue(null);
        setCarSpotifyOpen(false);
        setPhoneInitialApp('home');
        setPhoneOpen((v) => !v);
      } else if (e.code === 'KeyM') {
        setPhoneOpen(false);
        setSettingsOpen(false);
        setShopVenue(null);
        setCarSpotifyOpen(false);
        setMapOpen((v) => !v);
      } else if (e.code === 'KeyK' && eng.playerVehicle) {
        setPhoneOpen(false);
        setMapOpen(false);
        setSettingsOpen(false);
        setCarSpotifyOpen((v) => !v);
      } else if (e.code === 'Escape') {
        if (phoneOpen || mapOpen || shopVenue || carSpotifyOpen) {
          setPhoneOpen(false);
          setMapOpen(false);
          setShopVenue(null);
          setCarSpotifyOpen(false);
        } else {
          setSettingsOpen((v) => !v);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phoneOpen, mapOpen, shopVenue, carSpotifyOpen]);

  // Close car Spotify automatically if player exits car
  useEffect(() => {
    if (hud && !hud.inVehicle && carSpotifyOpen) {
      setCarSpotifyOpen(false);
    }
  }, [hud?.inVehicle, carSpotifyOpen]);

  // Block game input when any modal/menu/phone-on-foot is open (unlocking cursor cleanly!)
  useEffect(() => {
    const block = mapOpen || settingsOpen || shopVenue !== null || (phoneOpen && !hud?.inVehicle);
    engineRef.current?.setUiBlocksInput(block);
    if (phoneOpen || carSpotifyOpen) {
      engineRef.current?.exitPointerLock();
    }
  }, [mapOpen, settingsOpen, shopVenue, phoneOpen, carSpotifyOpen, hud?.inVehicle]);

  const eng = engineRef.current;

  const handleSelectSpotify = (url: string, title: string) => {
    setSpotifyEmbedUrl(url);
    eng?.setSpotifyStatus(true, title);
  };

  const handleToggleSpotifyActive = (active: boolean) => {
    const preset = SPOTIFY_PRESETS.find((p) => p.embedUrl === spotifyEmbedUrl);
    eng?.setSpotifyStatus(active, preset?.title ?? 'Spotify');
  };

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      <div ref={mountRef} style={{ position: 'absolute', inset: 0 }} />

      {hud && hud.mode === 'title' && eng && (
        <TitleScreen
          avatar={hud.avatar}
          onlineCount={hud.multiplayer.onlinePlayers.length}
          mpConnected={hud.multiplayer.connected}
          onChangeAvatar={(cfg) => eng.setAvatarConfig(cfg)}
          onStartCampaign={() => eng.startCampaign()}
          onStartFreeRoam={() => eng.startFreeRoam()}
        />
      )}

      {hud && hud.mode !== 'title' && eng && (
        <>
          <HUD
            hud={hud}
            phoneOpen={phoneOpen}
            onTogglePhone={() => {
              setCarSpotifyOpen(false);
              setMapOpen(false);
              setSettingsOpen(false);
              setPhoneInitialApp('home');
              setPhoneOpen((v) => !v);
            }}
            onToggleCarSpotify={() => {
              setPhoneOpen(false);
              setCarSpotifyOpen((v) => !v);
            }}
            onOpenSettings={() => {
              setPhoneOpen(false);
              setMapOpen(false);
              setCarSpotifyOpen(false);
              setSettingsOpen(true);
            }}
            onSelectWeapon={(w) => eng.selectWeapon(w)}
          />

          <Minimap
            hud={hud}
            onOpenFullMap={() => {
              setPhoneOpen(false);
              setSettingsOpen(false);
              setMapOpen(true);
            }}
          />

          {/* In-Car Music Player / Spotify Connect ONLY while inside vehicle ([K])! */}
          {carSpotifyOpen && hud.inVehicle && (
            <div
              className="glass-panel animate-pop"
              style={{
                position: 'fixed',
                right: 22,
                bottom: 74,
                width: 430,
                maxWidth: '92vw',
                padding: 16,
                borderRadius: 20,
                border: '2px solid rgba(29, 185, 84, 0.72)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
                zIndex: 47,
              }}
            >
              <SpotifyConnectPanel
                activeEmbedUrl={spotifyEmbedUrl}
                activeTitle={hud.spotifyTitle}
                spotifyActive={hud.spotifyActive}
                onSelectTrack={handleSelectSpotify}
                onToggleActive={handleToggleSpotifyActive}
                onClose={() => setCarSpotifyOpen(false)}
                modeLabel={`${hud.vehicleName} • CAR MUSIC PLAYER`}
              />
            </div>
          )}

          {/* Realistic Smartphone UI (Messages w/ Nova & Friends, Online Players, Spotify, Missions To-Do, Bag, Outfits, Fleet, Net-Hack) */}
          {phoneOpen && (
            <Smartphone
              hud={hud}
              initialApp={phoneInitialApp}
              initialThreadId={phoneInitialThread}
              spotifyEmbedUrl={spotifyEmbedUrl}
              onSelectSpotify={handleSelectSpotify}
              onToggleSpotifyActive={handleToggleSpotifyActive}
              onClose={() => setPhoneOpen(false)}
              onSendMessageToNova={(msg) => void eng.sendMessageToNova(msg)}
              onSummonNova={() => eng.summonNovaNearby()}
              onAddFriend={(pid) => eng.addFriend(pid)}
              onSendFriendDm={(fid, txt) => eng.sendFriendDm(fid, txt)}
              onMarkFriendRead={(fid) => eng.markFriendDmRead(fid)}
              onJoinCoopMission={(mid) => eng.joinCoopMission(mid)}
              onSetWaypoint={(pt, lbl) => eng.setCustomWaypoint(pt, lbl)}
              onLaunchMission={(id) => eng.launchMission(id)}
              onLaunchRace={(id) => eng.launchStreetRace(id)}
              onTriggerHack={(k) => eng.activateNetHack(k)}
              onBuyUpgrade={(k) => eng.buyUpgrade(k)}
              onSummonVehicle={(t) => eng.summonVehicle(t)}
              onRepaintVehicle={() => eng.repaintCurrentVehicle()}
              onUseInventoryItem={(id) => eng.useInventoryItem(id)}
              onEquipOutfit={(id) => eng.buyOrEquipOutfit(id)}
              onSetRadio={(st) => eng.setRadioStation(st)}
            />
          )}

          {/* Complex Interactive Landmark City Map ([M]) */}
          {mapOpen && (
            <FullMapModal
              hud={hud}
              onClose={() => setMapOpen(false)}
              onSetWaypoint={(pt, lbl) => eng.setCustomWaypoint(pt, lbl)}
              onInviteNovaToLandmark={(name, x, z) => eng.inviteNovaToDestination(name, x, z)}
            />
          )}

          {/* Venue Shop / Food Court / Café / Clothing Store Fitting Room */}
          {shopVenue !== null && (
            <InventoryModal
              hud={hud}
              mode="shop"
              venue={shopVenue}
              onClose={() => setShopVenue(null)}
              onBuyItem={(id, eatNow) => eng.buyShopItem(id, eatNow)}
              onUseItem={(id) => eng.useInventoryItem(id)}
              onBuyOrEquipOutfit={(id) => eng.buyOrEquipOutfit(id)}
            />
          )}

          {/* Game Settings, Weather, Audio, Controls & Fast-Travel Menu ([ESC]) */}
          {settingsOpen && (
            <SettingsMenuModal
              hud={hud}
              onClose={() => setSettingsOpen(false)}
              onSetTime={(t) => eng.setTimeOfDay(t)}
              onSetWeather={(w) => eng.setWeather(w)}
              onSetVolumes={(m, mus, sfx) => eng.setAudioVolumes(m, mus, sfx)}
              onAddStar={() => eng.demoAddWantedStar()}
              onClearStars={() => eng.demoClearWanted()}
              onSpawnHypercar={() => eng.summonVehicle('hypercar')}
              onAddCash={() => eng.demoAddCash()}
              onTeleport={(loc) => eng.demoTeleport(loc)}
            />
          )}

          <Overlays hud={hud} onContinueVictory={() => eng.continueAfterVictory()} />
        </>
      )}
    </div>
  );
}

export default App;

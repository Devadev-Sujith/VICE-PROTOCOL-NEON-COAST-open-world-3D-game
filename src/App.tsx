import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from './core/GameEngine';
import type { HudSnapshot } from './core/types';
import { DemoToolbar } from './ui/DemoToolbar';
import { FullMapModal } from './ui/FullMapModal';
import { HUD } from './ui/HUD';
import { Minimap } from './ui/Minimap';
import { Overlays } from './ui/Overlays';
import { Smartphone } from './ui/Smartphone';
import { TitleScreen } from './ui/TitleScreen';

export function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [hud, setHud] = useState<HudSnapshot | null>(null);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const engine = new GameEngine(el, (snap) => setHud(snap));
    engineRef.current = engine;
    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // Global UI hotkeys: Tab = Phone, M = Full Map, P = Demo Director Bar, Esc = Close modals
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const eng = engineRef.current;
      if (!eng || eng.mode !== 'playing') return;
      if (e.code === 'Tab') {
        e.preventDefault();
        setMapOpen(false);
        setPhoneOpen((v) => !v);
      } else if (e.code === 'KeyM') {
        setPhoneOpen(false);
        setMapOpen((v) => !v);
      } else if (e.code === 'KeyP') {
        setDemoOpen((v) => !v);
      } else if (e.code === 'Escape') {
        setPhoneOpen(false);
        setMapOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Only block driving input while Full Map modal is open (you can still drive while glancing at Phone!)
  useEffect(() => {
    engineRef.current?.setUiBlocksInput(mapOpen);
  }, [mapOpen]);

  const eng = engineRef.current;

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      {/* Live 3D Three.js Canvas Mount */}
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
            onTogglePhone={() => {
              setMapOpen(false);
              setPhoneOpen((v) => !v);
            }}
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

          {phoneOpen && (
            <Smartphone
              hud={hud}
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

          <Overlays hud={hud} onContinueVictory={() => eng.continueAfterVictory()} />
        </>
      )}
    </div>
  );
}

export default App;

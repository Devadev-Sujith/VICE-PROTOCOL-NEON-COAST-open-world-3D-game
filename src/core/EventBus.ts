import type { BannerEvent, DialogueMessage, DistrictId, RadioStationId } from './types';

export interface GameEventMap {
  'audio:crash': { intensity: number };
  'audio:explosion': { distance: number };
  'audio:blaster': { isEmp?: boolean };
  'audio:horn': { pitch?: number };
  'audio:cash': { amount: number };
  'audio:mission_passed': undefined;
  'audio:stunt': undefined;
  'audio:paynspray': undefined;
  'audio:emp_pulse': undefined;
  'audio:hydrant': undefined;
  'audio:hijack': undefined;
  'audio:radio_change': { station: RadioStationId; label: string };
  'ui:banner': BannerEvent;
  'ui:dialogue': DialogueMessage;
  'ui:hitmarker': undefined;
  'world:district': { id: DistrictId; name: string };
  'wanted:crime': { severity: number; reason: string; x: number; z: number };
  'camera:shake': { amount: number };
  'game:hitstop': { seconds: number };
}

type Handler<T> = (payload: T) => void;

export class EventBus {
  private listeners = new Map<keyof GameEventMap, Set<Handler<any>>>();

  on<K extends keyof GameEventMap>(event: K, handler: Handler<GameEventMap[K]>): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(handler);
    return () => set?.delete(handler);
  }

  emit<K extends keyof GameEventMap>(event: K, payload: GameEventMap[K]): void {
    const set = this.listeners.get(event);
    if (!set) return;
    set.forEach((fn) => fn(payload));
  }

  clear(): void {
    this.listeners.clear();
  }
}

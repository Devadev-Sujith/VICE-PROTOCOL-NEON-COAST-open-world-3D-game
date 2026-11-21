# VICE PROTOCOL: NEON COAST

> **A browser-native 3D GTA-inspired Open-World Action Sandbox with Single-World Online Multiplayer, Live Friend DMs, Sentient LLM-Controlled AI Companion, Photorealistic 1st-Person Dashcam, Sea & Air Vehicles, Instant Walk-In Interiors, and a $100,000 Grand Heist Campaign.**

![Three.js](https://img.shields.io/badge/Engine-Three.js_r170_+_WebGL-00f5ff?style=for-the-badge)
![Multiplayer](https://img.shields.io/badge/Multiplayer-Single_Global_World_(WSS)-22c55e?style=for-the-badge)
![AI](https://img.shields.io/badge/Sentient_NPC-OpenAI_GPT--4o--mini-ec4899?style=for-the-badge)
![Stack](https://img.shields.io/badge/Stack-React_18_+_TypeScript_+_Node.js-facc15?style=for-the-badge)

### 🌐 Live Single-World Multiplayer Link
**Play instantly (no install, no login):** https://polymer-inspiration-deviation-arrived.trycloudflare.com

*Everyone who opens the link spawns into the **exact same single Neon Coast world** together.*

---

## ⚡ 2-Minute Judge Demo Guide

Only have **2 minutes** to evaluate? Follow this exact 6-step walkthrough to see every flagship system in action:

| Time | What to Do | What to Look For |
| :--- | :--- | :--- |
| **`0:00 – 0:20`** | **Customize Your Avatar** on the Title Screen (enter your name, pick skin tone, short/long hair, jacket/shirt/pants, shades) → click **Enter Free Roam** (or **Start Heist**). | Live preview updates immediately; your custom name & outfit persist across your 3D avatar, Phone, Nova's dialogue, and multiplayer nameplate. |
| **`0:20 – 0:45`** | **Test Live Single-World Multiplayer:** Open the link in a **2nd tab or another device**, name the 2nd avatar, and enter the city. Press **`Tab`** → **Players** → click **`+ Add Friend`** (or walk up and press **`E`**) → open **Messages** → send a live DM! | Both avatars appear live in 3D with animated walking/driving, floating nameplates (`★ FRIEND`), minimap blips, instant GPS routing, live 1-on-1 DMs, unread badges, and **Join Co-op** on active missions. |
| **`0:45 – 1:10`** | **Meet "Nova" (Sentient AI Character):** Open **`Tab`** → **Messages → Nova** and type `"Dance for me!"`, `"Come with me!"`, or `"Let's go on a café date!"` | Powered by an LLM brain via our secure server proxy (`/api/nova`) — Nova talks like a real local friend (zero AI jargon) and physically executes animations: **dances**, **sprints**, **rides in your passenger seat**, and **pins Sunset Café on your 3D GPS**. |
| **`1:10 – 1:35`** | **Realistic Driving, Dashcam, Spotify, Boat & Chopper:** Drive (`WASD`), press **`C`** inside your car for **1st-person cockpit view**, press **`K`** for **Spotify Connect**. Open **`Tab` → Garage** to summon the **Riva Neon Speedboat** or **Skyhawk Helicopter**. | Open-source Ferrari 458 GLB with see-through glass, real-world MPH physics (`1 m/s = 2.237 MPH`), animated steering wheel, live OLED dashboard (speed/RPM/gear/odometer/Spotify), wave-riding ocean boat, and collective-throttle helicopter flight. |
| **`1:35 – 1:50`** | **Instant Walk-In Interiors & Combat:** Press **`M`** (Full City Map) or **`Esc`** (Fast Travel) to visit **Neon Coast Mall**, **Sunset Café**, or **VICE Drip Boutique** — walk straight through the glass doors (0ms load). Exit & press **`1–4`** (`Fists`, `Pistol`, `AK-47`, `M24 Sniper`), right-click to scope. | Moving mall escalators, live Food Court queue (buy food → store in **My Bag** → eat to heal), live dress-changing boutique, smooth free-look mouse aiming, 1-shot headshots, rigged open-source NPCs (`Soldier.glb`), directional crimson blood spatter & expanding asphalt blood pools. |
| **`1:50 – 2:00`** | **Heist Protocol & City Chaos:** Open **`Tab` → To-Do Ops** to launch any of the **4 Story Heists** or **3 Road-Following Street Races**, or trigger **Net-Hack** (`1` Traffic Chaos, `2` EMP Shockwave, `3` Police Scanner Spoof). | Escalating 1–5★ NCPD pursuit with Interceptor roadblocks & Helicopter spotlight, glowing 3D GPS road ribbon, Neon Pay-n-Spray repaint/wanted clear, and Ocean Pier stunt ramp onto the Getaway Yacht! |

---

## 🌐 Single-World Online Multiplayer Architecture & Gameplay

**VICE PROTOCOL: NEON COAST** uses a **Single Persistent Global World** design — there are **no room codes, lobbies, or split instances**. Every player who opens the URL joins the exact same shared 640m × 640m Neon Coast city.

### How Multiplayer Gameplay Works
1. **Avatar Identity & Spawning:**
   - Every player customizes their **Name**, **Skin Tone**, **Hair Style (Short/Long) & Color**, **Jacket/Shirt/Pants/Shoes**, and **Aviator Shades** before spawning (and can swap outfits anytime at **VICE Drip Boutique** or Phone → **Outfits**).
   - Changes broadcast live in real time so every player in the city sees your exact look and floating 3D nameplate.
2. **Live 3D World Presence:**
   - **On Foot:** Remote players render with their custom rounded 3D avatar, smooth 60 FPS dead-reckoning interpolation, and velocity-driven leg/arm walk & sprint animations.
   - **In Vehicles:** When another player enters a supercar, speedboat, or helicopter, their 3D vehicle (with exact type, paint color, spinning wheels, or helicopter rotors) renders seamlessly in the shared world.
   - **Radar & Full City Map:** All online players appear as glowing **cyan blips** (or **gold blips** once friended) on the Minimap and labeled pins on the Full Map (`[M]`). Click any player on the map or in the Phone to set your 3D GPS straight to them.
3. **Add Friend & Live Phone DM Chat:**
   - **Two ways to Add Friend:**
     1. Open Smartphone (`[TAB]`) → **Players** app → view every online player (name, district, distance, vehicle, active mission) → click **`+ Add Friend`**.
     2. Walk up to any player in the city (`< 5.5m`) and press **`[E] ADD FRIEND <NAME>`**.
   - Adding a friend **immediately adds their name to your Phone → Messages chat list** (right alongside Nova), updates their floating 3D nameplate with a gold **`★`** badge, and notifies them live!
   - Open **Messages** → tap any friend to exchange **real-time 1-on-1 DMs** throughout gameplay (with unread badge counters on the Phone button & Messages icon, live toast notifications, quick meet-up replies, and 1-click GPS tracking).
4. **Free Roam Together & Co-op Missions:**
   - Cruise oceanfront boulevards, boat across the bay, visit the mall/café together, or launch any of the 4 Heist Protocol missions — starting a mission broadcasts a co-op banner so friends can click **`JOIN CO-OP`** inside Phone → **Players** to run the same heist operation together!

### Under-the-Hood Networking Architecture
```text
Browser Client (MultiplayerSystem.ts)
 ├── 1. Primary: Dedicated Zero-Dependency RFC 6455 WebSocket Hub (server/index.mjs -> /ws)
 │     • Stores latest state snapshot per connected player for instant new-joiner sync
 │     • Broadcasts 10Hz state transforms, Add Friend handshakes, 1-on-1 DMs & Co-op invites
 │     • Served via RAM pre-gzipped static cache + Cloudflare QUIC Edge (HTTPS + WSS)
 ├── 2. Automatic Global Failover: Pure-TypeScript MQTT 3.1.1 over WSS
 │     • Connects to wss://broker.emqx.io:8084/mqtt (failover: hivemq.com)
 │     • Single global topic: viceprotocol/neoncoast/world1/# (works even on static GitHub Pages!)
 └── 3. Local Multi-Tab Sync: BroadcastChannel('viceprotocol-neoncoast-world1')
       • Instant 0ms synchronization across multiple browser tabs on the same machine
```

---

## ✨ Complete Feature Showcase

### 🚗 Land, Sea & Air Vehicles + 1st-Person Cockpit
- **Open-Source 3D Models:** Photorealistic **Ferrari 458 (`ferrari.glb`)** with metallic clearcoat paint and **crystal-clear see-through windows** + rigged **`Soldier.glb`** skeletal NPCs.
- **Realistic Driving Physics:** Grounded real-world speed scale (`1 m/s = 2.237 MPH`), 6-speed automatic gear shifting, drift multipliers, Nitro overdrive, and solid player-vs-car & tight building/tree collisions.
- **1st-Person Car Dashcam (`[C]`):** Sit behind an animated steering wheel with a live procedural OLED dashboard displaying **MPH, RPM bar, Gear, Odometer, Nitro, and live Spotify track**.
- **In-Car & Phone Spotify Connect (`[K]` / Phone App):** Stream real Spotify playlists/tracks cleanly from the car music player or your smartphone.
- **Marine & Aerial Traversal:** Board moored **Riva Neon Speedboats** off Ocean Pier Marina (buoyancy wave physics & wake splashes) or pilot **Skyhawk Twin-Turbine Helicopters** from the Helipad with collective throttle physics (`Space` climb / `X` descend) overlooking the skyline.

### 🧠 Sentient AI Companion ("Nova")
- **Natural Living Citizen:** Accessible directly as a DM thread inside **Phone → Messages** (zero mentions of AI/LLMs/API keys in the UI).
- **LLM-Driven Physical Agency:** Powered via a secure server-side OpenAI proxy (`POST /api/nova` using `gpt-4o-mini`), Nova perceives your district, health, wanted stars, vehicle, and custom Avatar Name — and physically **walks, runs, dances, waves, rides in your car, heals you, distracts cops, or joins you on a Sunset Café date**.

### 🏢 Instant Walk-In Interiors, Shopping & Wardrobe
- **0ms Seamless Walk-In:** Simply walk straight through glowing glass doors — no `[E]` door prompt and zero black loading screens:
  - **Neon Coast Mall:** Working moving escalators, live animated Food Court queue, burgers/ramen/smoothies (eat immediately or store in **My Bag** to heal HP anytime).
  - **Sunset Beach Café:** Oceanfront coffeehouse ideal for hanging out or taking Nova on a date.
  - **VICE Drip Clothing Store:** Buy & equip 6 distinct outfits that sync live to your 3D avatar and multiplayer peers.
  - **Apex Corporate Tower:** High-rise office with Syndicate intel terminals.

### 🔫 Combat, Arsenal & Visceral Feedback
- **4-Slot Weapon Loadout (`1–4` or Mouse Wheel):** `1` Bare Fists (melee punch), `2` 9mm Tactical Pistol, `3` AK-47 Assault Rifle, `4` M24 Sniper Rifle.
- **Free Mouse-Look & Scoping:** Move mouse smoothly to look around on foot (no click-drag needed); Left-Click only fires/punches; Right-Click or `[V]` engages 2.5× / 4.0× rangefinder scope with **1-shot headshots**, **1st-person on-foot viewmodel (`[C]`)**, directional **crimson blood spatter**, multi-angle death collapses, and **expanding asphalt blood pools**.

### 🎯 The $100,000 Grand Heist Campaign & Sandbox
- **4 Escalating Story Missions:** *Fast Cash: Neon Run* (`+$15k`) → *Blackout: Relay Sabotage* (`+$20k`) → *Apex Machine: Hypercar Heist* (`+$25k`) → *The Grand Heist: Bayview Vault* (`+$40k` + 5★ Chopper Chase + Ocean Pier Mega-Ramp onto Getaway Yacht!).
- **Open-World Activities:** 3 Street Races with Manhattan road-following AI rivals, 6 Stunt Ramps with slow-mo camera, 8 Synth Cassettes, Drive-Through Neon Pay-n-Spray, Armored Cash Vans, Weather toggle (Clear / Neon Rain), and Time-of-Day presets (Sunset / Midnight / Day).

---

## 🎮 Controls Quick Reference

| Key / Input | Action |
| :--- | :--- |
| `W A S D` / Arrow Keys | Drive / Walk / Sail / Pitch Helicopter |
| `Mouse Move` | Smooth 360° Free-Look Camera (On Foot) |
| `Left Click` / `Q` | Punch (Fists) / Fire Weapon / Drive-By Shoot |
| `Right Click` / `V` | Aim / 4× Tactical Sniper Scope |
| `1` `2` `3` `4` / Scroll | Switch Weapon (On Foot: Fists, Pistol, AK-47, Sniper) · Net-Hack (In Car: `1–3`) |
| `R` | Reload Weapon (On Foot) / Switch FM Radio (In Car) |
| `Space` | Handbrake Drift (Car) / Jump (Foot) / Climb Throttle (Helicopter) |
| `Shift` | Nitro Boost (Car/Boat) / Sprint (Foot) |
| `X` / `Ctrl` | Descend Throttle (Helicopter) |
| `E` | Enter/Exit Vehicle · Add Friend / Message Nearby Player · Shop / Talk |
| `C` | Cycle Camera (3rd-Person ↔ **1st-Person Dashcam / FPV** ↔ Top-Down) |
| `Tab` | Open Realistic **Smartphone** (Messages, Players/Friends, Spotify, Ops, Garage, Bag, Outfits, Net-Hack, Upgrades) |
| `K` | Open **In-Car Spotify Music Player** (while inside a vehicle) |
| `M` | Open **Full Interactive Landmark City Map** (click landmarks/players for 3D GPS or invite Nova!) |
| `Esc` | Open **Settings, Weather, Time-of-Day & Fast-Travel Menu** |
| `F` / `H` | Unstuck Vehicle to Nearest Road / Honk Horn |

---

## 🛠️ Tech Stack & Running Locally

- **Frontend:** React 18, TypeScript, Vite 5, Three.js (`r170` + `EffectComposer` UnrealBloom + `DRACOLoader`/`GLTFLoader`), Procedural Web Audio Synth & Engine Audio.
- **Multiplayer & AI Backend:** Zero-dependency Node.js HTTP/WebSocket Single-World Server (`server/index.mjs`) with RAM pre-gzipped asset caching, `/ws` single-world hub, and secure `/api/nova` OpenAI proxy (API keys stay strictly server-side in `.env.local` and are never exposed in client bundles).

```bash
# 1. Install dependencies
npm install

# 2. Configure OpenAI API key for Nova (optional; kept private on server)
cp .env.example .env.local
# Add: OPENAI_API_KEY=sk-...

# 3. Build & run the Single-World Production Server (Frontend + /ws Multiplayer + /api/nova)
npm run build
npm start
# Open http://localhost:8080 (open in 2 tabs to test live multiplayer locally!)
```

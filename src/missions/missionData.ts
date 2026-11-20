export interface CampaignMissionMeta {
  id: string;
  number: number;
  title: string;
  district: string;
  shortDesc: string;
  rewardCash: number;
  unlockLabel: string;
}

export const CAMPAIGN_TARGET_CASH = 100000;

export const CAMPAIGN_MISSIONS: CampaignMissionMeta[] = [
  {
    id: 'm1_neon_run',
    number: 1,
    title: 'FAST CASH: NEON RUN',
    district: 'Neon Strip',
    shortDesc: 'Intercept & wreck 3 Crimson Syndicate Courier SUVs downtown, then scoop the drop.',
    rewardCash: 15000,
    unlockLabel: 'TURBO NITRO MK-II',
  },
  {
    id: 'm2_blackout',
    number: 2,
    title: 'BLACKOUT: RELAY SABOTAGE',
    district: 'Ocean Drive & Downtown',
    shortDesc: 'Smash or blast 3 guarded Syndicate Signal Towers to blind their network.',
    rewardCash: 20000,
    unlockLabel: 'NET-HACK CITY GRID',
  },
  {
    id: 'm3_apex_heist',
    number: 3,
    title: 'APEX MACHINE: HYPERCAR HEIST',
    district: 'Palm Royale -> Harbor Docks',
    shortDesc: 'Steal the Prototype Apex-X from Ocean Drive Valet, survive 3★ cops, and repaint at Pay-n-Spray!',
    rewardCash: 25000,
    unlockLabel: 'APEX-X IN PHONE GARAGE',
  },
  {
    id: 'm4_grand_heist',
    number: 4,
    title: 'THE GRAND HEIST: BAYVIEW VAULT',
    district: 'Causeway Island -> Ocean Pier',
    shortDesc: 'Storm Fort Bayview, crack the Vault Convoy, outrun a 5★ chopper chase, and jump onto the Getaway Yacht!',
    rewardCash: 40000,
    unlockLabel: 'KING OF NEON COAST',
  },
];

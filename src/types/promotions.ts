export interface PromoCast {
  id: string;
  castUrl: string;
  author: {
    fid: number;
    username: string;
    displayName: string;
    pfpUrl?: string;
  };
  rewardPerShare: number;
  totalBudget: number;
  sharesCount: number;
  remainingBudget: number;
  shareText?: string;
  createdAt: string;
  status: "active" | "inactive" | "paused" | "completed";
  blockchainHash?: string;
  // JAVÍTÁS: Hozzáadjuk az új mezőt a kliensoldali típushoz.
  // Opcionális (`?`), mert a régi, még nem szinkronizált promócióknál lehet `null`.
  contractCampaignId?: number;
}

export interface DatabasePromotion {
  id: number;
  fid: number;
  username: string;
  display_name: string | null;
  cast_url: string;
  share_text: string | null;
  reward_per_share: number;
  total_budget: number;
  shares_count: number;
  remaining_budget: number;
  status: "active" | "inactive" | "paused" | "completed";
  blockchain_hash: string | null;
  created_at: string;
  updated_at: string;
  // JAVÍTÁS: Hozzáadjuk az új oszlopot a DB típushoz.
  // Lehet `null`, mert a séma módosítása előtti bejegyzéseknél ez az érték hiányozni fog.
  contract_campaign_id: number | null;
}
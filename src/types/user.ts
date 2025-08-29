// User interface for Farcaster components
export interface User {
  fid: number;
  displayName?: string;
  pfpUrl?: string;
  username?: string;
}

// Extended user interface for more detailed user information
export interface ExtendedUser extends User {
  username: string;
  pfpUrl: string;
  displayName: string;
  bio?: string;
  followersCount?: number;
  followingCount?: number;
  verifiedAddresses?: string[];
}

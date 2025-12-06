export type AccountType = 'personal' | 'business';

export interface AccountProfile {
  bio?: string;
  contact?: {
    phone?: string;
    address?: string;
    hours?: string;
  };
  business?: {
    services?: string[];
    policies?: string[];
  };
  [key: string]: unknown;
}

export interface Account {
  id: string;
  ownerUserId: string;
  username: string;
  displayName: string;
  accountType: AccountType;
  profile: AccountProfile;
  privateContext: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAccountInput {
  username: string;
  displayName: string;
  accountType: AccountType;
  profile?: AccountProfile;
  privateContext?: string;
}

export interface UpdateAccountInput {
  displayName?: string;
  profile?: AccountProfile;
  privateContext?: string;
}

export type AccountType = 'system' | 'singlet';

export type DataSource = 'demo' | 'remote' | 'error';

export type SolaraSystem = {
  id: string;
  name: string;
  description?: string | null;
  accountType: AccountType;
};

export type SolaraMember = {
  id: string;
  name: string;
  pronouns?: string | null;
  avatarUrl?: string | null;
  description?: string | null;
  color?: string | null;
  role?: string | null;
  tags: string[];
  notes?: string | null;
  isArchived?: boolean;
};

export type SolaraFrontEntry = {
  id: string;
  memberIds: string[];
  startedAt: string;
  endedAt?: string | null;
  note?: string | null;
};

export type SolaraNote = {
  id: string;
  memberId?: string | null;
  title?: string | null;
  content: string;
  updatedAt: string;
};

export type SolaraSnapshot = {
  system: SolaraSystem;
  members: SolaraMember[];
  currentFront: SolaraFrontEntry | null;
  frontHistory: SolaraFrontEntry[];
  notes: SolaraNote[];
};

export type DataState = {
  snapshot: SolaraSnapshot;
  source: DataSource;
  loading: boolean;
  message: string;
};

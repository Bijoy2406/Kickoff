export enum TournamentType {
  LEAGUE = 'LEAGUE', // Round Robin
  GROUPS_KNOCKOUT = 'GROUPS_KNOCKOUT' // Groups -> Knockout
}

export enum MatchStatus {
  SCHEDULED = 'SCHEDULED',
  FINISHED = 'FINISHED'
}

export enum Stage {
  GROUP = 'GROUP',
  QUARTER_FINAL = 'QUARTER_FINAL',
  SEMI_FINAL = 'SEMI_FINAL',
  FINAL = 'FINAL'
}

export interface Team {
  id: string;
  name: string;
  stats: {
    played: number;
    won: number;
    drawn: number;
    lost: number;
    gf: number; // Goals For
    ga: number; // Goals Against
    gd: number; // Goal Difference
    points: number;
  };
  group?: string;
}

export interface Match {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number | null;
  awayScore: number | null;
  homePenalty?: number;
  awayPenalty?: number;
  status: MatchStatus;
  stage: Stage;
  group?: string; // If played in group stage
  date?: string;
}

export interface Tournament {
  id: string;
  name: string;
  type: TournamentType;
  teams: Team[];
  matches: Match[];
  groups: string[]; // Array of group names e.g. ['A', 'B']
  currentStage: Stage;
  createdAt: number;
  numGroups?: number; // Number of groups in tournament
  advancingPerGroup?: number; // Number of teams advancing from each group
}

export interface CreateTournamentFormData {
  name: string;
  type: TournamentType;
  teamNames: string[];
}
import { PettyCash } from '../../shared/api/db';

export interface IPettyCashRepository {
  save(pettyCash: PettyCash): Promise<void>;
  getTodayQuery(): Promise<PettyCash[]>;
}

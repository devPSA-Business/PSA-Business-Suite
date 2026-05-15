export interface IDatabaseAdminService {
  exportDatabase(): Promise<string>;
  importDatabase(jsonData: string): Promise<void>;
  clearDatabase(): Promise<void>;
}

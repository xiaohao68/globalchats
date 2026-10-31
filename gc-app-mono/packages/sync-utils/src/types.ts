export interface SyncableEntity {
  version: number;
  updatedAt: number;
}

export interface SyncResult<T> {
  toUpload: T[];
  toUpdate: T[];
  conflicts: T[];
}

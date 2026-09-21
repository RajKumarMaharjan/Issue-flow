import { APP_CONFIG } from "../core/config.js";

export function createDatabase() {
  const db = new Dexie(APP_CONFIG.databaseName);

  db.version(APP_CONFIG.databaseVersion).stores({
    issues:
      "++id,status,priority,assigneeId,dueDate,createdAt,updatedAt,*tagIds",
    users: "id,&email,name",
    tags: "++id,&name",
    activity: "++id,issueId,type,createdAt",
  });

  return db;
}

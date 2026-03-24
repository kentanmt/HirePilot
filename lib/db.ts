// Simple JSON file-based database — no native binaries required
import fs from "fs";
import path from "path";

// On Railway, use /data volume mount if available; otherwise use local data/
const DB_PATH = process.env.RAILWAY_VOLUME_MOUNT_PATH
  ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, "db.json")
  : path.resolve(process.cwd(), "data", "db.json");

type Record = { id: string; [key: string]: any };

interface DB {
  users: Record[];
  userProfiles: Record[];
  accounts: Record[];
  sessions: Record[];
  verificationTokens: Record[];
  jobs: Record[];
  applications: Record[];
  applicationStatusHistories: Record[];
  resumes: Record[];
  contacts: Record[];
  interviewSessions: Record[];
  interviewQuestions: Record[];
  readinessScores: Record[];
}

const EMPTY_DB: DB = {
  users: [],
  userProfiles: [],
  accounts: [],
  sessions: [],
  verificationTokens: [],
  jobs: [],
  applications: [],
  applicationStatusHistories: [],
  resumes: [],
  contacts: [],
  interviewSessions: [],
  interviewQuestions: [],
  readinessScores: [],
};

function loadDB(): DB {
  try {
    if (!fs.existsSync(DB_PATH)) return structuredClone(EMPTY_DB);
    return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
  } catch {
    return structuredClone(EMPTY_DB);
  }
}

function saveDB(data: DB) {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function cuid() {
  return "c" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function matches(record: Record, where: Record): boolean {
  for (const [key, val] of Object.entries(where)) {
    if (val === null || val === undefined) {
      if (record[key] != null) return false;
    } else if (typeof val === "object" && !Array.isArray(val) && !(val instanceof Date)) {
      // Handle { in: [...] } etc.
      if ("in" in val && !val.in.includes(record[key])) return false;
      if ("not" in val && record[key] === val.not) return false;
      if ("contains" in val && !String(record[key] ?? "").toLowerCase().includes(String(val.contains).toLowerCase())) return false;
    } else {
      if (record[key] !== val) return false;
    }
  }
  return true;
}

function makeTable(tableName: keyof DB) {
  return {
    findMany({ where, include, orderBy, take }: any = {}) {
      let data = loadDB();
      let rows = data[tableName] as Record[];
      if (where) rows = rows.filter((r) => matches(r, where));
      if (orderBy) {
        const orderObj = Array.isArray(orderBy) ? orderBy[0] : orderBy;
        const [field, dir] = Object.entries(orderObj)[0] as [string, string];
        rows = [...rows].sort((a, b) => {
          const av = a[field] ?? null;
          const bv = b[field] ?? null;
          if (av === null && bv === null) return 0;
          if (av === null) return dir === "asc" ? -1 : 1;
          if (bv === null) return dir === "asc" ? 1 : -1;
          if (av < bv) return dir === "asc" ? -1 : 1;
          if (av > bv) return dir === "asc" ? 1 : -1;
          return 0;
        });
      }
      if (take) rows = rows.slice(0, take);
      if (include) rows = rows.map((r) => withIncludes(data, tableName, r, include));
      return rows;
    },
    findFirst({ where, include }: any = {}) {
      let data = loadDB();
      let rows = data[tableName] as Record[];
      if (where) rows = rows.filter((r) => matches(r, where));
      const row = rows[0] ?? null;
      if (row && include) return withIncludes(data, tableName, row, include);
      return row;
    },
    findUnique({ where, include }: any = {}) {
      let data = loadDB();
      let rows = data[tableName] as Record[];
      if (where) rows = rows.filter((r) => matches(r, where));
      const row = rows[0] ?? null;
      if (row && include) return withIncludes(data, tableName, row, include);
      return row;
    },
    create({ data: input, include }: any) {
      const db = loadDB();
      const record: Record = {
        id: cuid(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...input,
      };
      (db[tableName] as Record[]).push(record);
      saveDB(db);
      if (include) return withIncludes(db, tableName, record, include);
      return record;
    },
    createMany({ data: inputs }: any) {
      const db = loadDB();
      const records = inputs.map((input: any) => ({
        id: cuid(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...input,
      }));
      (db[tableName] as Record[]).push(...records);
      saveDB(db);
      return { count: records.length };
    },
    update({ where, data: input }: any) {
      const db = loadDB();
      const rows = db[tableName] as Record[];
      const idx = rows.findIndex((r) => matches(r, where));
      if (idx === -1) throw new Error(`Record not found in ${tableName}`);
      rows[idx] = { ...rows[idx], ...input, updatedAt: new Date().toISOString() };
      saveDB(db);
      return rows[idx];
    },
    updateMany({ where, data: input }: any) {
      const db = loadDB();
      const rows = db[tableName] as Record[];
      let count = 0;
      for (let i = 0; i < rows.length; i++) {
        if (!where || matches(rows[i], where)) {
          rows[i] = { ...rows[i], ...input, updatedAt: new Date().toISOString() };
          count++;
        }
      }
      saveDB(db);
      return { count };
    },
    upsert({ where, create: createData, update: updateData }: any) {
      const db = loadDB();
      const rows = db[tableName] as Record[];
      const idx = rows.findIndex((r) => matches(r, where));
      if (idx === -1) {
        const record: Record = {
          id: cuid(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...createData,
        };
        rows.push(record);
        saveDB(db);
        return record;
      } else {
        rows[idx] = { ...rows[idx], ...updateData, updatedAt: new Date().toISOString() };
        saveDB(db);
        return rows[idx];
      }
    },
    delete({ where }: any) {
      const db = loadDB();
      const rows = db[tableName] as Record[];
      const idx = rows.findIndex((r) => matches(r, where));
      if (idx === -1) throw new Error(`Record not found in ${tableName}`);
      const [deleted] = rows.splice(idx, 1);
      saveDB(db);
      return deleted;
    },
    deleteMany({ where }: any = {}) {
      const db = loadDB();
      const rows = db[tableName] as Record[];
      const before = rows.length;
      if (where) {
        db[tableName] = rows.filter((r) => !matches(r, where)) as any;
      } else {
        db[tableName] = [] as any;
      }
      saveDB(db);
      return { count: before - (db[tableName] as Record[]).length };
    },
    count({ where }: any = {}) {
      const db = loadDB();
      let rows = db[tableName] as Record[];
      if (where) rows = rows.filter((r) => matches(r, where));
      return rows.length;
    },
  };
}

// Simple relation resolver for common includes
function withIncludes(db: DB, tableName: keyof DB, row: Record, include: Record): Record {
  const result = { ...row };
  for (const [key, val] of Object.entries(include)) {
    if (!val) continue;
    // Map common include names to their tables and foreign keys
    const relations: Record<string, { table: keyof DB; fk: string; many: boolean }> = {
      user: { table: "users", fk: "userId", many: false },
      profile: { table: "userProfiles", fk: "userId", many: false },
      jobs: { table: "jobs", fk: "userId", many: true },
      applications: { table: "applications", fk: "userId", many: true },
      resumes: { table: "resumes", fk: "userId", many: true },
      contacts: { table: "contacts", fk: "userId", many: true },
      interviewSessions: { table: "interviewSessions", fk: "userId", many: true },
      readinessScores: { table: "readinessScores", fk: "userId", many: true },
      application: { table: "applications", fk: "jobId", many: false },
      statusHistory: { table: "applicationStatusHistories", fk: "applicationId", many: true },
      questions: { table: "interviewQuestions", fk: "sessionId", many: true },
      job: { table: "jobs", fk: "id", many: false },
    };
    const rel = relations[key];
    if (!rel) continue;
    if (rel.many) {
      const fkVal = rel.fk === "userId" ? row.userId : row.id;
      result[key] = (db[rel.table] as Record[]).filter((r) => r[rel.fk] === fkVal);
    } else {
      const fkVal = key === "user" ? row.userId : key === "job" ? row.jobId : row.id;
      result[key] = (db[rel.table] as Record[]).find((r) => r.id === fkVal) ?? null;
    }
  }
  return result;
}

export const db = {
  user: makeTable("users"),
  userProfile: makeTable("userProfiles"),
  account: makeTable("accounts"),
  session: makeTable("sessions"),
  verificationToken: makeTable("verificationTokens"),
  job: makeTable("jobs"),
  application: makeTable("applications"),
  applicationStatusHistory: makeTable("applicationStatusHistories"),
  resume: makeTable("resumes"),
  contact: makeTable("contacts"),
  interviewSession: makeTable("interviewSessions"),
  interviewQuestion: makeTable("interviewQuestions"),
  readinessScore: makeTable("readinessScores"),
  $disconnect() {},
};

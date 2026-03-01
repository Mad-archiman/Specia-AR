import { MongoClient, Db, GridFSBucket } from 'mongodb';

const dbName = process.env.MONGODB_DB_NAME ?? 'specia_ar';
const AR_MODELS_BUCKET = 'ar_models';

let client: MongoClient | null = null;
let db: Db | null = null;

export async function getDb(): Promise<Db> {
  const uri = process.env.MONGODB_URI;
  if (!uri || typeof uri !== 'string' || uri.trim() === '') {
    throw new Error('MONGODB_URI가 설정되지 않았습니다. .env.local에 MONGODB_URI를 추가해 주세요.');
  }
  if (db) return db;
  client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  });
  await client.connect();
  db = client.db(dbName);
  return db;
}

export function getGridFSBucket(): GridFSBucket {
  const database = db ?? null;
  if (!database) throw new Error('DB not connected');
  return new GridFSBucket(database, { bucketName: AR_MODELS_BUCKET });
}

export async function getArModelsBucket(): Promise<GridFSBucket> {
  const database = await getDb();
  return new GridFSBucket(database, { bucketName: AR_MODELS_BUCKET });
}

export interface GeoLocation {
  lat: number;
  lon: number;
  alt?: number;
}

export interface ArModelDoc {
  _id?: unknown;
  code: string;
  fileId: unknown;
  name?: string;
  geoLocation?: GeoLocation;
  createdAt?: Date;
}

export async function getArModelsCollection() {
  const database = await getDb();
  const coll = database.collection<ArModelDoc>('ar_models');
  await coll.createIndex({ code: 1 }, { unique: true }).catch(() => {});
  return coll;
}

export async function getUsersCollection() {
  const database = await getDb();
  const coll = database.collection<UserDoc>('users');
  await coll.createIndex({ userId: 1 }, { unique: true }).catch(() => {});
  return coll;
}

export interface UserDoc {
  _id?: unknown;
  userId: string;
  password: string;
  userType: 'user' | 'admin';
  createdAt?: Date;
}

export interface CompanyDoc {
  _id?: unknown;
  companyName: string;
  contact: string;
  email: string;
}

export interface ProjectDoc {
  _id?: unknown;
  companyId: string;
  year: string;
  projectName: string;
  managerName: string;
  contact: string;
  email: string;
  grantCode: string;
  completed: boolean;
}

export async function getCompaniesCollection() {
  const database = await getDb();
  return database.collection<CompanyDoc>('companies');
}

export async function getProjectsCollection() {
  const database = await getDb();
  const coll = database.collection<ProjectDoc>('projects');
  await coll.createIndex({ companyId: 1 }).catch(() => {});
  return coll;
}

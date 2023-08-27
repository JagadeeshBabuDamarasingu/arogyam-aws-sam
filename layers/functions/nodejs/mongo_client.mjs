import { MongoClient, ServerApiVersion } from "mongodb";

const dbConnUri = process.env.DB_CONN_URI;
export const mDbName = process.env.DB_NAME;

export const mClient = new MongoClient(dbConnUri, {
    compressors: ['snappy', 'zstd'],
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

export const mUserCollection = mClient.db(mDbName).collection("users");
export const mSlotCollection = mClient.db(mDbName).collection("slots");
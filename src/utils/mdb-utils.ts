import { MongoClient } from "mongodb";
export default withMongoDBClient;


/**
 * Wraps the connection to a MongoDB database, manages the execution of a provided asynchronous
 * function  with the database client, and ensures closure of the MongoDB client connection.
 * 
 * @template T The expected return type of the async function.
 * @param mongodbURL The MongoDB connection string URL.
 * @param asyncFunc An asynchronous function that takes the MongoDB client as an argument and performs operations on the database.
 * @returns A Promise resolving to the result of the `asyncFunc` function.
 * @throws Throws an error if no MongoDB URL argument is provided.
 */
async function withMongoDBClient<T>(mongodbURL: string,  asyncFunc: (client: MongoClient) => Promise<T>): Promise<T> {
  if (!mongodbURL) throw new Error("No MongoDB URL argument provided");
  console.log(`Connecting to MongoDB client at: ${redactMongoDbUrl(mongodbURL)}`);
  let mongoDBClient;
  
  try {
    mongoDBClient = new MongoClient(mongodbURL);    
    return await asyncFunc(mongoDBClient);
  } finally {
    mongoDBClient && (await mongoDBClient.close());
    console.log("MongoDB client closed");    
  }
}


/**
 * Creates a redacted version of the MongoDB connection URL by obscuring any present username and
 * password with 'REDACTED'.
 *
 * @param mongodbURL The original MongoDB connection string URL.
 * @returns The redacted MongoDB URL with the username and password obscured.
 */
function redactMongoDbUrl(mongodbURL: string): string {
  const url = new URL(mongodbURL);
  if (url.username) url.username = "REDACTED";
  if (url.password) url.password = "REDACTED";
  return url.toString();
}  

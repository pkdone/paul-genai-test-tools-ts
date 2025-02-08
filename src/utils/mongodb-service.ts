import { MongoClient, MongoError } from "mongodb";

/**
 * A singleton class that manages the connection to a MongoDB database and provides a client 
 * instance.
 */
class MongoDBService {
  private static instance: MongoDBService;
  private client: MongoClient | null = null;
  
  /**
   * Private constructor to prevent instantiation of this class.
   */
  private constructor() {}

  /**
   * Returns the singleton instance of the MongoDBService class
   * 
   * @returns The singleton instance of the MongoDBService class.
   */
  static getInstance(): MongoDBService {
    if (!MongoDBService.instance) {
      MongoDBService.instance = new MongoDBService();
    } 

    return MongoDBService.instance;
  }

  /**
   * Connects to a MongoDB database using the provided connection URL. If a connection already
   * exists, it is closed before establishing a new connection.
   * 
   * @param url The MongoDB connection string URL.
   * @returns A Promise resolving to the connected MongoClient instance.
   */
  async connect(url: string): Promise<MongoClient> {
    if (this.client)  throw new MongoError("MongoDB client is already connected. Close the existing connection first.");
    const newClient = new MongoClient(url);
    await newClient.connect();
    console.log(`Connecting MongoDB client to: ${this.redactbUrl(url)}`);
    this.client = newClient;
    return this.client;
  }

  /**
   * Gets the connected MongoClient instance. If no connection exists, an error is thrown.
   * 
   * @returns The connected MongoClient instance.
   */
  getClient(): MongoClient {
    if (!this.client) {
      throw new MongoError("MongoDB client is not connected. Call `connect(url)` first.");
    }

    return this.client;
  }

  /**
   * Closes the MongoDB client connection.
   */
  async close(): Promise<void> {
    if (!this.client) return;
    await this.client.close();
    this.client = null;
  }

  /**
   * Creates a redacted version of the MongoDB connection URL by obscuring any present username and
   * password with 'REDACTED'.
   *
   * @param url The original MongoDB connection string URL.
   * @returns The redacted MongoDB URL with the username and password obscured.
   */
  redactbUrl(url: string): string {
    const redactdeUrl = new URL(url);
    if (redactdeUrl.username) redactdeUrl.username = "REDACTED";
    if (redactdeUrl.password) redactdeUrl.password = "REDACTED";
    return redactdeUrl.toString();
  }  
}

const mongoDBService = MongoDBService.getInstance();
export default mongoDBService;

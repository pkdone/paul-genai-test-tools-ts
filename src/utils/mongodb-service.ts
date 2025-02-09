import { MongoClient, MongoClientOptions, MongoError } from "mongodb";

/**
 * A class that manages multiple MongoDB connections and provides client instances.
 */
class MongoDBService {
  private static instance: MongoDBService;
  private readonly clients: Map<string, MongoClient> = new Map();

  /**
   * Private constructor to prevent external instantiation.
   */
  private constructor() {}

  /**
   * Returns the singleton instance of the MongoDBService class.
   *
   * @returns The singleton instance.
   */
  static getInstance(): MongoDBService {
    if (!MongoDBService.instance) {
      MongoDBService.instance = new MongoDBService();
      Object.freeze(MongoDBService.instance);
    }

    return MongoDBService.instance;
  }

  /**
   * Connects to a MongoDB instance using the given id and URL. Wraps the MongoClient instance to
   * intercept close() and remove the client from the the services's list of active clients..
   *
   * @param id The id identifying the connection.
   * @param url The MongoDB connection string.
   * @returns A Promise resolving to the connected MongoClient instance.
   */
  async connect(id: string, url: string, options?: MongoClientOptions): Promise<MongoClient> {
    if (this.clients.has(id)) {
      console.warn(`MongoDB client with id '${id}' is already connected.`);
      return this.clients.get(id)!;
    }

    console.log(`Connecting MongoDB client to: ${this.redactUrl(url)}`);

    try {
      const newClient = new MongoClient(url, options);
      await newClient.connect();

      // Wrap close() method to intercept client closure
      const originalClose = newClient.close.bind(newClient);
      newClient.close = async (...args: Parameters<MongoClient["close"]>) => {
        this.clients.delete(id); // Remove reference to client from the list
        return originalClose(...args); // Call original close()
      };

      this.clients.set(id, newClient);
      return newClient;
    } catch (error) {
      console.error(`Failed to connect to MongoDB: ${error}`);
      throw new MongoError(`Failed to connect to MongoDB with id '${id}'.`);
    }
  }

  /**
   * Retrieves an existing MongoDB client by id.
   *
   * @param id The id identifying the connection.
   * @returns The MongoClient instance.
   * @throws MongoError if the client is not connected.
   */
  getClient(id: string): MongoClient {
    const client = this.clients.get(id);
    if (!client) throw new MongoError(`No active connection found for id '${id}'. Call \`connect(id, url)\` first.`);
    return client;
  }

  /**
   * Closes all MongoDB connections.
   */
  async closeAll(): Promise<void> {
    for (const [id, client] of this.clients.entries()) {
      try {
        await client.close();
        console.log(`Closed MongoDB connection for id '${id}'.`);
      } catch (error) {
        console.error(`Error closing MongoDB client '${id}': ${error}`);
      }
    }

    this.clients.clear();
  }

  /**
   * Redacts sensitive credentials from a MongoDB connection string.
   *
   * @param url The MongoDB connection string.
   * @returns A redacted connection string.
   */
  redactUrl(url: string): string {
    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.username || parsedUrl.password) {
        parsedUrl.username = "REDACTED";
        parsedUrl.password = "REDACTED";
      }
      return parsedUrl.toString();
    } catch (error) {
      console.warn("Could not parse URL for redaction.");
      return "REDACTED_URL";
    }
  }
}

// Ensure proper cleanup on application exit.
const mongoDBService = MongoDBService.getInstance();
process.on("SIGINT", async () => {
  await mongoDBService.closeAll();
  console.log("MongoDB connections closed. Exiting process.");
  process.exit(0);
});

export default mongoDBService;

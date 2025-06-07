import { MongoClient, MongoClientOptions, MongoError } from "mongodb";
import { logErrorMsgAndDetail } from "../utils/error-utils";
import databaseConfig from "../config/database.config";

/**
 * A factory class for creating and managing MongoDB client connections.
 * This replaces the singleton pattern with dependency injection.
 */
export class MongoDBClientFactory {
  private readonly clients = new Map<string, MongoClient>();

  /**
   * Connects to a MongoDB instance using the given id and URL.
   *
   * @param id The id identifying the connection.
   * @param url The MongoDB connection string.
   * @param options Optional MongoDB client options.
   * @returns A Promise resolving to the connected MongoClient instance.
   */
  async connect(id: string, url: string, options?: MongoClientOptions): Promise<MongoClient> {
    if (this.clients.has(id)) {
      console.warn(`MongoDB client with id '${id}' is already connected.`);
      const client = this.clients.get(id);
      if (!client) throw new MongoError(`No active connection found for id '${id}'.`);
      return client;
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
    } catch (error: unknown) {
      logErrorMsgAndDetail("Failed to connect to MongoDB", error);
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
   * Closes all MongoDB connections managed by this factory.
   */
  async closeAll(): Promise<void> {
    for (const [id, client] of this.clients.entries()) {
      try {
        await client.close();
        console.log(`Closed MongoDB connection for id '${id}'.`);
      } catch (error: unknown) {
        logErrorMsgAndDetail(`Error closing MongoDB client '${id}'`, error);
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
  private redactUrl(url: string): string {
    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.username || parsedUrl.password) {
        parsedUrl.username = databaseConfig.REDACTED_CREDENTIALS;
        parsedUrl.password = databaseConfig.REDACTED_CREDENTIALS;
      }
      return parsedUrl.toString();
    } catch (error: unknown) {
      logErrorMsgAndDetail("Could not parse URL for redaction", error); 
      return databaseConfig.REDACTED_URL;
    }
  }
} 
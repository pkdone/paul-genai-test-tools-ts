/**
 * Abstract error class to represent a generic problem using an LLM implementation.
 */
export abstract class LLMError extends Error {
  /** 
   * Constructor.
   */
  constructor(name: string, message: string) {
      super(message);
      this.name = name;
  }

  /**
   * Protected helper method to build consistent error messages with payload information.
   * @param baseMessage The base error message
   * @param payloadLabel The label for the payload (e.g., "Content", "Reason")
   * @param payload The payload to be stringified and included in the message
   * @returns The formatted message string
   */
  protected static buildMessage(baseMessage: string, payloadLabel: string, payload: unknown): string {
    const stringifiedPayload = JSON.stringify(payload);
    return `${baseMessage}. ${payloadLabel}: ${stringifiedPayload}`;
  }
}

/**
 * Error class to represent a problem with the content received from an LLM implementation.
 */
export class BadResponseContentLLMError extends LLMError {
  /** 
   * The content received in the LLM implementation's response.
   */
  readonly content: string;

  /** 
   * Constructor.
   */
  constructor(message: string, content: unknown = null) {
    super(BadResponseContentLLMError.name, LLMError.buildMessage(message, "Content", content));
    this.content = JSON.stringify(content);
  }
}

/**
 * Error class to represent a problem with the metadata received from an LLM implementation's
 * response.
 */
export class BadResponseMetadataLLMError extends LLMError {
  /** 
   * The metadata received from the LLM implementation.
   */
  readonly metadata: string;

  /** 
   * Constructor.
   */
  constructor(message: string, metadata: unknown = null) {
    super(BadResponseMetadataLLMError.name, LLMError.buildMessage(message, "Metadata", metadata));
    this.metadata = JSON.stringify(metadata);
  }
}

/**
 * Error class to represent a problem with the configuration used to initialize LLM implementation.
 */
export class BadConfigurationLLMError extends LLMError {
  /** 
   * The configuration used to initiatize the LLM implementation.
   */
  readonly config: string;

  /** 
   * Constructor.
   */
  constructor(message: string, config: unknown = null) {
    super(BadConfigurationLLMError.name, LLMError.buildMessage(message, "Config", config));
    this.config = JSON.stringify(config);
  }
}

/**
 * Error class to indicate that the LLM implementation rejected the request.
 */
export class RejectionResponseLLMError extends LLMError {
  /** 
   * The rejection reason received from the LLM implementation.
   */
  readonly reason: string;

  /** 
   * Constructor.
   */
  constructor(message: string, reason: unknown = null) {
    super(RejectionResponseLLMError.name, LLMError.buildMessage(message, "Reason", reason));
    this.reason = JSON.stringify(reason);
  }
}

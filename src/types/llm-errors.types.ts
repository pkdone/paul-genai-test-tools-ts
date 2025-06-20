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
    const stringifiedContent = JSON.stringify(content);
    super(BadResponseContentLLMError.name, `${message}. Content: ${stringifiedContent}`);
    this.content = stringifiedContent;
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
    const stringifiedMetadata = JSON.stringify(metadata);
    super(BadResponseMetadataLLMError.name, `${message}. Metadata: ${stringifiedMetadata}`);
    this.metadata = stringifiedMetadata;
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
    const stringifiedConfig = JSON.stringify(config);
    super(BadConfigurationLLMError.name, `${message}. Config: ${stringifiedConfig}`);
    this.config = stringifiedConfig;
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
    const stringifiedReason = JSON.stringify(reason);
    super(RejectionResponseLLMError.name, `${message}. Reason: ${stringifiedReason}`);
    this.reason = stringifiedReason;
  }
}

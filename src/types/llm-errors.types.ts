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
    super(BadResponseContentLLMError.name, `${message}. Content: ${stringify(content)}`);
    this.content = stringify(content);    
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
    super(BadResponseMetadataLLMError.name, `${message}. Metadata: ${stringify(metadata)}`);
    this.metadata = stringify(metadata);    
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
    super(BadConfigurationLLMError.name, `${message}. Config: ${stringify(config)}`);
    this.config = stringify(config);    
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
    super(RejectionResponseLLMError.name, `${message}. Reason: ${stringify(reason)}`);
    this.reason = stringify(reason);    
  }
}

/**
 * Convert a variable to a string.
 */
function stringify(myvar: unknown) {
  return JSON.stringify(myvar);
}

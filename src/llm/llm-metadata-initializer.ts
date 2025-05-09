import { JSONLLMModelMetadata, LLMApiFamily, LLMModelMetadata, LLMPurpose } from "../types/llm-types";
import { ModelKey } from "../types/llm-models-metadata";
import { LLMMetadataError } from "../types/llm-errors";

// Enum to define the keys of the LLM metadata properties
enum LlmMetadataProps { 
  MODEL_ID = "modelId",
  PURPOSE = "purpose",
  DIMENSIONS = "dimensions",
  MAX_COMPLETION_TOKENS = "maxCompletionTokens",
  MAX_TOTAL_TOKENS = "maxTotalTokens",
  API_FAMILY = "apiFamily",
};

// Type to define the set of seemingly optional model metadata properties that are actually
type ModelMetadataOptionalPropsToCheck = Readonly<Record<string, LLMPurpose>>;

// Set of seemingly optional model metadata properties that are actually mandatory depending on the 
// purpose of the model.
const modelMetadataOptionalPropsToCheck: ModelMetadataOptionalPropsToCheck = {
  [LlmMetadataProps.DIMENSIONS]: LLMPurpose.EMBEDDINGS,
  [LlmMetadataProps.MAX_COMPLETION_TOKENS]: LLMPurpose.COMPLETIONS,
} as const;

/**
 * 
 */
class LLMModelsMetadata {
  /**
   * Import LLM models JSON metadata after first checking its fields are valid.
   */
  assembleLLMModelMetadataFromJSON(jsonLlmModelsData: Record<string, JSONLLMModelMetadata>) {
    this.validateJSONModelMetadata(jsonLlmModelsData);
    const llmModelsMetadata = jsonLlmModelsData as Record<string, LLMModelMetadata>;
    llmModelsMetadata[ModelKey.UNSPECIFIED] = {   // Add entity to represent an unspecified model
      modelId: "n/a",
      purpose: LLMPurpose.N_A,
      maxTotalTokens: 999999999,
      apiFamily: LLMApiFamily.N_A,
    }
    return llmModelsMetadata;
  }

  /**
   * Validate the JSON metadata for LLM models.
   * 
   * Note, mandatory property presence checks and type checks (e.g., is number or string) are not 
   * required because the subsequent conversions form the JSON type to the final LLMModelMetadata type
   * will enforce these constraints.
   */
  private validateJSONModelMetadata(llmModelsData: Record<string, JSONLLMModelMetadata>) {
    for (const [key, model] of Object.entries(llmModelsData)) {
      // Presence checks for "optional" properties
      for (const property of Object.keys(modelMetadataOptionalPropsToCheck)) {
        this.errorIfPropertyMissing(model, modelMetadataOptionalPropsToCheck, key, property);
      }

      // Checks of each property's value
      this.errorIfPropertyEnumInvalid<LLMPurpose>(model, key, LlmMetadataProps.PURPOSE, LLMPurpose);
      this.errorIfPropertyNonPositiveNumber(model, modelMetadataOptionalPropsToCheck, key, LlmMetadataProps.DIMENSIONS);
      this.errorIfPropertyNonPositiveNumber(model, modelMetadataOptionalPropsToCheck, key, LlmMetadataProps.MAX_COMPLETION_TOKENS);
      this.errorIfPropertyNonPositiveNumber(model, modelMetadataOptionalPropsToCheck, key, LlmMetadataProps.MAX_TOTAL_TOKENS);    
      this.errorIfPropertyEnumInvalid<LLMApiFamily>(model, key, LlmMetadataProps.API_FAMILY, LLMApiFamily);
    }
  }

  /**
   * Throw and error if the specific property is missing from the model definition and it is supposed
   * to be their for the LLM's specific purpose (i.e., embeddings vs completions).
   */
  private errorIfPropertyMissing(model: JSONLLMModelMetadata, optionalPropsToCheck: ModelMetadataOptionalPropsToCheck, key: string, property: string) {
    if (!this.doPropertyCheck(optionalPropsToCheck, property, model.purpose)) return;

    if (!Object.hasOwn(model, property)) {
      throw new LLMMetadataError(`Model for '${key} is missing property'`, property);
    }
  }

  /**
   * Throw an error if the specific enum property does not match a legal enum value.
   */
  private errorIfPropertyEnumInvalid<T>(model: JSONLLMModelMetadata, key: string, property: string, propertyEnumKeyValues: Record<string, T>) {
    const modelWithStringKeys = model as Record<string, T>;

    if (!Object.values(propertyEnumKeyValues).includes(modelWithStringKeys[property])) {
      throw new LLMMetadataError(`Invalid '${property}' value for model '${key}'`, modelWithStringKeys[property]);
    }
  }

  /**
   * Throw an error if the specific property's value is not a positive number.
   */
  private errorIfPropertyNonPositiveNumber(model: JSONLLMModelMetadata, optionalPropsToCheck: ModelMetadataOptionalPropsToCheck, key: string, property: string) {
    if (!this.doPropertyCheck(optionalPropsToCheck, property, model.purpose)) return;
    const propVal = model[property] as number;
    
    if (!propVal || propVal <= 0) {
      throw new LLMMetadataError(`Value of '${property}' for model '${key}' should be a positive number`, propVal);
    }
  }

  /**
   * Determine if need to check a property where for "optional" properties, only want to do the check
   * depending on whether model is embeddings or completions - for mandatory properties always check.
   */
  private doPropertyCheck(optionalPropsToCheck: ModelMetadataOptionalPropsToCheck, property: string, purpose: string | undefined) {
    return ((!(property in optionalPropsToCheck)) || (optionalPropsToCheck[property] === purpose));
  }
}

export default LLMModelsMetadata;
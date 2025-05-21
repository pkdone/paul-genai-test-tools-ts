# LLM Provider Abstraction Refactoring

## Overview

This document explains the changes made to improve the LLM provider management system using the Factory pattern. The refactoring was done to address the issue outlined in the code review, which noted that the previous implementation used a large switch statement to handle different LLM providers and made it difficult to add new providers.

## Changes Made

### 1. LLM Configuration Types

Created a new file `src/types/llm-config-types.ts` with:
- `LLMProviderType` enum for provider types (OPENAI, AZURE, VERTEX, BEDROCK)
- `BedrockVariantType` enum for Bedrock variants (TITAN, CLAUDE, LLAMA, etc.)
- Base `LLMProviderConfig` interface
- Provider-specific configurations: `OpenAIConfig`, `AzureOpenAIConfig`, `VertexAIGeminiConfig`, `BedrockConfig`
- Union type `LLMConfig` to represent all possible configurations

### 2. Environment Variables Structure

Enhanced `src/types/env-types.ts` with helper functions to extract typed configurations:
- `getOpenAIConfig(env)`: Extracts OpenAI configuration
- `getAzureOpenAIConfig(env)`: Extracts Azure OpenAI configuration
- `getVertexAIConfig(env)`: Extracts VertexAI Gemini configuration
- `getBedrockConfig(env, variant)`: Extracts AWS Bedrock configuration with specific variant

### 3. LLM Provider Factory

Created a new module `src/llm/llm-configurator/llm-provider-factory.ts` that:
- Exports `registerProvider()` function to register LLM provider implementations
- Exports `createProvider()` function to instantiate the appropriate LLM based on config
- Automatically registers all existing LLM providers at module initialization
- Uses strongly-typed enums for provider types and Bedrock variants

### 4. Simplified LLM Initializer

Refactored `src/llm/llm-configurator/llm-initializer.ts` to:
- Determine the appropriate configuration based on the model family
- Use the factory to create the LLM provider implementation
- Use enum values instead of magic strings for provider types and Bedrock variants

## Benefits

1. **Extensibility**: Adding a new LLM provider requires:
   - Adding a new provider type to the `LLMProviderType` enum
   - Adding a new provider configuration interface
   - Creating a helper function to extract configuration from environment variables
   - Registering the provider in the factory
   - No changes needed to the core factory logic

2. **Type Safety**:
   - Enums for provider types and Bedrock variants prevent typos and provide autocomplete
   - Each provider configuration has its own interface with appropriate fields
   - Exhaustive type checking ensures handling of all possible cases

3. **Maintainability**: 
   - Clear separation between configuration and instantiation
   - Type safety for provider configurations
   - Centralized provider registration
   - No magic strings for provider types or variant names

4. **Testability**:
   - Provider creation logic can be tested independently
   - Factory can be mocked easily for testing other components

## How to Add a New LLM Provider

1. Add the new provider type to the `LLMProviderType` enum
2. Create a new LLM implementation class extending `AbstractLLM`
3. Add the new provider configuration interface to `llm-config-types.ts`
4. Add a helper function in `env-types.ts` to extract the configuration
5. Register the provider in `llm-provider-factory.ts`
6. Add a case in the switch statement in `llm-initializer.ts` to map from ModelFamily to configuration

This new approach eliminates the need to modify multiple files when adding or modifying LLM providers, and provides a more structured and type-safe way to handle provider-specific configurations. 
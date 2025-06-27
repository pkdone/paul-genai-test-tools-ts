import { z } from 'zod';
import { schemaToJsonString } from './schema-utils';

describe('schema-utils', () => {
  describe('schemaToJsonString', () => {
    it('should convert a simple string schema to JSON string', () => {
      const schema = z.string();
      const result = schemaToJsonString(schema);
      
      expect(typeof result).toBe('string');
      expect(result).toContain('"type": "string"');
      
      // Verify it's valid JSON
      expect(() => {
        JSON.parse(result);
      }).not.toThrow();
    });

    it('should convert an object schema to JSON string', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });
      const result = schemaToJsonString(schema);
      
      expect(typeof result).toBe('string');
      expect(result).toContain('"type": "object"');
      expect(result).toContain('"properties"');
      expect(result).toContain('"name"');
      expect(result).toContain('"age"');
      
      // Verify it's valid JSON
      expect(() => {
        JSON.parse(result);
      }).not.toThrow();
    });

    it('should format JSON with proper indentation', () => {
      const schema = z.object({
        nested: z.object({
          value: z.string(),
        }),
      });
      const result = schemaToJsonString(schema);
      
      // Check that the result has proper formatting (includes newlines and spaces)
      expect(result).toContain('\n');
      expect(result).toContain('  '); // Two spaces for indentation
    });

    it('should handle array schemas', () => {
      const schema = z.array(z.string());
      const result = schemaToJsonString(schema);
      
      expect(typeof result).toBe('string');
      expect(result).toContain('"type": "array"');
      expect(result).toContain('"items"');
      
      // Verify it's valid JSON
      expect(() => {
        JSON.parse(result);
      }).not.toThrow();
    });

    it('should handle optional fields', () => {
      const schema = z.object({
        required: z.string(),
        optional: z.string().optional(),
      });
      const result = schemaToJsonString(schema);
      
      expect(typeof result).toBe('string');
      expect(result).toContain('"type": "object"');
      expect(result).toContain('"properties"');
      expect(result).toContain('"required"');
      expect(result).toContain('"optional"'); // Optional fields appear in properties
      expect(result).toContain('[\n    "required"\n  ]'); // Only required field is in the required array
      
      // Verify it's valid JSON
      expect(() => {
        JSON.parse(result);
      }).not.toThrow();
    });
  });
}); 
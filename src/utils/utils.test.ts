import { extractSpecialTypeFromObj, convertToType } from "./envvar-utils";
import { getFileSuffix } from "./basics-utils";


test(`extract date from json`, () => {
  const dateStr = "2024-06-29T12:00:00Z";
  const inputDate = {
    type: "date",
    value: dateStr,
  };
  expect(extractSpecialTypeFromObj(inputDate)).toEqual(new Date(dateStr));  
});


test('Numeric Conversion', () => {
  expect(convertToType('123')).toBe(123);
  expect(convertToType('3.14')).toBe(3.14);
  expect(convertToType('-42')).toBe(-42);
});


test('Boolean Conversion', () => {
  expect(convertToType('true')).toBe(true);
  expect(convertToType('false')).toBe(false);
});


test('Null and Undefined Conversion', () => {
  expect(convertToType('null')).toBe(null);
  expect(convertToType('undefined')).toBe(undefined);
});


test('Fallback to String', () => {
  expect(convertToType('not a number')).toBe('not a number');
  expect(convertToType('{"key": "value"}')).toStrictEqual({"key": "value"});
});


test('JSON Conversion', () => {
  expect(convertToType('{"name": "John"}')).toEqual({ name: 'John' });
  expect(convertToType('[1, 2, 3]')).toEqual([1, 2, 3]);
});


test('Special Types Handling', () => {
  const dateStr = "2024-06-29T12:00:00.000Z";
  expect(convertToType(JSON.stringify(new Date(dateStr)))).toBe(dateStr);
});

test(`getFileSuffix normal`, () => {
  expect(getFileSuffix("myfile.txt")).toBe("txt");
});

test(`getFileSuffix no sufix`, () => {
  expect(getFileSuffix("myfile.")).toBe("");
});

test(`getFileSuffix just dot`, () => {
  expect(getFileSuffix("myfile")).toBe("");
});

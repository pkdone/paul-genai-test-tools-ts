import { countLines } from "./text-utils";
import { getFileSuffix } from "./fs-utils";

test("getFileSuffix normal", () => {
  expect(getFileSuffix("myfile.txt")).toBe("txt");
});

test("getFileSuffix no sufix", () => {
  expect(getFileSuffix("myfile.")).toBe("");
});

test("getFileSuffix just dot", () => {
  expect(getFileSuffix("myfile")).toBe("");
});

test(`countLines mixed`, () => {
  expect(countLines("\none and\n two, 40 here\n yep \t what ?\n this ")).toBe(5);
});

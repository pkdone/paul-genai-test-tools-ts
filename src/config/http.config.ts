/**
 * HTTP server configuration constants
 */
export const httpConfig = {
  // HTTP status codes
  HTTP_INTERNAL_SERVER_ERROR_CODE: 500,
  HTTP_BAD_REQUEST_CODE: 400,
  HTTP_NOT_FOUND_CODE: 404,

  // HTTP methods
  METHOD_GET: "GET",
  METHOD_POST: "POST",

  // HTTP content types
  ENCODING_UTF8: "utf8",
} as const;

export default httpConfig;

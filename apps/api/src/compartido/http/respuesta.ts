import { Response } from "express";

function serializar<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_key, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  ) as T;
}

export function responderExito<T>(response: Response, data: T, statusCode = 200) {
  response.status(statusCode).json({
    ok: true,
    data: serializar(data)
  });
}

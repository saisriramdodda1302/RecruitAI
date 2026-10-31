export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function parse(schema, data) {
  const out = schema.safeParse(data);
  if (!out.success) throw new HttpError(400, out.error.issues[0]?.message || 'Invalid request.');
  return out.data;
}

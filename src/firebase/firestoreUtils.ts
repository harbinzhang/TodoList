type PlainObject = Record<string, unknown>;

function isPlainObject(value: unknown): value is PlainObject {
  return (
    typeof value === 'object' &&
    value !== null &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

export function cleanFirestoreData<T extends PlainObject>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [
        key,
        isPlainObject(value) ? cleanFirestoreData(value) : value,
      ])
  ) as T;
}

export function safeToDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;

  if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof (value as { toDate?: unknown }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate();
  }

  if (typeof value === 'object' && value !== null) {
    const raw = value as Record<string, unknown>;
    const seconds =
      typeof raw.seconds === 'number'
        ? raw.seconds
        : typeof raw._seconds === 'number'
          ? raw._seconds
          : undefined;

    if (seconds !== undefined) {
      return new Date(seconds * 1000);
    }
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const candidate = new Date(value);
    if (!Number.isNaN(candidate.getTime())) {
      return candidate;
    }
  }

  return undefined;
}

export function mapFirestoreDocument<T extends { id: string }>(
  id: string,
  data: Record<string, unknown>,
  transforms: Partial<Record<Exclude<keyof T, 'id'>, (value: unknown) => unknown>> = {}
): T {
  const entries = Object.entries(transforms).map(([key, transform]) => [
    key,
    typeof transform === 'function' ? transform(data[key]) : data[key],
  ]);

  return {
    id,
    ...data,
    ...Object.fromEntries(entries),
  } as T;
}

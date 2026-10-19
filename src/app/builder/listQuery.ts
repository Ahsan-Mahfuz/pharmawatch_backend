export type ListMeta = {
  page: number;
  limit: number;
  total: number;
  totalPage: number;
};

export type ListResult<T> = { data: T[]; meta: ListMeta };

export const pageOf = (query: Record<string, unknown>, defaultLimit = 20) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
};

export const listMeta = (page: number, limit: number, total: number): ListMeta => ({
  page,
  limit,
  total,
  totalPage: Math.max(1, Math.ceil(total / limit)),
});

export const sortFrom = (
  value: unknown,
  allowed: Record<string, Record<string, 1 | -1>>,
  fallback: string,
): Record<string, 1 | -1> => allowed[String(value ?? "")] ?? allowed[fallback];

export const paginate = <T>(rows: T[], page: number, limit: number): T[] =>
  rows.slice((page - 1) * limit, (page - 1) * limit + limit);

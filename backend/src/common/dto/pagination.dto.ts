import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/**
 * Query params de listagem observados em produção:
 * `?limit=15&page=1&sortBy=updatedAt&sortOrder=desc`
 */
export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 15;

  @IsOptional()
  @IsString()
  sortBy: string = 'updatedAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder: 'asc' | 'desc' = 'desc';
}

// Envelope idêntico ao da produção: { items, pagination }.
export interface Paginated<T> {
  items: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export function paginate<T>(items: T[], total: number, page: number, limit: number): Paginated<T> {
  return { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
}

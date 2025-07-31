import { IsString, IsOptional } from 'class-validator';

export class CreateTenantDto {
  @IsString()
  readonly name: string;

  @IsOptional()
  @IsString()
  readonly address?: string;

  @IsOptional()
  @IsString()
  readonly domain?: string;
}

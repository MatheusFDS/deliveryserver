import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ContactDto {
  @IsNotEmpty()
  @IsString()
  companyName: string;

  @IsNotEmpty()
  @IsString()
  contactName: string;

  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  phone: string;

  @IsNotEmpty()
  @IsString()
  cnpj: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsString()
  source?: string = 'landing-page';
}

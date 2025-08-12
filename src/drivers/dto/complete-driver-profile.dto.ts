import {
  IsString,
  IsNotEmpty,
  MaxLength,
  Length,
  Matches,
} from 'class-validator';

export class CompleteDriverProfileDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsNotEmpty()
  @Length(11, 11)
  @Matches(/^\d{11}$/)
  license: string;

  @IsString()
  @IsNotEmpty()
  @Length(11, 11)
  @Matches(/^\d{11}$/)
  cpf: string;
}

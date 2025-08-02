import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsNumber,
  Min,
  Max, // Importar Max
  IsUUID,
  IsPositive,
} from 'class-validator';

export class CreateCategoryDto {
  @IsString({ message: 'O nome da categoria deve ser uma string.' })
  @IsNotEmpty({ message: 'O nome da categoria não pode estar vazio.' })
  @MaxLength(100, {
    message: 'O nome da categoria não pode ter mais de 100 caracteres.',
  })
  name: string;

  @IsNumber(
    { allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 },
    { message: 'O valor deve ser um número válido.' },
  )
  @IsPositive({ message: 'O valor deve ser um número positivo.' })
  @Min(0, { message: 'O valor não pode ser negativo.' })
  @Max(9999999.99, {
    message: 'O valor não pode ter mais de 7 dígitos (ex: 9.999.999,99).',
  }) // Adicionada validação para 7 dígitos
  valor: number;

  @IsUUID('4', {
    message: 'O ID do tenant deve ser um UUID válido (versão 4).',
  })
  @IsNotEmpty({ message: 'O ID do tenant não pode estar vazio.' })
  tenantId: string;
}

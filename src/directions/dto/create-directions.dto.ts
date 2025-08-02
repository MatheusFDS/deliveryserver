import {
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
  Max,
  Length,
} from 'class-validator';
import { IsPositive } from 'class-validator';

// Exemplo: Se 'regiao' for um conjunto predefinido de valores, você pode usar um enum
// Se for um campo de texto livre, o IsString e MaxLength serão suficientes.
// Para este exemplo, vou considerar que 'regiao' pode ser um campo de texto, mas com limite de tamanho.
// Se você tiver um enum para regiões, me informe para ajustarmos.

export class CreateDirectionsDto {
  @IsString({ message: 'O CEP de início deve ser uma string.' })
  @IsNotEmpty({ message: 'O CEP de início é obrigatório.' })
  @Length(8, 8, { message: 'O CEP de início deve ter exatamente 8 dígitos.' }) // Garante 8 dígitos
  // Opcional: Adicionar um Regex para garantir que são apenas números, se o CEP não tiver hífen.
  // @Matches(/^\d{8}$/, { message: 'O CEP de início deve conter apenas 8 dígitos numéricos.' })
  rangeInicio: string; // Agora interpretado como CEP

  @IsString({ message: 'O CEP de fim deve ser uma string.' })
  @IsNotEmpty({ message: 'O CEP de fim é obrigatório.' })
  @Length(8, 8, { message: 'O CEP de fim deve ter exatamente 8 dígitos.' }) // Garante 8 dígitos
  // Opcional: Adicionar um Regex para garantir que são apenas números.
  // @Matches(/^\d{8}$/, { message: 'O CEP de fim deve conter apenas 8 dígitos numéricos.' })
  rangeFim: string; // Agora interpretado como CEP

  @IsNumber(
    { allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 },
    { message: 'O valor da direção deve ser um número válido.' },
  )
  @IsPositive({ message: 'O valor da direção deve ser um número positivo.' })
  @Min(0, { message: 'O valor da direção não pode ser negativo.' })
  @Max(999999.99, {
    message:
      'O valor da direção não pode ter mais de 6 dígitos inteiros (ex: 999.999,99).',
  })
  valorDirecao: number;

  @IsString({ message: 'A região deve ser uma string.' })
  @IsNotEmpty({ message: 'A região é obrigatória.' })
  @Length(3, 100, {
    message: 'A região deve ter entre 3 e 100 caracteres.',
  }) // Ajustado para um comprimento mínimo e máximo
  // Se 'regiao' tiver valores fixos, considere usar @IsIn ou @IsEnum:
  // @IsIn(['Norte', 'Sul', 'Leste', 'Oeste', 'Centro'], { message: 'A região informada não é válida.' })
  // Ou se tiver um enum:
  // @IsEnum(RegionEnum, { message: 'A região informada não é válida.' })
  regiao: string;
}

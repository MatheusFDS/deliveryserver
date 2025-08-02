import {
  IsString,
  IsUUID,
  IsNumber,
  IsOptional,
  IsNotEmpty, // Para campos obrigatórios
  MaxLength, // Para modelos
  Length, // Para placas
  Matches, // Para placas
  IsPositive, // Para cubagem e pesoMaximo
  Min, // Para cubagem e pesoMaximo (permite 0, se for o caso)
  Max, // Para cubagem e pesoMaximo
} from 'class-validator';

export class CreateVehicleDto {
  @IsString({ message: 'O modelo do veículo deve ser uma string.' })
  @IsNotEmpty({ message: 'O modelo do veículo é obrigatório.' })
  @MaxLength(100, {
    message: 'O modelo do veículo não pode ter mais de 100 caracteres.',
  }) // Limite de tamanho razoável para o modelo (ex: "Fiat Strada Endurance")
  model: string;

  @IsString({ message: 'A placa do veículo deve ser uma string.' })
  @IsNotEmpty({ message: 'A placa do veículo é obrigatória.' })
  // Validações para placas brasileiras (antiga e Mercosul)
  @Length(7, 7, {
    message: 'A placa do veículo deve ter exatamente 7 caracteres.',
  }) // Ambas têm 7 caracteres
  @Matches(/^[A-Z]{3}\d{4}$|^[A-Z]{3}\d[A-Z]\d{2}$/, {
    message:
      'A placa do veículo deve ser no formato antigo (AAA0000) ou Mercosul (AAA0A00).',
  }) // Regex para placas antigas (AAA0000) ou Mercosul (AAA0A00)
  plate: string;

  @IsOptional()
  @IsNumber(
    { allowNaN: false, allowInfinity: false, maxDecimalPlaces: 3 },
    { message: 'A cubagem deve ser um número válido.' },
  ) // Permite até 3 casas decimais (ex: metros cúbicos)
  @IsPositive({ message: 'A cubagem deve ser um número positivo.' })
  @Min(0, { message: 'A cubagem não pode ser negativa.' }) // Permite 0 se for o caso
  @Max(9999999.999, {
    message:
      'A cubagem não pode ter mais de 7 dígitos inteiros (ex: 9.999.999,999).',
  }) // Limite razoável para cubagem
  cubagem?: number;

  @IsOptional()
  @IsNumber(
    { allowNaN: false, allowInfinity: false, maxDecimalPlaces: 3 },
    { message: 'O peso máximo deve ser um número válido.' },
  ) // Permite até 3 casas decimais (ex: kg)
  @IsPositive({ message: 'O peso máximo deve ser um número positivo.' })
  @Min(0, { message: 'O peso máximo não pode ser negativo.' }) // Permite 0 se for o caso
  @Max(9999999.999, {
    message:
      'O peso máximo não pode ter mais de 7 dígitos inteiros (ex: 9.999.999,999).',
  }) // Limite razoável para peso máximo
  pesoMaximo?: number;

  @IsUUID('4', {
    message: 'O ID do motorista deve ser um UUID válido (versão 4).',
  })
  @IsNotEmpty({ message: 'O ID do motorista é obrigatório.' })
  driverId: string;

  @IsUUID('4', {
    message: 'O ID da categoria deve ser um UUID válido (versão 4).',
  })
  @IsNotEmpty({ message: 'O ID da categoria é obrigatório.' })
  categoryId: string;
}

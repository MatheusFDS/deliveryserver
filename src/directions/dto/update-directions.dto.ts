import { PartialType } from '@nestjs/mapped-types';
import { CreateDirectionsDto } from './create-directions.dto';

export class UpdateDirectionsDto extends PartialType(CreateDirectionsDto) {}

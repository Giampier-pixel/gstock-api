import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { MovementType } from '@prisma/client';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class QueryMovementsDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() productId?: string;
  @ApiPropertyOptional({ enum: MovementType }) @IsOptional() @IsEnum(MovementType) type?: MovementType;
  @ApiPropertyOptional({ format: 'date-time' }) @IsOptional() @IsDateString() from?: string;
  @ApiPropertyOptional({ format: 'date-time' }) @IsOptional() @IsDateString() to?: string;
}

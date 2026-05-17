import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MovementType } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateMovementDto {
  @ApiProperty() @IsString() productId!: string;
  @ApiProperty({ enum: MovementType }) @IsEnum(MovementType) type!: MovementType;

  @ApiProperty({ minimum: 1 })
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductStatus } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateProductDto {
  @ApiProperty() @IsString() @Length(1, 64) sku!: string;
  @ApiProperty() @IsString() @Length(1, 200) name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty() @IsString() @Length(1, 80) category!: string;

  @ApiProperty()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  price!: number;

  @ApiProperty()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  cost!: number;

  @ApiProperty({ default: 0 })
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? 0 : Number(value)))
  @IsInt()
  @Min(0)
  stock: number = 0;

  @ApiProperty({ default: 0 })
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? 0 : Number(value)))
  @IsInt()
  @Min(0)
  minStock: number = 0;

  @ApiPropertyOptional({ enum: ProductStatus, default: ProductStatus.ACTIVE })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @ApiPropertyOptional() @IsOptional() @IsUrl() imageUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() providerId?: string;
}

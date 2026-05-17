import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class QueryProvidersDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() q?: string;
}

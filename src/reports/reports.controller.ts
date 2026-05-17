import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { ReportsService } from './reports.service';

class RevenueQueryDto {
  @ApiPropertyOptional({ default: 14, minimum: 1, maximum: 90 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(90)
  days: number = 14;
}

@ApiTags('reports')
@ApiBearerAuth('access-token')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('revenue')
  @ApiOperation({ summary: 'Daily revenue (price × quantity of OUT movements).' })
  revenue(@Query() query: RevenueQueryDto) {
    return this.reports.revenueByDay(query.days);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Inventory breakdown by category.' })
  categories() {
    return this.reports.categories();
  }
}

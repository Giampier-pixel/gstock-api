import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MovementsService } from './movements.service';
import { CreateMovementDto } from './dto/create-movement.dto';
import { QueryMovementsDto } from './dto/query-movements.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-user';

@ApiTags('movements')
@ApiBearerAuth('access-token')
@Controller('movements')
export class MovementsController {
  constructor(private readonly movements: MovementsService) {}

  @Get()
  @ApiOperation({ summary: 'List movements with filtering + pagination.' })
  list(@Query() query: QueryMovementsDto) {
    return this.movements.list(query);
  }

  @Post()
  @ApiOperation({ summary: 'Record an IN/OUT movement; updates product stock atomically.' })
  create(@Body() dto: CreateMovementDto, @CurrentUser() user: AuthenticatedUser) {
    return this.movements.create(dto, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a movement and revert stock atomically.' })
  remove(@Param('id') id: string) {
    return this.movements.remove(id);
  }
}

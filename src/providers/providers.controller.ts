import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ProvidersService } from './providers.service';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { QueryProvidersDto } from './dto/query-providers.dto';

@ApiTags('providers')
@ApiBearerAuth('access-token')
@Controller('providers')
export class ProvidersController {
  constructor(private readonly providers: ProvidersService) {}

  @Get()
  list(@Query() query: QueryProvidersDto) {
    return this.providers.list(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.providers.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateProviderDto) {
    return this.providers.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProviderDto) {
    return this.providers.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.providers.remove(id);
  }
}

import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RecitalsService } from './recitals.service';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

@ApiTags('recitals')
@Controller('recitals')
export class RecitalsController {
  constructor(private readonly recitalsService: RecitalsService) {}

  @Get()
  findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    let parsedPage: number;
    if (page) {
      parsedPage = Number.parseInt(page, 10);
    } else {
      parsedPage = DEFAULT_PAGE;
    }
    let parsedLimit: number;
    if (limit) {
      parsedLimit = Number.parseInt(limit, 10);
    } else {
      parsedLimit = DEFAULT_LIMIT;
    }
    return this.recitalsService.findAll(parsedPage, parsedLimit);
  }

  @Get(':number')
  findByNumber(@Param('number', ParseIntPipe) number: number) {
    return this.recitalsService.findByNumber(number);
  }
}

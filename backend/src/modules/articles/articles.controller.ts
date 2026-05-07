import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ArticlesService } from './articles.service';

const DEFAULT_PAGE_SIZE = 20;

@ApiTags('articles')
@Controller('articles')
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Get()
  findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    let pageNum = 1;
    if (page) {
      pageNum = Number.parseInt(page, 10);
    }
    let limitNum = DEFAULT_PAGE_SIZE;
    if (limit) {
      limitNum = Number.parseInt(limit, 10);
    }
    return this.articlesService.findAll(pageNum, limitNum);
  }

  @Get(':number')
  findByNumber(@Param('number', ParseIntPipe) number: number) {
    return this.articlesService.findByNumber(number);
  }
}

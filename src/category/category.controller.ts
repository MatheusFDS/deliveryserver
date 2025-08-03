import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';

@Controller('category')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  async create(@Body() createCategoryDto: CreateCategoryDto, @Req() req) {
    const userId = req.user.userId;
    return this.categoryService.create(createCategoryDto, userId);
  }

  @Get()
  async findAll(
    @Req() req,
    @Query('search') search?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('pageSize', new DefaultValuePipe(10), ParseIntPipe)
    pageSize: number = 10,
  ) {
    const userId = req.user.userId;
    return this.categoryService.findAllByUserId(userId, search, page, pageSize);
  }

  @Get('all')
  async findAllTenantCategories(@Req() req) {
    const userId = req.user.userId;
    return this.categoryService.findAllByTenant(userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req) {
    const userId = req.user.userId;
    return this.categoryService.findOneByIdAndUserId(id, userId);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
    @Req() req,
  ) {
    const userId = req.user.userId;
    return this.categoryService.update(id, updateCategoryDto, userId);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req) {
    const userId = req.user.userId;
    return this.categoryService.remove(id, userId);
  }
}

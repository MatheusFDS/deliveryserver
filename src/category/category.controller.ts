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
  async findAll(@Req() req) {
    const userId = req.user.userId;
    return this.categoryService.findAllByUserId(userId);
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

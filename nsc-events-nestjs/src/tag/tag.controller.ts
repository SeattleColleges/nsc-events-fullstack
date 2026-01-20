import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { TagService } from './tag.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { Tag } from './entities/tag.entity';

@ApiTags('Tags')
@Controller('tags')
export class TagController {
  constructor(private readonly tagService: TagService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all tags',
    description: 'Retrieves all available tags',
  })
  @ApiResponse({
    status: 200,
    description: 'List of all tags',
    type: [Tag],
  })
  async findAll(): Promise<Tag[]> {
    return this.tagService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get tag by ID',
    description: 'Retrieves a specific tag by its ID',
  })
  @ApiParam({ name: 'id', description: 'Tag ID' })
  @ApiResponse({
    status: 200,
    description: 'The tag',
    type: Tag,
  })
  @ApiResponse({ status: 404, description: 'Tag not found' })
  async findById(@Param('id') id: string): Promise<Tag> {
    return this.tagService.findById(id);
  }

  @Get('slug/:slug')
  @ApiOperation({
    summary: 'Get tag by slug',
    description: 'Retrieves a specific tag by its slug',
  })
  @ApiParam({ name: 'slug', description: 'Tag slug' })
  @ApiResponse({
    status: 200,
    description: 'The tag',
    type: Tag,
  })
  @ApiResponse({ status: 404, description: 'Tag not found' })
  async findBySlug(@Param('slug') slug: string): Promise<Tag> {
    const tag = await this.tagService.findBySlug(slug);
    if (!tag) {
      throw new Error(`Tag with slug "${slug}" not found`);
    }
    return tag;
  }

  @Post()
  @UseGuards(AuthGuard())
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create a new tag',
    description: 'Creates a new tag (requires authentication)',
  })
  @ApiResponse({
    status: 201,
    description: 'Tag created successfully',
    type: Tag,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 409, description: 'Tag already exists' })
  async create(@Body() createTagDto: CreateTagDto): Promise<Tag> {
    return this.tagService.create(createTagDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard())
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Delete a tag',
    description: 'Deletes a tag by ID (requires authentication)',
  })
  @ApiParam({ name: 'id', description: 'Tag ID' })
  @ApiResponse({ status: 200, description: 'Tag deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Tag not found' })
  async delete(@Param('id') id: string): Promise<void> {
    return this.tagService.delete(id);
  }
}

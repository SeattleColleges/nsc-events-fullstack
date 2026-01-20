import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
  Query,
  ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiConsumes,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { MediaService } from './media.service';
import { Media, MediaType } from './entities/media.entity';
import { Role } from '../user/entities/user.entity';

@ApiTags('Media')
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all media',
    description: 'Retrieves all media files',
  })
  @ApiQuery({
    name: 'type',
    enum: MediaType,
    required: false,
    description: 'Filter by media type',
  })
  @ApiResponse({
    status: 200,
    description: 'List of all media',
    type: [Media],
  })
  async findAll(@Query('type') type?: MediaType): Promise<Media[]> {
    if (type) {
      return this.mediaService.findByType(type);
    }
    return this.mediaService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get media by ID',
    description: 'Retrieves a specific media file by its ID',
  })
  @ApiParam({ name: 'id', description: 'Media ID' })
  @ApiResponse({
    status: 200,
    description: 'The media file',
    type: Media,
  })
  @ApiResponse({ status: 404, description: 'Media not found' })
  async findById(@Param('id') id: string): Promise<Media> {
    return this.mediaService.findById(id);
  }

  @Post('upload')
  @UseGuards(AuthGuard())
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload a media file',
    description: 'Uploads an image or document file (requires authentication)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'The file to upload',
        },
        type: {
          type: 'string',
          enum: ['image', 'document'],
          description: 'Type of media',
          default: 'image',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'File uploaded successfully',
    type: Media,
  })
  @ApiResponse({ status: 400, description: 'Invalid file' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Query('type') type: MediaType = MediaType.IMAGE,
    @Req() req: any,
  ): Promise<Media> {
    const userId = req.user?.id;
    const folder = type === MediaType.IMAGE ? 'images' : 'documents';
    const resize = type === MediaType.IMAGE;

    return this.mediaService.uploadFile(file, userId, type, folder, resize);
  }

  @Post('upload/image')
  @UseGuards(AuthGuard())
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload an image',
    description: 'Uploads an image file (requires authentication)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'The image to upload',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Image uploaded successfully',
    type: Media,
  })
  @ApiResponse({ status: 400, description: 'Invalid file' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ): Promise<Media> {
    const userId = req.user?.id;
    return this.mediaService.uploadFile(
      file,
      userId,
      MediaType.IMAGE,
      'images',
      true,
    );
  }

  @Post('upload/document')
  @UseGuards(AuthGuard())
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload a document',
    description: 'Uploads a document file (requires authentication)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'The document to upload',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Document uploaded successfully',
    type: Media,
  })
  @ApiResponse({ status: 400, description: 'Invalid file' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ): Promise<Media> {
    const userId = req.user?.id;
    return this.mediaService.uploadFile(
      file,
      userId,
      MediaType.DOCUMENT,
      'documents',
      false,
    );
  }

  @Delete(':id')
  @UseGuards(AuthGuard())
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Delete a media file',
    description: 'Deletes a media file by ID (requires authentication)',
  })
  @ApiParam({ name: 'id', description: 'Media ID' })
  @ApiResponse({ status: 200, description: 'Media deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Media not found' })
  async delete(@Param('id') id: string): Promise<void> {
    return this.mediaService.delete(id);
  }

  // ----------------- Admin Cleanup Endpoints ----------------- \\

  @Get('admin/orphaned')
  @UseGuards(AuthGuard())
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Find orphaned media',
    description:
      'Finds media files not referenced by any activity (admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of orphaned media',
    type: [Media],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin only' })
  async findOrphaned(@Req() req: any): Promise<Media[]> {
    if (req.user?.role !== Role.admin) {
      throw new ForbiddenException('Only admins can access this endpoint');
    }
    return this.mediaService.findOrphanedMedia();
  }

  @Post('admin/cleanup')
  @UseGuards(AuthGuard())
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Clean up orphaned media',
    description:
      'Deletes all orphaned media files from S3 and database (admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Cleanup results',
    schema: {
      type: 'object',
      properties: {
        deleted: { type: 'number', description: 'Number of deleted files' },
        failed: {
          type: 'array',
          items: { type: 'string' },
          description: 'IDs of files that failed to delete',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin only' })
  async cleanupOrphaned(
    @Req() req: any,
  ): Promise<{ deleted: number; failed: string[] }> {
    if (req.user?.role !== Role.admin) {
      throw new ForbiddenException('Only admins can access this endpoint');
    }
    return this.mediaService.cleanupOrphanedMedia();
  }
}

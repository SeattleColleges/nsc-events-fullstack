import {
  Injectable,
  NotFoundException,
  ConflictException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Tag } from './entities/tag.entity';
import { CreateTagDto } from './dto/create-tag.dto';

@Injectable()
export class TagService {
  constructor(
    @InjectRepository(Tag)
    private readonly tagRepository: Repository<Tag>,
  ) {}

  /**
   * Generate a URL-safe slug from a tag name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-'); // Replace multiple hyphens with single
  }

  /**
   * Find all tags
   */
  async findAll(): Promise<Tag[]> {
    try {
      return await this.tagRepository.find({
        order: { name: 'ASC' },
      });
    } catch (error) {
      throw new HttpException(
        'Error retrieving tags',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Find a tag by ID
   */
  async findById(id: string): Promise<Tag> {
    try {
      const tag = await this.tagRepository.findOne({ where: { id } });
      if (!tag) {
        throw new NotFoundException(`Tag with ID ${id} not found`);
      }
      return tag;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new HttpException(
        'Error retrieving tag',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Find a tag by name (case-insensitive)
   */
  async findByName(name: string): Promise<Tag | null> {
    try {
      return await this.tagRepository
        .createQueryBuilder('tag')
        .where('LOWER(tag.name) = LOWER(:name)', { name })
        .getOne();
    } catch (error) {
      throw new HttpException(
        'Error retrieving tag',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Find a tag by slug
   */
  async findBySlug(slug: string): Promise<Tag | null> {
    try {
      return await this.tagRepository.findOne({ where: { slug } });
    } catch (error) {
      throw new HttpException(
        'Error retrieving tag',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Create a new tag
   */
  async create(createTagDto: CreateTagDto): Promise<Tag> {
    try {
      const existingTag = await this.findByName(createTagDto.name);
      if (existingTag) {
        throw new ConflictException(
          `Tag with name "${createTagDto.name}" already exists`,
        );
      }

      const slug = this.generateSlug(createTagDto.name);
      const tag = this.tagRepository.create({
        name: createTagDto.name.trim(),
        slug,
      });

      return await this.tagRepository.save(tag);
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new HttpException(
        'Error creating tag',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Find or create a tag by name
   * Returns existing tag if found, otherwise creates a new one
   */
  async findOrCreate(name: string): Promise<Tag> {
    try {
      const existingTag = await this.findByName(name);
      if (existingTag) {
        return existingTag;
      }

      const slug = this.generateSlug(name);
      const tag = this.tagRepository.create({
        name: name.trim(),
        slug,
      });

      return await this.tagRepository.save(tag);
    } catch (error) {
      throw new HttpException(
        'Error finding or creating tag',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Find or create multiple tags by names
   * Returns array of tags (existing or newly created)
   */
  async findOrCreateMany(names: string[]): Promise<Tag[]> {
    try {
      const uniqueNames = [...new Set(names.map((n) => n.trim()))].filter(
        (n) => n.length > 0,
      );
      const tags: Tag[] = [];

      for (const name of uniqueNames) {
        const tag = await this.findOrCreate(name);
        tags.push(tag);
      }

      return tags;
    } catch (error) {
      throw new HttpException(
        'Error finding or creating tags',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Find tags by IDs
   */
  async findByIds(ids: string[]): Promise<Tag[]> {
    try {
      return await this.tagRepository.find({
        where: { id: In(ids) },
      });
    } catch (error) {
      throw new HttpException(
        'Error retrieving tags',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Delete a tag by ID
   */
  async delete(id: string): Promise<void> {
    try {
      const tag = await this.findById(id);
      await this.tagRepository.remove(tag);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new HttpException(
        'Error deleting tag',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

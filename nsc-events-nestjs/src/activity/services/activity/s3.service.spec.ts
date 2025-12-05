import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { S3Service } from './s3.service';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';
import * as sharp from 'sharp';

// Create S3 client mock
const s3Mock = mockClient(S3Client);

// Mock sharp
jest.mock('sharp');

describe('S3Service', () => {
  let service: S3Service;
  let configService: jest.Mocked<ConfigService>;
  let module: TestingModule;

  const mockConfigValues = {
    AWS_S3_BUCKET_NAME: 'test-bucket',
    AWS_REGION: 'us-west-2',
    AWS_ACCESS_KEY_ID: 'test-access-key',
    AWS_SECRET_ACCESS_KEY: 'test-secret-key',
  };

  // Suppress console.error during tests for cleaner output
  beforeAll(() => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  beforeEach(async () => {
    // Reset all mocks before each test
    s3Mock.reset();
    jest.clearAllMocks();

    const mockConfigService = {
      get: jest.fn((key: string) => mockConfigValues[key]),
    };

    module = await Test.createTestingModule({
      providers: [
        S3Service,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<S3Service>(S3Service);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    jest.restoreAllMocks();
    if (module) {
      await module.close();
    }
  });

  describe('constructor', () => {
    it('should initialize with correct configuration', () => {
      expect(configService.get).toHaveBeenCalledWith('AWS_S3_BUCKET_NAME');
      expect(configService.get).toHaveBeenCalledWith('AWS_REGION');
      expect(configService.get).toHaveBeenCalledWith('AWS_ACCESS_KEY_ID');
      expect(configService.get).toHaveBeenCalledWith('AWS_SECRET_ACCESS_KEY');
      expect(service).toBeDefined();
    });
  });

  describe('uploadFile', () => {
    const mockFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'test-image.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      size: 1024 * 1024, // 1MB
      buffer: Buffer.from('test-image-data'),
      stream: null,
      destination: '',
      filename: '',
      path: '',
    };

    it('should upload file successfully without resize', async () => {
      s3Mock.on(PutObjectCommand).resolves({});

      const result = await service.uploadFile(mockFile, 'test-folder', false);

      expect(result).toContain(
        'https://test-bucket.s3.us-west-2.amazonaws.com/test-folder/',
      );
      expect(result).toContain('test-image.jpg');
      expect(s3Mock.calls()).toHaveLength(1);

      const call = s3Mock.call(0);
      expect(call.args[0].input).toMatchObject({
        Bucket: 'test-bucket',
        Body: mockFile.buffer,
        ContentType: 'image/jpeg',
      });
    });

    it('should upload file successfully with resize', async () => {
      const resizedBuffer = Buffer.from('resized-image-data');
      const mockSharp = {
        resize: jest.fn().mockReturnThis(),
        jpeg: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(resizedBuffer),
      };

      (sharp as any).mockReturnValue(mockSharp);
      s3Mock.on(PutObjectCommand).resolves({});

      const result = await service.uploadFile(mockFile, 'test-folder', true);

      expect(sharp).toHaveBeenCalledWith(mockFile.buffer);
      expect(mockSharp.resize).toHaveBeenCalledWith(1920, 1080, {
        fit: 'inside',
        withoutEnlargement: true,
      });
      expect(mockSharp.jpeg).toHaveBeenCalledWith({ quality: 85 });
      expect(result).toContain(
        'https://test-bucket.s3.us-west-2.amazonaws.com/test-folder/',
      );

      const call = s3Mock.call(0);
      expect((call.args[0].input as any).Body).toEqual(resizedBuffer);
    });

    it('should generate correct URL for us-east-1 region', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'AWS_REGION') return 'us-east-1';
        return mockConfigValues[key];
      });

      s3Mock.on(PutObjectCommand).resolves({});

      const result = await service.uploadFile(mockFile, 'test-folder', false);

      expect(result).toContain(
        'https://test-bucket.s3.amazonaws.com/test-folder/',
      );
      expect(result).not.toContain('us-east-1');
    });

    it('should generate correct URL for non-us-east-1 regions', async () => {
      s3Mock.on(PutObjectCommand).resolves({});

      const result = await service.uploadFile(mockFile, 'test-folder', false);

      expect(result).toContain(
        'https://test-bucket.s3.us-west-2.amazonaws.com/test-folder/',
      );
    });

    it('should throw BadRequestException when file size exceeds 5MB', async () => {
      const largeFile: Express.Multer.File = {
        ...mockFile,
        size: 6 * 1024 * 1024, // 6MB
      };

      await expect(
        service.uploadFile(largeFile, 'test-folder', false),
      ).rejects.toThrow(
        new BadRequestException('File size exceeds the maximum limit of 5 MB.'),
      );

      expect(s3Mock.calls()).toHaveLength(0);
    });

    it('should throw BadRequestException for invalid file type', async () => {
      const invalidFile: Express.Multer.File = {
        ...mockFile,
        mimetype: 'text/plain',
        originalname: 'test.txt',
      };

      await expect(
        service.uploadFile(invalidFile, 'test-folder', false),
      ).rejects.toThrow(
        new BadRequestException(
          'Invalid file type. Allowed types are: png, jpg, jpeg, gif, webp.',
        ),
      );

      expect(s3Mock.calls()).toHaveLength(0);
    });

    it('should accept image/png mimetype', async () => {
      const pngFile: Express.Multer.File = {
        ...mockFile,
        mimetype: 'image/png',
        originalname: 'test.png',
      };

      s3Mock.on(PutObjectCommand).resolves({});

      const result = await service.uploadFile(pngFile, 'test-folder', false);

      expect(result).toBeDefined();
      expect(s3Mock.calls()).toHaveLength(1);
    });

    it('should accept image/gif mimetype', async () => {
      const gifFile: Express.Multer.File = {
        ...mockFile,
        mimetype: 'image/gif',
        originalname: 'test.gif',
      };

      s3Mock.on(PutObjectCommand).resolves({});

      const result = await service.uploadFile(gifFile, 'test-folder', false);

      expect(result).toBeDefined();
      expect(s3Mock.calls()).toHaveLength(1);
    });

    it('should accept image/webp mimetype', async () => {
      const webpFile: Express.Multer.File = {
        ...mockFile,
        mimetype: 'image/webp',
        originalname: 'test.webp',
      };

      s3Mock.on(PutObjectCommand).resolves({});

      const result = await service.uploadFile(webpFile, 'test-folder', false);

      expect(result).toBeDefined();
      expect(s3Mock.calls()).toHaveLength(1);
    });

    it('should accept image/jpg mimetype', async () => {
      const jpgFile: Express.Multer.File = {
        ...mockFile,
        mimetype: 'image/jpg',
        originalname: 'test.jpg',
      };

      s3Mock.on(PutObjectCommand).resolves({});

      const result = await service.uploadFile(jpgFile, 'test-folder', false);

      expect(result).toBeDefined();
      expect(s3Mock.calls()).toHaveLength(1);
    });

    it('should handle file with "name" property instead of "originalname"', async () => {
      const fileWithName: any = {
        ...mockFile,
        name: 'custom-name.jpg',
      };

      s3Mock.on(PutObjectCommand).resolves({});

      const result = await service.uploadFile(
        fileWithName,
        'test-folder',
        false,
      );

      expect(result).toContain('custom-name.jpg');
    });

    it('should throw Error when S3 upload fails', async () => {
      s3Mock.on(PutObjectCommand).rejects(new Error('S3 service unavailable'));

      await expect(
        service.uploadFile(mockFile, 'test-folder', false),
      ).rejects.toThrow('Failed to upload file to S3: S3 service unavailable');
    });

    it('should throw Error when image resize fails', async () => {
      const mockSharp = {
        resize: jest.fn().mockReturnThis(),
        jpeg: jest.fn().mockReturnThis(),
        toBuffer: jest
          .fn()
          .mockRejectedValue(new Error('Invalid image format')),
      };

      (sharp as any).mockReturnValue(mockSharp);

      await expect(
        service.uploadFile(mockFile, 'test-folder', true),
      ).rejects.toThrow('Failed to resize image: Invalid image format');
    });

    it('should create unique filenames using timestamp', async () => {
      s3Mock.on(PutObjectCommand).resolves({});

      const dateSpy = jest.spyOn(Date, 'now').mockReturnValue(1234567890);

      const result = await service.uploadFile(mockFile, 'test-folder', false);

      expect(result).toContain('1234567890-test-image.jpg');

      dateSpy.mockRestore();
    });
  });

  describe('getFile', () => {
    const mockFileKey = 'test-folder/test-image.jpg';

    it('should retrieve file successfully', async () => {
      const mockContent = Buffer.from('file-content');
      const mockBody = {
        transformToByteArray: jest
          .fn()
          .mockResolvedValue(new Uint8Array(mockContent)),
      };

      s3Mock.on(GetObjectCommand).resolves({
        Body: mockBody as any,
        ContentType: 'image/jpeg',
      });

      const result = await service.getFile(mockFileKey);

      expect(result).toEqual({
        content: mockContent,
        filename: 'test-image.jpg',
        contentType: 'image/jpeg',
      });

      expect(s3Mock.calls()).toHaveLength(1);
      const call = s3Mock.call(0);
      expect(call.args[0].input).toMatchObject({
        Bucket: 'test-bucket',
        Key: mockFileKey,
      });
    });

    it('should extract filename from fileKey', async () => {
      const mockContent = Buffer.from('file-content');
      const mockBody = {
        transformToByteArray: jest
          .fn()
          .mockResolvedValue(new Uint8Array(mockContent)),
      };

      s3Mock.on(GetObjectCommand).resolves({
        Body: mockBody as any,
        ContentType: 'image/png',
      });

      const result = await service.getFile('folder/subfolder/image.png');

      expect(result.filename).toBe('image.png');
    });

    it('should use fileKey as filename if no path separator exists', async () => {
      const mockContent = Buffer.from('file-content');
      const mockBody = {
        transformToByteArray: jest
          .fn()
          .mockResolvedValue(new Uint8Array(mockContent)),
      };

      s3Mock.on(GetObjectCommand).resolves({
        Body: mockBody as any,
        ContentType: 'image/jpeg',
      });

      const result = await service.getFile('image.jpg');

      expect(result.filename).toBe('image.jpg');
    });

    it('should use fileKey as filename when path ends with slash', async () => {
      const mockContent = Buffer.from('file-content');
      const mockBody = {
        transformToByteArray: jest
          .fn()
          .mockResolvedValue(new Uint8Array(mockContent)),
      };

      s3Mock.on(GetObjectCommand).resolves({
        Body: mockBody as any,
        ContentType: 'image/jpeg',
      });

      const result = await service.getFile('folder/');

      expect(result.filename).toBe('folder/');
    });

    it('should infer content type from extension when ContentType is missing', async () => {
      const mockContent = Buffer.from('file-content');
      const mockBody = {
        transformToByteArray: jest
          .fn()
          .mockResolvedValue(new Uint8Array(mockContent)),
      };

      s3Mock.on(GetObjectCommand).resolves({
        Body: mockBody as any,
        ContentType: undefined,
      });

      const result = await service.getFile('test-folder/document.pdf');

      expect(result.contentType).toBe('application/pdf');
    });

    it('should return application/octet-stream for unknown extensions', async () => {
      const mockContent = Buffer.from('file-content');
      const mockBody = {
        transformToByteArray: jest
          .fn()
          .mockResolvedValue(new Uint8Array(mockContent)),
      };

      s3Mock.on(GetObjectCommand).resolves({
        Body: mockBody as any,
        ContentType: undefined,
      });

      const result = await service.getFile('test-folder/file.xyz');

      expect(result.contentType).toBe('application/octet-stream');
    });

    it('should handle png extension correctly', async () => {
      const mockContent = Buffer.from('file-content');
      const mockBody = {
        transformToByteArray: jest
          .fn()
          .mockResolvedValue(new Uint8Array(mockContent)),
      };

      s3Mock.on(GetObjectCommand).resolves({
        Body: mockBody as any,
        ContentType: undefined,
      });

      const result = await service.getFile('test.png');

      expect(result.contentType).toBe('image/png');
    });

    it('should handle jpeg extension correctly', async () => {
      const mockContent = Buffer.from('file-content');
      const mockBody = {
        transformToByteArray: jest
          .fn()
          .mockResolvedValue(new Uint8Array(mockContent)),
      };

      s3Mock.on(GetObjectCommand).resolves({
        Body: mockBody as any,
        ContentType: undefined,
      });

      const result = await service.getFile('test.jpeg');

      expect(result.contentType).toBe('image/jpeg');
    });

    it('should handle gif extension correctly', async () => {
      const mockContent = Buffer.from('file-content');
      const mockBody = {
        transformToByteArray: jest
          .fn()
          .mockResolvedValue(new Uint8Array(mockContent)),
      };

      s3Mock.on(GetObjectCommand).resolves({
        Body: mockBody as any,
        ContentType: undefined,
      });

      const result = await service.getFile('test.gif');

      expect(result.contentType).toBe('image/gif');
    });

    it('should handle webp extension correctly', async () => {
      const mockContent = Buffer.from('file-content');
      const mockBody = {
        transformToByteArray: jest
          .fn()
          .mockResolvedValue(new Uint8Array(mockContent)),
      };

      s3Mock.on(GetObjectCommand).resolves({
        Body: mockBody as any,
        ContentType: undefined,
      });

      const result = await service.getFile('test.webp');

      expect(result.contentType).toBe('image/webp');
    });

    it('should handle case-insensitive extensions', async () => {
      const mockContent = Buffer.from('file-content');
      const mockBody = {
        transformToByteArray: jest
          .fn()
          .mockResolvedValue(new Uint8Array(mockContent)),
      };

      s3Mock.on(GetObjectCommand).resolves({
        Body: mockBody as any,
        ContentType: undefined,
      });

      const result = await service.getFile('test.PNG');

      expect(result.contentType).toBe('image/png');
    });

    it('should throw NotFoundException when Body is missing', async () => {
      s3Mock.on(GetObjectCommand).resolves({
        Body: undefined,
      });

      await expect(service.getFile(mockFileKey)).rejects.toThrow(
        new NotFoundException(`File not found: ${mockFileKey}`),
      );
    });

    it('should throw NotFoundException when file does not exist (404)', async () => {
      const error: any = new Error('NoSuchKey');
      error.$metadata = { httpStatusCode: 404 };

      s3Mock.on(GetObjectCommand).rejects(error);

      await expect(service.getFile(mockFileKey)).rejects.toThrow(
        new NotFoundException(`File not found: ${mockFileKey}`),
      );
    });

    it('should rethrow other errors without modification', async () => {
      const error: any = new Error('S3 service error');
      error.$metadata = { httpStatusCode: 500 };

      s3Mock.on(GetObjectCommand).rejects(error);

      await expect(service.getFile(mockFileKey)).rejects.toThrow(
        'S3 service error',
      );
    });
  });

  describe('deleteFile', () => {
    const mockFileKey = 'test-folder/test-image.jpg';

    it('should delete file successfully', async () => {
      s3Mock.on(DeleteObjectCommand).resolves({});

      await service.deleteFile(mockFileKey);

      expect(s3Mock.calls()).toHaveLength(1);
      const call = s3Mock.call(0);
      expect(call.args[0].input).toMatchObject({
        Bucket: 'test-bucket',
        Key: mockFileKey,
      });
    });

    it('should not throw error when file does not exist (404)', async () => {
      const error: any = new Error('NoSuchKey');
      error.$metadata = { httpStatusCode: 404 };

      s3Mock.on(DeleteObjectCommand).rejects(error);

      await expect(service.deleteFile(mockFileKey)).resolves.not.toThrow();
    });

    it('should throw Error for non-404 errors', async () => {
      const error: any = new Error('S3 service unavailable');
      error.$metadata = { httpStatusCode: 500 };

      s3Mock.on(DeleteObjectCommand).rejects(error);

      await expect(service.deleteFile(mockFileKey)).rejects.toThrow(
        'Failed to delete file: S3 service unavailable',
      );
    });

    it('should handle errors without $metadata', async () => {
      const error = new Error('Network error');

      s3Mock.on(DeleteObjectCommand).rejects(error);

      await expect(service.deleteFile(mockFileKey)).rejects.toThrow(
        'Failed to delete file: Network error',
      );
    });
  });

  describe('resizeImage (private method - tested through uploadFile)', () => {
    const mockFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'test-image.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      size: 1024,
      buffer: Buffer.from('test-image-data'),
      stream: null,
      destination: '',
      filename: '',
      path: '',
    };

    it('should resize image with default dimensions', async () => {
      const resizedBuffer = Buffer.from('resized-image');
      const mockSharp = {
        resize: jest.fn().mockReturnThis(),
        jpeg: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(resizedBuffer),
      };

      (sharp as any).mockReturnValue(mockSharp);
      s3Mock.on(PutObjectCommand).resolves({});

      await service.uploadFile(mockFile, 'test-folder', true);

      expect(mockSharp.resize).toHaveBeenCalledWith(1920, 1080, {
        fit: 'inside',
        withoutEnlargement: true,
      });
      expect(mockSharp.jpeg).toHaveBeenCalledWith({ quality: 85 });
    });

    it('should apply jpeg quality of 85', async () => {
      const mockSharp = {
        resize: jest.fn().mockReturnThis(),
        jpeg: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(Buffer.from('resized')),
      };

      (sharp as any).mockReturnValue(mockSharp);
      s3Mock.on(PutObjectCommand).resolves({});

      await service.uploadFile(mockFile, 'test-folder', true);

      expect(mockSharp.jpeg).toHaveBeenCalledWith({ quality: 85 });
    });

    it('should use fit inside without enlargement', async () => {
      const mockSharp = {
        resize: jest.fn().mockReturnThis(),
        jpeg: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(Buffer.from('resized')),
      };

      (sharp as any).mockReturnValue(mockSharp);
      s3Mock.on(PutObjectCommand).resolves({});

      await service.uploadFile(mockFile, 'test-folder', true);

      expect(mockSharp.resize).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number),
        {
          fit: 'inside',
          withoutEnlargement: true,
        },
      );
    });
  });

  describe('getContentTypeByExtension (private method - tested through getFile)', () => {
    it('should return correct content type for pdf', async () => {
      const mockBody = {
        transformToByteArray: jest.fn().mockResolvedValue(new Uint8Array()),
      };

      s3Mock.on(GetObjectCommand).resolves({
        Body: mockBody as any,
        ContentType: undefined,
      });

      const result = await service.getFile('document.pdf');
      expect(result.contentType).toBe('application/pdf');
    });

    it('should return correct content type for jpg', async () => {
      const mockBody = {
        transformToByteArray: jest.fn().mockResolvedValue(new Uint8Array()),
      };

      s3Mock.on(GetObjectCommand).resolves({
        Body: mockBody as any,
        ContentType: undefined,
      });

      const result = await service.getFile('image.jpg');
      expect(result.contentType).toBe('image/jpg');
    });

    it('should handle files without extensions', async () => {
      const mockBody = {
        transformToByteArray: jest.fn().mockResolvedValue(new Uint8Array()),
      };

      s3Mock.on(GetObjectCommand).resolves({
        Body: mockBody as any,
        ContentType: undefined,
      });

      const result = await service.getFile('filewithoutext');
      expect(result.contentType).toBe('application/octet-stream');
    });
  });

  describe('edge cases', () => {
    it('should handle empty folder name', async () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'test.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 1024,
        buffer: Buffer.from('test'),
        stream: null,
        destination: '',
        filename: '',
        path: '',
      };

      s3Mock.on(PutObjectCommand).resolves({});

      const result = await service.uploadFile(mockFile, '', false);

      expect(result).toContain('//');
      expect(result).toContain('test.jpg');
    });

    it('should handle file size exactly at 5MB limit', async () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'test.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 5 * 1024 * 1024, // Exactly 5MB
        buffer: Buffer.from('test'),
        stream: null,
        destination: '',
        filename: '',
        path: '',
      };

      s3Mock.on(PutObjectCommand).resolves({});

      const result = await service.uploadFile(mockFile, 'test-folder', false);

      expect(result).toBeDefined();
      expect(s3Mock.calls()).toHaveLength(1);
    });

    it('should handle file size just over 5MB limit', async () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'test.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 5 * 1024 * 1024 + 1, // 5MB + 1 byte
        buffer: Buffer.from('test'),
        stream: null,
        destination: '',
        filename: '',
        path: '',
      };

      await expect(
        service.uploadFile(mockFile, 'test-folder', false),
      ).rejects.toThrow(BadRequestException);
    });
  });
});

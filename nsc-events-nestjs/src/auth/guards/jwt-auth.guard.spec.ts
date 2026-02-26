import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;
  let module: TestingModule;

  // Mock ExecutionContext factory
  const createMockExecutionContext = (): ExecutionContext => {
    const mockHandler = jest.fn();
    const mockClass = jest.fn();

    return {
      getHandler: () => mockHandler,
      getClass: () => mockClass,
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          headers: {
            authorization: 'Bearer mock-jwt-token',
          },
        }),
        getResponse: jest.fn(),
        getNext: jest.fn(),
      }),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
      getType: jest.fn(),
    } as unknown as ExecutionContext;
  };

  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('constructor', () => {
    it('should inject Reflector dependency', () => {
      expect(reflector).toBeDefined();
    });

    it('should extend AuthGuard with jwt strategy', () => {
      expect(guard).toBeInstanceOf(JwtAuthGuard);
    });
  });

  describe('canActivate', () => {
    describe('public routes', () => {
      it('should return true for routes marked with @Public() decorator', () => {
        const mockContext = createMockExecutionContext();

        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
        expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
          mockContext.getHandler(),
          mockContext.getClass(),
        ]);
      });

      it('should check both handler and class for @Public() decorator', () => {
        const mockContext = createMockExecutionContext();

        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

        guard.canActivate(mockContext);

        expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
          IS_PUBLIC_KEY,
          expect.arrayContaining([
            mockContext.getHandler(),
            mockContext.getClass(),
          ]),
        );
      });

      it('should bypass JWT validation when route is public', () => {
        const mockContext = createMockExecutionContext();

        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
      });
    });

    describe('protected routes', () => {
      it('should call parent canActivate for non-public routes', () => {
        const mockContext = createMockExecutionContext();

        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

        const superCanActivateSpy = jest
          .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate')
          .mockReturnValue(true);

        const result = guard.canActivate(mockContext);

        expect(superCanActivateSpy).toHaveBeenCalledWith(mockContext);
        expect(result).toBe(true);

        superCanActivateSpy.mockRestore();
      });

      it('should call parent canActivate when @Public() decorator is not present', () => {
        const mockContext = createMockExecutionContext();

        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

        const superCanActivateSpy = jest
          .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate')
          .mockReturnValue(true);

        const result = guard.canActivate(mockContext);

        expect(superCanActivateSpy).toHaveBeenCalledWith(mockContext);
        expect(result).toBe(true);

        superCanActivateSpy.mockRestore();
      });

      it('should call parent canActivate when isPublic is null', () => {
        const mockContext = createMockExecutionContext();

        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null);

        const superCanActivateSpy = jest
          .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate')
          .mockReturnValue(true);

        const result = guard.canActivate(mockContext);

        expect(superCanActivateSpy).toHaveBeenCalledWith(mockContext);
        expect(result).toBe(true);

        superCanActivateSpy.mockRestore();
      });

      it('should delegate to JWT strategy for authentication on protected routes', () => {
        const mockContext = createMockExecutionContext();

        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

        const superCanActivateSpy = jest
          .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate')
          .mockReturnValue(Promise.resolve(true));

        const result = guard.canActivate(mockContext);

        expect(superCanActivateSpy).toHaveBeenCalled();
        expect(result).toBeInstanceOf(Promise);

        superCanActivateSpy.mockRestore();
      });

      it('should return false when parent canActivate returns false', () => {
        const mockContext = createMockExecutionContext();

        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

        const superCanActivateSpy = jest
          .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate')
          .mockReturnValue(false);

        const result = guard.canActivate(mockContext);

        expect(result).toBe(false);

        superCanActivateSpy.mockRestore();
      });

      it('should handle async parent canActivate rejection', async () => {
        const mockContext = createMockExecutionContext();

        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

        const superCanActivateSpy = jest
          .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate')
          .mockReturnValue(Promise.reject(new Error('Unauthorized')));

        await expect(guard.canActivate(mockContext)).rejects.toThrow(
          'Unauthorized',
        );

        superCanActivateSpy.mockRestore();
      });
    });

    describe('edge cases', () => {
      it('should handle @Public() set to false explicitly', () => {
        const mockContext = createMockExecutionContext();

        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

        const superCanActivateSpy = jest
          .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate')
          .mockReturnValue(true);

        const result = guard.canActivate(mockContext);

        expect(superCanActivateSpy).toHaveBeenCalledWith(mockContext);
        expect(result).toBe(true);

        superCanActivateSpy.mockRestore();
      });

      it('should use getAllAndOverride to check both method and class level decorators', () => {
        const mockContext = createMockExecutionContext();
        const getAllAndOverrideSpy = jest.spyOn(reflector, 'getAllAndOverride');
        getAllAndOverrideSpy.mockReturnValue(true);

        guard.canActivate(mockContext);

        expect(getAllAndOverrideSpy).toHaveBeenCalledTimes(1);
        expect(getAllAndOverrideSpy).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
          mockContext.getHandler(),
          mockContext.getClass(),
        ]);
      });

      it('should prioritize method-level @Public() over class-level', () => {
        const mockContext = createMockExecutionContext();

        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
        expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
          IS_PUBLIC_KEY,
          expect.arrayContaining([mockContext.getHandler()]),
        );
      });
    });

    describe('IS_PUBLIC_KEY metadata', () => {
      it('should use correct IS_PUBLIC_KEY constant for metadata lookup', () => {
        const mockContext = createMockExecutionContext();

        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

        guard.canActivate(mockContext);

        expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
          'isPublic',
          expect.any(Array),
        );
      });
    });
  });
});

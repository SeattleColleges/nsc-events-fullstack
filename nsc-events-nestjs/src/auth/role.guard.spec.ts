import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleGuard } from './role.guard';

describe('RoleGuard', () => {
  let guard: RoleGuard;
  let reflector: Reflector;
  let module: TestingModule;

  // Mock ExecutionContext factory
  const createMockExecutionContext = (user: { role: string } | null = null): ExecutionContext => {
    const mockHandler = jest.fn();

    return {
      getHandler: () => mockHandler,
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          user: user,
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
        RoleGuard,
        {
          provide: Reflector,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<RoleGuard>(RoleGuard);
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
  });

  describe('matchRoles', () => {
    it('should return true when user role matches one of the allowed roles', () => {
      const roles = ['admin', 'creator', 'user'];
      const userRole = 'admin';

      const result = guard.matchRoles(roles, userRole);

      expect(result).toBe(true);
    });

    it('should return true when user role is the only allowed role', () => {
      const roles = ['admin'];
      const userRole = 'admin';

      const result = guard.matchRoles(roles, userRole);

      expect(result).toBe(true);
    });

    it('should return false when user role does not match any allowed roles', () => {
      const roles = ['admin', 'creator'];
      const userRole = 'user';

      const result = guard.matchRoles(roles, userRole);

      expect(result).toBe(false);
    });

    it('should return false when roles array is empty', () => {
      const roles: string[] = [];
      const userRole = 'admin';

      const result = guard.matchRoles(roles, userRole);

      expect(result).toBe(false);
    });

    it('should handle case-sensitive role matching', () => {
      const roles = ['Admin', 'Creator'];
      const userRole = 'admin';

      const result = guard.matchRoles(roles, userRole);

      expect(result).toBe(false);
    });

    it('should return true for exact match in multiple roles', () => {
      const roles = ['admin', 'creator', 'user'];
      const userRole = 'creator';

      const result = guard.matchRoles(roles, userRole);

      expect(result).toBe(true);
    });
  });

  describe('canActivate', () => {
    describe('routes without @Roles decorator', () => {
      it('should return true when no roles are defined on the route', () => {
        const mockContext = createMockExecutionContext({ role: 'user' });

        jest.spyOn(reflector, 'get').mockReturnValue(undefined);

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
        expect(reflector.get).toHaveBeenCalledWith('roles', mockContext.getHandler());
      });

      it('should return true when roles metadata is null', () => {
        const mockContext = createMockExecutionContext({ role: 'user' });

        jest.spyOn(reflector, 'get').mockReturnValue(null);

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
      });

      it('should allow any user to access unprotected routes', () => {
        const mockContext = createMockExecutionContext({ role: 'guest' });

        jest.spyOn(reflector, 'get').mockReturnValue(undefined);

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
      });
    });

    describe('routes with @Roles decorator', () => {
      it('should return true when user has admin role and admin is required', () => {
        const mockContext = createMockExecutionContext({ role: 'admin' });

        jest.spyOn(reflector, 'get').mockReturnValue(['admin']);

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
      });

      it('should return true when user has creator role and creator is allowed', () => {
        const mockContext = createMockExecutionContext({ role: 'creator' });

        jest.spyOn(reflector, 'get').mockReturnValue(['admin', 'creator']);

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
      });

      it('should return true when user has user role and user is allowed', () => {
        const mockContext = createMockExecutionContext({ role: 'user' });

        jest.spyOn(reflector, 'get').mockReturnValue(['user']);

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
      });

      it('should return false when user role is not in allowed roles', () => {
        const mockContext = createMockExecutionContext({ role: 'user' });

        jest.spyOn(reflector, 'get').mockReturnValue(['admin']);

        const result = guard.canActivate(mockContext);

        expect(result).toBe(false);
      });

      it('should return false when user role does not match any of multiple allowed roles', () => {
        const mockContext = createMockExecutionContext({ role: 'guest' });

        jest.spyOn(reflector, 'get').mockReturnValue(['admin', 'creator', 'user']);

        const result = guard.canActivate(mockContext);

        expect(result).toBe(false);
      });

      it('should correctly extract user from request context', () => {
        const mockContext = createMockExecutionContext({ role: 'admin' });

        jest.spyOn(reflector, 'get').mockReturnValue(['admin']);

        guard.canActivate(mockContext);

        expect(mockContext.switchToHttp).toHaveBeenCalled();
        expect(mockContext.switchToHttp().getRequest).toHaveBeenCalled();
      });
    });

    describe('edge cases', () => {
      it('should use reflector.get with correct metadata key', () => {
        const mockContext = createMockExecutionContext({ role: 'admin' });
        const getSpy = jest.spyOn(reflector, 'get').mockReturnValue(['admin']);

        guard.canActivate(mockContext);

        expect(getSpy).toHaveBeenCalledWith('roles', mockContext.getHandler());
      });

      it('should handle single role in array', () => {
        const mockContext = createMockExecutionContext({ role: 'admin' });

        jest.spyOn(reflector, 'get').mockReturnValue(['admin']);

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
      });

      it('should handle multiple roles in array', () => {
        const mockContext = createMockExecutionContext({ role: 'creator' });

        jest.spyOn(reflector, 'get').mockReturnValue(['admin', 'creator', 'user']);

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
      });
    });

    describe('role-based access control scenarios', () => {
      it('should deny user access to admin-only route', () => {
        const mockContext = createMockExecutionContext({ role: 'user' });

        jest.spyOn(reflector, 'get').mockReturnValue(['admin']);

        const result = guard.canActivate(mockContext);

        expect(result).toBe(false);
      });

      it('should deny creator access to admin-only route', () => {
        const mockContext = createMockExecutionContext({ role: 'creator' });

        jest.spyOn(reflector, 'get').mockReturnValue(['admin']);

        const result = guard.canActivate(mockContext);

        expect(result).toBe(false);
      });

      it('should allow admin access to admin-or-creator route', () => {
        const mockContext = createMockExecutionContext({ role: 'admin' });

        jest.spyOn(reflector, 'get').mockReturnValue(['admin', 'creator']);

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
      });

      it('should allow creator access to admin-or-creator route', () => {
        const mockContext = createMockExecutionContext({ role: 'creator' });

        jest.spyOn(reflector, 'get').mockReturnValue(['admin', 'creator']);

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
      });

      it('should deny user access to admin-or-creator route', () => {
        const mockContext = createMockExecutionContext({ role: 'user' });

        jest.spyOn(reflector, 'get').mockReturnValue(['admin', 'creator']);

        const result = guard.canActivate(mockContext);

        expect(result).toBe(false);
      });

      it('should allow any role access to route with all roles', () => {
        const mockContext = createMockExecutionContext({ role: 'user' });

        jest.spyOn(reflector, 'get').mockReturnValue(['admin', 'creator', 'user']);

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
      });
    });
  });
});

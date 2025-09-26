import { SetMetadata } from '@nestjs/common';

export const Roles = (...args: string[]) => {
  return SetMetadata('roles', args);
};

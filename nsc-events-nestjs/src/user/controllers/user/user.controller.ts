/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserService } from '../../services/user/user.service';
import { UserDocument } from '../../entities/user.entity';
import { UserSearchFilters } from '../../services/user/user.service';
import { AuthGuard } from '@nestjs/passport';
import { UpdateUserDto } from '../../dto/update-user.dto';
import { Roles } from '../../../auth/roles.decorator';
import { RoleGuard } from '../../../auth/role.guard';
import { Request } from 'express';
import { Role } from '../../entities/user.entity';

// ================== User admin routes ======================== \\
@UseGuards(AuthGuard('jwt'))
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // ----------------- Get Users ----------------------------- \\
  @Roles('admin')
  @UseGuards(RoleGuard)
  @Get('')
  async getAllUsers() {
    return await this.userService.getAllUsers();
  }

  // -------------------- Search Users ----------------------- \\
  @Roles('admin')
  @UseGuards(RoleGuard)
  @Get('search')
  async searchUsers(@Req() req: Request) {
    const filters: UserSearchFilters = req.query;
    // Validate the role
    if (filters.role && !Object.values(Role).includes(filters.role as Role)) {
      delete filters.role; // Remove invalid role filter
    }
    return this.userService.searchUsers(filters);
  }

  // ----------------- Get User ------------------------------ \\
  @Get('find/:id')
  async getUserById(@Param('id') id: string) {
    return await this.userService.getUserById(id);
  }

  // ----------------- Get User by Email --------------------- \\
  @Get('email/:email')
  async getUserByEmail(@Param('email') email: string) {
    return await this.userService.getUserByEmail(email);
  }

  // ----------------- Update User --------------------------- \\
  @Patch('update/:id')
  async updateUser(@Param('id') id: string, @Body() userDto: UpdateUserDto) {
    return await this.userService.updateUser(id, userDto);
  }

  // ----------------- Delete User --------------------------- //
  @Delete('remove/:id')
  async adminDeleteUser(@Param('id') id: string) {
    await this.userService.deleteUser(id);
  }

  // ================== End Admin routes ======================== \\
}

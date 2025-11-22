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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';

// ================== User admin routes ======================== \\
@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard('jwt'))
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // ----------------- Get Users ----------------------------- \\
  @Roles('admin')
  @UseGuards(RoleGuard)
  @Get('')
  @ApiOperation({
    summary: 'Get all users (Admin only)',
    description: 'Retrieves a list of all users in the system',
  })
  @ApiResponse({
    status: 200,
    description: 'List of all users',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async getAllUsers() {
    return await this.userService.getAllUsers();
  }

  // -------------------- Search Users ----------------------- \\
  @Roles('admin')
  @UseGuards(RoleGuard)
  @Get('search')
  @ApiOperation({
    summary: 'Search users (Admin only)',
    description: 'Search and filter users by various criteria',
  })
  @ApiQuery({
    name: 'firstName',
    required: false,
    description: 'Filter by first name',
  })
  @ApiQuery({
    name: 'lastName',
    required: false,
    description: 'Filter by last name',
  })
  @ApiQuery({ name: 'email', required: false, description: 'Filter by email' })
  @ApiQuery({
    name: 'role',
    required: false,
    enum: Role,
    description: 'Filter by role',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number for pagination',
  })
  @ApiResponse({
    status: 200,
    description: 'Filtered list of users',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
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
  @ApiOperation({
    summary: 'Get user by ID',
    description: 'Retrieves a specific user by their ID',
  })
  @ApiParam({ name: 'id', description: 'User ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'User details',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserById(@Param('id') id: string) {
    return await this.userService.getUserById(id);
  }

  // ----------------- Get User by Email --------------------- \\
  @Get('email/:email')
  @ApiOperation({
    summary: 'Get user by email',
    description: 'Retrieves a specific user by their email address',
  })
  @ApiParam({ name: 'email', description: 'User email address' })
  @ApiResponse({
    status: 200,
    description: 'User details',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserByEmail(@Param('email') email: string) {
    return await this.userService.getUserByEmail(email);
  }

  // ----------------- Update User --------------------------- \\
  @Patch('update/:id')
  @ApiOperation({
    summary: 'Update user',
    description: 'Updates user information',
  })
  @ApiParam({ name: 'id', description: 'User ID (UUID)' })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({
    status: 200,
    description: 'User successfully updated',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUser(@Param('id') id: string, @Body() userDto: UpdateUserDto) {
    return await this.userService.updateUser(id, userDto);
  }

  // ----------------- Delete User --------------------------- //
  @Delete('remove/:id')
  @ApiOperation({
    summary: 'Delete user',
    description: 'Deletes a user from the system',
  })
  @ApiParam({ name: 'id', description: 'User ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'User successfully deleted',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async adminDeleteUser(@Param('id') id: string) {
    await this.userService.deleteUser(id);
  }

  // ================== End Admin routes ======================== \\
}

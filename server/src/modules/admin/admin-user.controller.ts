import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from '../auth/current-user.decorator'
import type { AuthUserResponse } from '../auth/auth.types'
import { Roles } from '../auth/roles.decorator'
import { AdminUserService } from './admin-user.service'
import { UpdateUserRoleDto } from './dto/update-user-role.dto'
import { UpdateUserStatusDto } from './dto/update-user-status.dto'

@ApiTags('管理端用户')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin/users')
export class AdminUserController {
  constructor(private readonly adminUserService: AdminUserService) {}

  @Get()
  list(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('keyword') keyword?: string,
  ) {
    return this.adminUserService.list({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      keyword,
    })
  }

  @Patch(':id/role')
  updateRole(
    @Param('id') id: string,
    @CurrentUser() operator: AuthUserResponse,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.adminUserService.updateRole(id, operator.id, dto.role)
  }

  @Post(':id/password-reset')
  resetPassword(@Param('id') id: string, @CurrentUser() operator: AuthUserResponse) {
    return this.adminUserService.resetPassword(id, operator.id)
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @CurrentUser() operator: AuthUserResponse,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.adminUserService.updateStatus(id, operator.id, dto.status)
  }
}

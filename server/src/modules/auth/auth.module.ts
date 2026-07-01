import { Module } from '@nestjs/common'
import { AdminBootstrapService } from './admin-bootstrap.service'
import { AuthController } from './auth.controller'
import { AuthGuard } from './auth.guard'
import { AuthService } from './auth.service'

@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, AdminBootstrapService],
  exports: [AuthService, AuthGuard],
})
export class AuthModule {}

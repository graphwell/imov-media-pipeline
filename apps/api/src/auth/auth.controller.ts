import { Controller, Post, Body, HttpCode } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { AuthService } from './auth.service'
import { IsEmail, IsString, MinLength } from 'class-validator'

class LoginDto {
  @IsEmail()
  email: string

  @IsString()
  @MinLength(6)
  password: string
}

class RefreshDto {
  @IsString()
  refreshToken: string
}

class LogoutDto {
  @IsString()
  refreshToken: string
}

class SetupDto {
  @IsEmail()
  email: string

  @IsString()
  @MinLength(8)
  password: string

  @IsString()
  name: string

  @IsString()
  orgName: string
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Login com email e senha' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password)
  }

  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken)
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Body() dto: LogoutDto) {
    return this.authService.logout(dto.refreshToken)
  }

  @Post('setup')
  @HttpCode(201)
  @ApiOperation({ summary: 'Criar primeiro usuário admin (setup inicial)' })
  setup(@Body() dto: SetupDto) {
    return this.authService.createInitialAdmin(dto.email, dto.password, dto.name, dto.orgName)
  }
}

import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcryptjs'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } })
    if (!user || !user.passwordHash) throw new UnauthorizedException('Credenciais inválidas')

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) throw new UnauthorizedException('Credenciais inválidas')

    const payload = { sub: user.id, email: user.email, role: user.role, orgId: user.organizationId }
    const accessToken = this.jwt.sign(payload)
    const refreshToken = this.jwt.sign(payload, { expiresIn: '30d' })

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    })

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, organizationId: user.organizationId },
    }
  }

  async refresh(refreshToken: string) {
    const stored = await this.prisma.refreshToken.findUnique({ where: { token: refreshToken }, include: { user: true } })
    if (!stored || stored.expiresAt < new Date()) throw new UnauthorizedException('Token inválido ou expirado')

    const payload = { sub: stored.user.id, email: stored.user.email, role: stored.user.role, orgId: stored.user.organizationId }
    const accessToken = this.jwt.sign(payload)
    return { accessToken }
  }

  async logout(refreshToken: string) {
    await this.prisma.refreshToken.deleteMany({ where: { token: refreshToken } })
    return { message: 'Logout realizado com sucesso' }
  }

  async createInitialAdmin(email: string, password: string, name: string, orgName: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } })
    if (existing) throw new ConflictException('Usuário já existe')

    const org = await this.prisma.organization.create({
      data: { name: orgName, slug: orgName.toLowerCase().replace(/\s+/g, '-'), plan: 'ENTERPRISE' },
    })

    const passwordHash = await bcrypt.hash(password, 12)
    const user = await this.prisma.user.create({
      data: { email, name, passwordHash, role: 'SUPER_ADMIN', organizationId: org.id },
    })

    return { user: { id: user.id, email: user.email, name: user.name }, org }
  }

  async validateUser(userId: string) {
    return this.prisma.user.findUnique({ where: { id: userId }, include: { organization: true } })
  }
}

import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthenticatedRequest, SessionGuard } from '../auth/session.guard';
import { SESSION_COOKIE } from '../auth/session.service';
import { SlugParamDto } from '../tenants/tenants.dto';
import {
  BookingIdParamDto,
  BookingSettingsDto,
  BookingsListQueryDto,
  CreateBookingDto,
  SlotsQueryDto,
} from './booking.dto';
import { BookingService } from './booking.service';

@ApiTags('booking')
@Controller('booking')
export class BookingController {
  constructor(private readonly booking: BookingService) {}

  @Get('me/settings')
  @UseGuards(SessionGuard)
  @ApiCookieAuth(SESSION_COOKIE)
  @ApiOperation({ summary: 'Configuração da agenda do usuário logado' })
  getSettings(@Req() req: AuthenticatedRequest) {
    return this.booking.getSettings(req.userId);
  }

  @Put('me/settings')
  @UseGuards(SessionGuard)
  @ApiCookieAuth(SESSION_COOKIE)
  @ApiOperation({ summary: 'Salva serviços, janelas semanais, fuso e ativação da agenda' })
  saveSettings(@Req() req: AuthenticatedRequest, @Body() body: BookingSettingsDto) {
    return this.booking.saveSettings(req.userId, body);
  }

  @Get('me/bookings')
  @UseGuards(SessionGuard)
  @ApiCookieAuth(SESSION_COOKIE)
  @ApiOperation({ summary: 'Reservas futuras ou passadas da agenda' })
  listBookings(@Req() req: AuthenticatedRequest, @Query() query: BookingsListQueryDto) {
    return this.booking.listBookings(req.userId, query);
  }

  @Post('me/bookings/:id/cancel')
  @HttpCode(204)
  @UseGuards(SessionGuard)
  @ApiCookieAuth(SESSION_COOKIE)
  @ApiOperation({ summary: 'Cancela uma reserva e avisa o cliente por e-mail' })
  async cancel(@Req() req: AuthenticatedRequest, @Param() params: BookingIdParamDto) {
    await this.booking.cancelBooking(req.userId, params.id);
  }

  @Get('public/:slug')
  @ApiOperation({ summary: 'Serviços e fuso de uma agenda pública' })
  publicInfo(@Param() params: SlugParamDto) {
    return this.booking.getPublicInfo(params.slug);
  }

  @Get('public/:slug/slots')
  @ApiOperation({ summary: 'Horários livres de um serviço' })
  slots(@Param() params: SlugParamDto, @Query() query: SlotsQueryDto) {
    return this.booking.getSlots(params.slug, query);
  }

  @Post('public/:slug/book')
  @ApiOperation({ summary: 'Reserva um horário' })
  book(@Param() params: SlugParamDto, @Body() body: CreateBookingDto, @Req() req: Request) {
    return this.booking.book(params.slug, body, req.ip ?? 'unknown');
  }
}

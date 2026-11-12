import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
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
  AddServiceDto,
  BookingIdParamDto,
  BookingSettingsDto,
  BookingsListQueryDto,
  CreateBookingDto,
  LookupBookingDto,
  ManageExtraParamDto,
  ManageTokenParamDto,
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
  @ApiOperation({ summary: 'Reserva um horário (um ou mais serviços)' })
  book(@Param() params: SlugParamDto, @Body() body: CreateBookingDto, @Req() req: Request) {
    return this.booking.book(params.slug, body, req.ip ?? 'unknown');
  }

  @Post('public/:slug/lookup')
  @HttpCode(202)
  @ApiOperation({
    summary: 'Reenvia por e-mail os links das próximas reservas (resposta sempre neutra)',
  })
  async lookup(@Param() params: SlugParamDto, @Body() body: LookupBookingDto, @Req() req: Request) {
    await this.booking.lookup(params.slug, body, req.ip ?? 'unknown');
  }

  @Get('manage/:token')
  @ApiOperation({ summary: 'Detalhes da reserva para o cliente (link privado)' })
  managed(@Param() params: ManageTokenParamDto, @Req() req: Request) {
    return this.booking.getManaged(params.token, req.ip ?? 'unknown');
  }

  @Post('manage/:token/cancel')
  @HttpCode(200)
  @ApiOperation({ summary: 'Cliente cancela a própria reserva, dentro do prazo' })
  cancelManaged(@Param() params: ManageTokenParamDto, @Req() req: Request) {
    return this.booking.cancelManaged(params.token, req.ip ?? 'unknown');
  }

  @Post('manage/:token/services')
  @HttpCode(200)
  @ApiOperation({ summary: 'Cliente adiciona um serviço, se houver horário livre logo depois' })
  addService(
    @Param() params: ManageTokenParamDto,
    @Body() body: AddServiceDto,
    @Req() req: Request,
  ) {
    return this.booking.addService(params.token, body, req.ip ?? 'unknown');
  }

  @Delete('manage/:token/services/:extraId')
  @ApiOperation({ summary: 'Cliente remove um serviço adicional, dentro do prazo' })
  removeExtra(@Param() params: ManageExtraParamDto, @Req() req: Request) {
    return this.booking.removeExtra(params.token, params.extraId, req.ip ?? 'unknown');
  }

  @Get('manage/:token/calendar.ics')
  @Header('Content-Type', 'text/calendar; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="reserva.ics"')
  @ApiOperation({ summary: 'Arquivo de calendário (.ics) da reserva' })
  calendar(@Param() params: ManageTokenParamDto, @Req() req: Request) {
    return this.booking.calendarFile(params.token, req.ip ?? 'unknown');
  }
}

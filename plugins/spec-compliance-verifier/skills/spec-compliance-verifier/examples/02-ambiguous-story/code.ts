// src/orders/orders.controller.ts
// A plausible but under-specified implementation of PROJ-1099.

import { Controller, Param, Post, UseGuards, Req, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './order.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { Request } from 'express';

interface AuthedRequest extends Request {
  user: { id: string; role: 'admin' | 'customer' };
}

@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(
    @InjectRepository(Order) private readonly repo: Repository<Order>,
  ) {}

  @Post(':id/cancel')
  async cancel(@Param('id') id: string, @Req() req: AuthedRequest) {
    const order = await this.repo.findOne({ where: { id } });
    if (!order) {
      throw new NotFoundException();
    }
    const isAdmin = req.user.role === 'admin';
    const isOwner = order.customerId === req.user.id;
    if (!isAdmin && !(isOwner && order.status === 'PENDING')) {
      throw new ForbiddenException();
    }
    order.status = 'CANCELLED';
    await this.repo.save(order);
    return { id: order.id, status: order.status };
  }
}

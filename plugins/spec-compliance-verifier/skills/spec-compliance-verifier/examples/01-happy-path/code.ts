// src/orders/orders.controller.ts
// A correct NestJS implementation of PROJ-1001.

import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { IsInt, IsPositive, IsString, Matches } from 'class-validator';
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Entity, Column, PrimaryColumn } from 'typeorm';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

// --- Entity ---------------------------------------------------------------

@Entity('orders')
export class Order {
  @PrimaryColumn('uuid') id!: string;
  @Column('int') amount!: number;
  @Column('varchar', { length: 3 }) currency!: string;
  @Column('varchar', { length: 16 }) status!: 'PENDING' | 'PAID' | 'CANCELLED';
  @Column('timestamptz') createdAt!: Date;
}

// --- DTO ------------------------------------------------------------------

export class CreateOrderDto {
  @IsInt()
  @IsPositive()
  amount!: number;

  @IsString()
  @Matches(/^[A-Z]{3}$/)
  currency!: string;
}

// --- Service --------------------------------------------------------------

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private readonly repo: Repository<Order>,
  ) {}

  async create(input: CreateOrderDto): Promise<Order> {
    const order: Order = {
      id: randomUUID(),
      amount: input.amount,
      currency: input.currency,
      status: 'PENDING',
      createdAt: new Date(),
    };
    await this.repo.insert(order);
    return order;
  }
}

// --- Controller -----------------------------------------------------------

@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly service: OrdersService) {}

  @Post()
  @HttpCode(201)
  async create(@Body() body: CreateOrderDto) {
    const saved = await this.service.create(body);
    return {
      id: saved.id,
      status: saved.status,
      amount: saved.amount,
      currency: saved.currency,
    };
  }
}

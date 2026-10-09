import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ClaimsService, UploadedImage } from './claims.service';

export class CreateClaimDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  reference!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  address!: string;
}

const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

@Controller('claims')
export class ClaimsController {
  constructor(private readonly claims: ClaimsService) {}

  @Post()
  create(@Body() dto: CreateClaimDto) {
    return this.claims.createClaim(dto.reference, dto.address);
  }

  @Get()
  list(@Query('limit') limit?: string) {
    const n = limit ? Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200) : 50;
    return this.claims.listClaims(n);
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.claims.getClaim(id);
  }

  @Post(':id/photos')
  @UseInterceptors(FileInterceptor('photo', { limits: { fileSize: MAX_UPLOAD_BYTES } }))
  upload(@Param('id', ParseUUIDPipe) id: string, @UploadedFile() file?: UploadedImage) {
    if (!file) throw new BadRequestException('Expected a multipart field named "photo"');
    if (!ACCEPTED_TYPES.has(file.mimetype)) {
      throw new BadRequestException(`Unsupported image type ${file.mimetype}`);
    }
    return this.claims.addPhoto(id, file);
  }
}

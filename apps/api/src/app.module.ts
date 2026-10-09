import { DynamicModule, Module } from '@nestjs/common';
import { Pool } from 'pg';
import { ClaimsController } from './claims/claims.controller';
import { CLAIMS_REPOSITORY, ClaimsRepository } from './claims/claims.repository';
import { ClaimsService } from './claims/claims.service';
import { PgClaimsRepository } from './claims/pg-claims.repository';
import { BLOB_STORE, BlobStore, LocalBlobStore } from './storage/blob-store';
import { MockVisionProvider } from './vision/mock-vision.provider';
import { VISION_PROVIDER, VisionProvider } from './vision/vision-provider';

export interface AppDeps {
  repository: ClaimsRepository;
  vision: VisionProvider;
  blobs: BlobStore;
}

export function visionFromEnv(name = process.env.VISION_PROVIDER ?? 'mock'): VisionProvider {
  switch (name) {
    case 'mock':
      return new MockVisionProvider();
    default:
      throw new Error(`Unknown VISION_PROVIDER "${name}"`);
  }
}

export function depsFromEnv(): AppDeps {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required');
  return {
    repository: new PgClaimsRepository(new Pool({ connectionString: url })),
    vision: visionFromEnv(),
    blobs: new LocalBlobStore(process.env.UPLOAD_DIR ?? './uploads'),
  };
}

@Module({})
export class AppModule {
  // deps passed in so tests can use the in-memory repo + a fake vision provider
  static register(deps: AppDeps): DynamicModule {
    return {
      module: AppModule,
      controllers: [ClaimsController],
      providers: [
        ClaimsService,
        { provide: CLAIMS_REPOSITORY, useValue: deps.repository },
        { provide: VISION_PROVIDER, useValue: deps.vision },
        { provide: BLOB_STORE, useValue: deps.blobs },
      ],
    };
  }
}

import { Global, Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { ClsModule } from 'nestjs-cls';
import { buildPinoOptions } from './pino.config';

@Global()
@Module({
  imports: [
    ClsModule.forRoot({
      global: true,
      middleware: { mount: true },
    }),
    LoggerModule.forRootAsync({
      useFactory: () => buildPinoOptions(),
    }),
  ],
  exports: [LoggerModule, ClsModule],
})
export class LoggingModule {}

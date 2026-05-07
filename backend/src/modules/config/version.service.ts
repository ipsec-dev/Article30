import { Injectable } from '@nestjs/common';
import pkg from '../../../package.json';

@Injectable()
export class VersionService {
  readonly version: string = pkg.version;
}

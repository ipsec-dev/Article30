import { ApiProperty } from '@nestjs/swagger';

export type ImportRowStatus = 'ok' | 'conflict' | 'invalid';

export class ImportRowDto {
  @ApiProperty()
  rowNumber!: number;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: ['ok', 'conflict', 'invalid'] })
  status!: ImportRowStatus;

  @ApiProperty({ type: [String] })
  errors!: string[];
}

export class ImportSummaryDto {
  @ApiProperty()
  ok!: number;

  @ApiProperty()
  conflict!: number;

  @ApiProperty()
  invalid!: number;

  @ApiProperty()
  total!: number;
}

export class ImportPreviewDto {
  @ApiProperty({ type: [ImportRowDto] })
  rows!: ImportRowDto[];

  @ApiProperty({ type: ImportSummaryDto })
  summary!: ImportSummaryDto;
}

export class ImportCommitResultDto {
  @ApiProperty()
  created!: number;
}

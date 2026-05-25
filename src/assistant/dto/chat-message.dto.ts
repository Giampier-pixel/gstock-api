import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

const MAX_MESSAGES = 30;
const MAX_CONTENT_LEN = 2000;

export class ChatMessageItemDto {
  @ApiProperty({ enum: ['user', 'model'] })
  @IsIn(['user', 'model'])
  role!: 'user' | 'model';

  @ApiProperty({ minLength: 1, maxLength: MAX_CONTENT_LEN })
  @IsString()
  @MinLength(1)
  @MaxLength(MAX_CONTENT_LEN)
  content!: string;
}

export class ChatMessageDto {
  @ApiProperty({ type: [ChatMessageItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_MESSAGES)
  @ValidateNested({ each: true })
  @Type(() => ChatMessageItemDto)
  messages!: ChatMessageItemDto[];
}

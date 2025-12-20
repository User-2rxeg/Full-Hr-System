import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type CalendarDocument = HydratedDocument<Calendar>;

@Schema({ timestamps: true })
export class Calendar {
  @Prop({ required: true })
  year: number;

@Prop({ type: [Date], default: [] })
holidays: Date[];

  @Prop({
    type: [{ from: Date, to: Date, reason: String }],
    default: [],
  })
  blockedPeriods: { from: Date; to: Date; reason: string }[];
}

export const CalendarSchema = SchemaFactory.createForClass(Calendar);

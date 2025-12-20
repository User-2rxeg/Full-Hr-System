// eslint-disable-next-line @typescript-eslint/no-unused-vars
// src/time-management/holiday/holiday.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Holiday, HolidayDocument } from '../models/holiday.schema';
import { HolidayType } from '../models/enums';

/**
 * HolidayService
 * - small helper service to query the Holiday collection
 * - provides isHoliday(date) and getHolidayForDate(date)
 *
 * Behavior notes:
 * - NATIONAL and ORGANIZATIONAL holidays are matched by date range (startDate..endDate)
 * - WEEKLY_REST entries are treated as recurring weekly days. To define a weekly rest day,
 *   create a Holiday with type=WEEKLY_REST and set `startDate` to any date whose weekday
 *   corresponds to the weekly rest day (e.g. a Sunday). Optionally set `startDate` <= date
 *   and `endDate` to limit the active range; otherwise the weekly rest is considered active
 *   from `startDate` forward.
 */
@Injectable()
export class HolidayService {
    private readonly logger = new Logger(HolidayService.name);

    constructor(@InjectModel(Holiday.name) private readonly holidayModel: Model<HolidayDocument>) {}

    /**
     * Returns the Holiday document covering `date`, or null if none.
     * A Holiday with no endDate is a single-day holiday.
     * Also handles WEEKLY_REST entries by weekday matching.
     */
    async getHolidayForDate(date: Date) {
        // Normalize the input date to start of day for comparison
        const checkDate = new Date(date);
        checkDate.setUTCHours(0, 0, 0, 0);

        const start = new Date(checkDate);
        start.setUTCHours(0, 0, 0, 0);
        const end = new Date(checkDate);
        end.setUTCHours(23, 59, 59, 999);

        this.logger.debug(`[HolidayService] Checking holiday for date: ${checkDate.toISOString()} (${checkDate.toDateString()})`);

        try {
            // First, try to find NATIONAL or ORGANIZATIONAL holidays that cover the date
            const direct = await this.holidayModel.findOne({
                active: true,
                type: { $in: [HolidayType.NATIONAL, HolidayType.ORGANIZATIONAL] },
                startDate: { $lte: end },
                $or: [
                    { endDate: { $exists: false } },
                    { endDate: null },
                    { endDate: { $gte: start } }
                ]
            }).lean();

            if (direct) {
                this.logger.debug(`[HolidayService] Found direct holiday: ${direct.name || direct.type}`);
                return direct;
            }

            // Next, check for WEEKLY_REST entries (treated as recurring weekly by weekday)
            const weeklyRows = await this.holidayModel.find({
                active: true,
                type: HolidayType.WEEKLY_REST
            }).lean();

            if (weeklyRows && weeklyRows.length) {
                const targetWeekday = checkDate.getUTCDay(); // 0 (Sun) - 6 (Sat)
                const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                this.logger.debug(`[HolidayService] Checking weekly rest for ${dayNames[targetWeekday]} (weekday index: ${targetWeekday})`);

                for (const w of weeklyRows) {
                    if (!w.startDate) continue;
                    const startWeekday = new Date(w.startDate).getUTCDay();

                    this.logger.debug(`[HolidayService] Weekly rest entry: ${w.name || w.type}, startWeekday: ${startWeekday}, targetWeekday: ${targetWeekday}`);

                    // Only consider entries that match the weekday
                    if (startWeekday !== targetWeekday) continue;

                    // If row has startDate/endDate constraints, ensure date falls within them
                    const rowStart = new Date(w.startDate);
                    rowStart.setUTCHours(0, 0, 0, 0);

                    if (w.endDate) {
                        const rowEnd = new Date(w.endDate);
                        rowEnd.setUTCHours(23, 59, 59, 999);
                        if (checkDate >= rowStart && checkDate <= rowEnd) {
                            this.logger.debug(`[HolidayService] Found matching weekly rest within date range`);
                            return w;
                        }
                    } else {
                        // No endDate -> active from startDate forward
                        if (checkDate >= rowStart) {
                            this.logger.debug(`[HolidayService] Found matching weekly rest (active from startDate forward)`);
                            return w;
                        }
                    }
                }
            }

            this.logger.debug(`[HolidayService] No holiday found for date: ${checkDate.toDateString()}`);
            return null;
        } catch (e) {
            this.logger.error('getHolidayForDate failed', e);
            return null;
        }
    }

    /**
     * Boolean helper
     */
    async isHoliday(date: Date): Promise<boolean> {
        const h = await this.getHolidayForDate(date);
        return !!h;
    }

    // --- CRUD helpers for controller usage (no schema changes) ---
    async listAll(): Promise<HolidayDocument[]> {
        return await this.holidayModel.find({}).sort({ startDate: 1 }).lean();
    }

    async getById(id: string): Promise<HolidayDocument | null> {
        return await this.holidayModel.findById(id).lean();
    }

    async createHoliday(payload: Partial<Holiday>): Promise<HolidayDocument> {
        const doc = await this.holidayModel.create(payload as any);
        return doc.toObject() as HolidayDocument;
    }

    async updateHoliday(id: string, payload: Partial<Holiday>): Promise<HolidayDocument | null> {
        return await this.holidayModel.findByIdAndUpdate(id, payload as any, { new: true }).lean();
    }

    async deleteHoliday(id: string): Promise<boolean> {
        const res = await this.holidayModel.findByIdAndDelete(id).lean();
        return !!res;
    }
}

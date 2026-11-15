import { BurndownPoint } from '../types';

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export interface ElapsedBurndown {
  /** Reference day used to cut the series (YYYY-MM-DD, UTC like MS3). */
  asOfDate: string;
  /** Points that already happened (date <= asOfDate and with a known actual value). */
  elapsed: BurndownPoint[];
  /** Number of points the sprint has in total (including future days). */
  totalDays: number;
  /** 1-based position of the last elapsed day inside the sprint, 0 when it has not started. */
  currentDayNumber: number;
}

/** Today in UTC as YYYY-MM-DD (MS3 builds the burndown dates with UTC days). */
export function todayUtc(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function hasActualValue(point: BurndownPoint): boolean {
  const actual = point.actualRemaining ?? point.remainingStoryPoints;
  return actual !== undefined && actual !== null;
}

/**
 * Keeps only the burndown days that already happened, so the diagnosis never judges future days
 * (MS3 sends the whole sprint and, until the contract allows null, repeats the last value there).
 * A point counts as elapsed when its date is not after `asOfDate`; points without a date count when
 * they carry an actual value.
 */
export function selectElapsedBurndown(points: BurndownPoint[] = [], asOfDate?: string): ElapsedBurndown {
  const reference = asOfDate && ISO_DAY.test(asOfDate) ? asOfDate : todayUtc();
  const elapsed = points.filter((point) => {
    if (point.date && ISO_DAY.test(point.date.slice(0, 10))) {
      return point.date.slice(0, 10) <= reference && hasActualValue(point);
    }
    return hasActualValue(point);
  });

  const lastElapsed = elapsed[elapsed.length - 1];
  return {
    asOfDate: reference,
    elapsed,
    totalDays: points.length,
    currentDayNumber: lastElapsed ? points.indexOf(lastElapsed) + 1 : 0,
  };
}

import { fitDeclineCurve, evaluateDecline, daysBetween } from './declineCurve.js';

/**
 * Subsurface Production Allocation Engine
 *
 * Each sand is declined INDIVIDUALLY based on its own allocated production history.
 * Surplus or deficit vs. projections is always prorated by k·h.
 */
export function allocateProduction({ productionHistory, sandProperties, interventionMatrix, declineModel }) {
  const warnings = [];
  const declineFits = [];
  const allocations = [];
  const decisions = []; // Track decisions made by the engine

  const khMap = {};
  for (const sp of sandProperties) {
    khMap[sp.sandName] = sp.kh;
  }

  const periods = buildPeriods(interventionMatrix, productionHistory);

  if (periods.length === 0) {
    warnings.push('No periods could be determined from the intervention matrix.');
    return { allocations, declineFits, warnings, decisions };
  }

  // Track each sand's allocated production history for decline fitting
  const sandHistory = {};
  for (const sp of sandProperties) {
    sandHistory[sp.sandName] = [];
  }

  for (let p = 0; p < periods.length; p++) {
    const period = periods[p];
    const prevActiveSands = p > 0 ? periods[p - 1].activeSands : [];
    const currentActiveSands = period.activeSands;

    if (currentActiveSands.length === 0) {
      decisions.push({
        periodIndex: p,
        startDate: period.startDate,
        endDate: period.endDate,
        case: 'NO ACTIVE SANDS',
        description: 'No active sands in this period. Production unallocated.',
        activeSands: [],
        newSands: [],
        closedSands: prevActiveSands,
        continuingSands: [],
        method: 'unallocated'
      });
      warnings.push(`No active sands for period ${period.startDate} to ${period.endDate}. Production unallocated.`);
      const prodInPeriod = getProductionInRange(productionHistory, period.startDate, period.endDate);
      for (const rec of prodInPeriod) {
        allocations.push({ date: rec.date, sandName: '_UNALLOCATED_', allocatedProduction: rec.totalProduction });
      }
      continue;
    }

    const newSands = currentActiveSands.filter(s => !prevActiveSands.includes(s));
    const closedSands = prevActiveSands.filter(s => !currentActiveSands.includes(s));
    const continuingSands = currentActiveSands.filter(s => prevActiveSands.includes(s));
    const prodInPeriod = getProductionInRange(productionHistory, period.startDate, period.endDate);

    // ── CASE 1: First period or no previous sands ──
    if (p === 0 || prevActiveSands.length === 0) {
      decisions.push({
        periodIndex: p,
        startDate: period.startDate,
        endDate: period.endDate,
        case: 'CASE 1: First Period',
        description: 'Initial period with no previous sands. Distribution by kh only.',
        activeSands: currentActiveSands,
        newSands: [],
        closedSands: [],
        continuingSands: [],
        method: 'kh_distribution'
      });
      distributeByKh(prodInPeriod, currentActiveSands, khMap, allocations, sandHistory);
      continue;
    }

    // ── CASE 2: No changes in active sands ──
    if (newSands.length === 0 && closedSands.length === 0) {
      decisions.push({
        periodIndex: p,
        startDate: period.startDate,
        endDate: period.endDate,
        case: 'CASE 2: No Changes',
        description: 'No changes in active sands. Distribution by kh only.',
        activeSands: currentActiveSands,
        newSands: [],
        closedSands: [],
        continuingSands: currentActiveSands,
        method: 'kh_distribution'
      });
      distributeByKh(prodInPeriod, currentActiveSands, khMap, allocations, sandHistory);
      continue;
    }

    // ── CASE 3: Only closures (no new sands) — decline continuing sands ──
    if (newSands.length === 0 && closedSands.length > 0) {
      const fits = fitContinuingSands(continuingSands, sandHistory, declineModel, declineFits, warnings, period, periods[p - 1]);

      // Calculate average projected values for the period (for decision reporting)
      const avgProjected = {};
      continuingSands.forEach(sand => { avgProjected[sand] = 0; });
      let countDates = 0;

      for (const rec of prodInPeriod) {
        const projected = projectSands(continuingSands, fits, rec.date);
        continuingSands.forEach(sand => {
          avgProjected[sand] += projected[sand];
        });
        countDates++;
      }
      
      if (countDates > 0) {
        continuingSands.forEach(sand => {
          avgProjected[sand] /= countDates;
        });
      }

      decisions.push({
        periodIndex: p,
        startDate: period.startDate,
        endDate: period.endDate,
        case: 'CASE 3: Only Closures',
        description: 'Sands closed, no new sands. Continuing sands use decline curves with kh-prorated adjustments.',
        activeSands: currentActiveSands,
        newSands: [],
        closedSands: closedSands,
        continuingSands: continuingSands,
        method: 'decline_with_adjustment',
        projectedValues: avgProjected
      });

      for (const rec of prodInPeriod) {
        const projected = projectSands(continuingSands, fits, rec.date);
        const sumProjected = Object.values(projected).reduce((a, b) => a + b, 0);
        const diff = rec.totalProduction - sumProjected;

        // Adjust each sand: projected + diff prorated by kh
        allocateWithAdjustment(rec, continuingSands, projected, diff, khMap, allocations, sandHistory);
      }
      continue;
    }

    // ── CASE 4: New sands opened + continuing sands ──
    if (newSands.length > 0 && continuingSands.length > 0) {
      const fits = fitContinuingSands(continuingSands, sandHistory, declineModel, declineFits, warnings, period, periods[p - 1]);

      if (!fits) {
        decisions.push({
          periodIndex: p,
          startDate: period.startDate,
          endDate: period.endDate,
          case: 'CASE 4: New + Continuing (Fallback)',
          description: 'New sands opened with continuing sands, but insufficient data for decline. Distribution by kh only.',
          activeSands: currentActiveSands,
          newSands: newSands,
          closedSands: closedSands,
          continuingSands: continuingSands,
          method: 'kh_distribution'
        });
        distributeByKh(prodInPeriod, currentActiveSands, khMap, allocations, sandHistory);
        continue;
      }

      const newKhTotal = sumKh(newSands, khMap);
      const contKhTotal = sumKh(continuingSands, khMap);

      // Calculate average projected values for the period (for decision reporting)
      const avgProjected = {};
      continuingSands.forEach(sand => { avgProjected[sand] = 0; });
      let countDates = 0;

      for (const rec of prodInPeriod) {
        const projected = projectSands(continuingSands, fits, rec.date);
        continuingSands.forEach(sand => {
          avgProjected[sand] += projected[sand];
        });
        countDates++;
      }
      
      if (countDates > 0) {
        continuingSands.forEach(sand => {
          avgProjected[sand] /= countDates;
        });
      }

      decisions.push({
        periodIndex: p,
        startDate: period.startDate,
        endDate: period.endDate,
        case: 'CASE 4: New + Continuing',
        description: 'New sands opened with continuing sands. Continuing sands use decline curves, new sands receive incremental production (or 0 if deficit).',
        activeSands: currentActiveSands,
        newSands: newSands,
        closedSands: closedSands,
        continuingSands: continuingSands,
        method: 'decline_plus_incremental',
        projectedValues: avgProjected
      });

      for (const rec of prodInPeriod) {
        const projected = projectSands(continuingSands, fits, rec.date);
        const sumProjected = Object.values(projected).reduce((a, b) => a + b, 0);
        const incremental = rec.totalProduction - sumProjected;

        if (incremental > 0) {
          // Continuing sands get their individual projected amount
          for (const sand of continuingSands) {
            allocations.push({ date: rec.date, sandName: sand, allocatedProduction: projected[sand] });
            sandHistory[sand].push({ date: rec.date, production: projected[sand] });
          }
          // New sands share the incremental by kh
          for (const sand of newSands) {
            const alloc = newKhTotal > 0 ? incremental * khMap[sand] / newKhTotal : 0;
            allocations.push({ date: rec.date, sandName: sand, allocatedProduction: alloc });
            sandHistory[sand].push({ date: rec.date, production: alloc });
          }
        } else {
          // Negative incremental: new sands get 0
          // Each continuing sand = projected - |deficit| prorated by kh
          for (const sand of newSands) {
            allocations.push({ date: rec.date, sandName: sand, allocatedProduction: 0 });
            sandHistory[sand].push({ date: rec.date, production: 0 });
          }
          allocateWithAdjustment(rec, continuingSands, projected, incremental, khMap, allocations, sandHistory);
        }
      }
      continue;
    }

    // ── CASE 5: New sands opened, NO continuing sands ──
    if (newSands.length > 0 && continuingSands.length === 0) {
      decisions.push({
        periodIndex: p,
        startDate: period.startDate,
        endDate: period.endDate,
        case: 'CASE 5: Only New Sands',
        description: 'Only new sands opened, no continuing sands. Distribution by kh only.',
        activeSands: currentActiveSands,
        newSands: newSands,
        closedSands: closedSands,
        continuingSands: [],
        method: 'kh_distribution'
      });
      distributeByKh(prodInPeriod, newSands, khMap, allocations, sandHistory);
      continue;
    }

    // Fallback
    decisions.push({
      periodIndex: p,
      startDate: period.startDate,
      endDate: period.endDate,
      case: 'FALLBACK',
      description: 'Fallback case. Distribution by kh only.',
      activeSands: currentActiveSands,
      newSands: newSands,
      closedSands: closedSands,
      continuingSands: continuingSands,
      method: 'kh_distribution'
    });
    distributeByKh(prodInPeriod, currentActiveSands, khMap, allocations, sandHistory);
  }

  const uniqueWarnings = [...new Set(warnings)];
  return { allocations, declineFits, warnings: uniqueWarnings, decisions };
}

// ─── Core helpers ───

/**
 * Fit decline for each continuing sand individually.
 * Uses ONLY data from the immediately previous period (before the intervention).
 * This avoids mixing data from different distribution regimes.
 * Returns { sandName: { fit, refDate } } or null if insufficient history.
 */
function fitContinuingSands(continuingSands, sandHistory, declineModel, declineFits, warnings, period, prevPeriod) {
  const fits = {};

  for (const sand of continuingSands) {
    const fullHistory = sandHistory[sand] || [];

    // Only use data from the previous period (strictly before the current intervention)
    const history = fullHistory.filter(h => h.date >= prevPeriod.startDate && h.date <= prevPeriod.endDate);

    if (history.length < 3) {
      // Not enough data for decline fit — use flat projection at the average of available data
      const avg = history.length > 0
        ? history.reduce((s, h) => s + h.production, 0) / history.length
        : 0;
      warnings.push(`Insufficient history for ${sand} in period ${prevPeriod.startDate}–${prevPeriod.endDate}. Using flat projection at ${avg.toFixed(1)} bbl/d.`);
      fits[sand] = {
        fit: { model: 'flat', qi: avg, di: 0, b: 0 },
        refDate: prevPeriod.startDate,
        flat: avg,
      };
      continue;
    }

    const dates = history.map(h => h.date);
    const prods = history.map(h => h.production);
    const fit = fitDeclineCurve(dates, prods, declineModel || 'best_fit');

    if (fit.warning) warnings.push(fit.warning);

    fits[sand] = {
      fit,
      refDate: dates[0],  // t=0 corresponds to qi at the start of the fitting period
    };

    declineFits.push({
      sand,
      period: `Before ${period.startDate}`,
      startDate: dates[0],
      endDate: dates[dates.length - 1],
      model: fit.model,
      qi: fit.qi,
      di: fit.di,
      b: fit.b,
      r2: fit.r2,
    });
  }

  return fits;
}

/**
 * Project each sand's decline for a given date.
 * Returns { sandName: projectedProduction }
 */
function projectSands(sands, fits, date) {
  const projected = {};
  for (const sand of sands) {
    if (fits[sand].flat !== undefined) {
      projected[sand] = fits[sand].flat;
    } else {
      const tDays = daysBetween(fits[sand].refDate, date);
      projected[sand] = evaluateDecline(fits[sand].fit, tDays);
    }
  }
  return projected;
}

/**
 * Adjust each sand's projected value by a diff (positive = surplus, negative = deficit),
 * prorated by kh. Clamp to 0 minimum.
 */
function allocateWithAdjustment(rec, sands, projected, diff, khMap, allocations, sandHistory) {
  const totalKh = sumKh(sands, khMap);

  for (const sand of sands) {
    const adjustment = totalKh > 0 ? diff * khMap[sand] / totalKh : 0;
    const alloc = Math.max(0, projected[sand] + adjustment);
    allocations.push({ date: rec.date, sandName: sand, allocatedProduction: alloc });
    sandHistory[sand].push({ date: rec.date, production: alloc });
  }
}

// ─── Utility helpers ───

function buildPeriods(interventionMatrix, productionHistory) {
  const { sandNames, interventionDates, matrix } = interventionMatrix;
  const periods = [];
  const sortedDates = [...interventionDates].sort((a, b) => new Date(a) - new Date(b));
  const lastProdDate = productionHistory.length > 0
    ? productionHistory[productionHistory.length - 1].date
    : sortedDates[sortedDates.length - 1];

  for (let i = 0; i < sortedDates.length; i++) {
    const startDate = sortedDates[i];
    const endDate = i < sortedDates.length - 1
      ? dayBefore(sortedDates[i + 1])
      : lastProdDate;

    const originalIdx = interventionDates.indexOf(sortedDates[i]);
    const activeSands = [];
    for (let s = 0; s < sandNames.length; s++) {
      if (matrix[s][originalIdx]) {
        activeSands.push(sandNames[s]);
      }
    }
    periods.push({ startDate, endDate, activeSands });
  }
  return periods;
}

function dayBefore(dateStr) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

function getProductionInRange(productionHistory, startDate, endDate) {
  return productionHistory.filter(r => r.date >= startDate && r.date <= endDate);
}

function distributeByKh(productionRecords, sands, khMap, allocations, sandHistory) {
  const totalKh = sumKh(sands, khMap);
  for (const rec of productionRecords) {
    for (const sand of sands) {
      const alloc = totalKh > 0 ? rec.totalProduction * khMap[sand] / totalKh : 0;
      allocations.push({ date: rec.date, sandName: sand, allocatedProduction: alloc });
      sandHistory[sand].push({ date: rec.date, production: alloc });
    }
  }
}

function sumKh(sands, khMap) {
  return sands.reduce((sum, s) => sum + (khMap[s] || 0), 0);
}

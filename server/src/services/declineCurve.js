import LM from 'ml-levenberg-marquardt';
const { levenbergMarquardt } = LM;

// --- Arps Decline Models ---

function exponentialModel(t, [qi, di]) {
  return qi * Math.exp(-di * t);
}

function hyperbolicModel(t, [qi, di, b]) {
  return qi / Math.pow(1 + b * di * t, 1 / b);
}

function harmonicModel(t, [qi, di]) {
  return qi / (1 + di * t);
}

// --- Helpers ---

function daysBetween(dateA, dateB) {
  const a = new Date(dateA);
  const b = new Date(dateB);
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

function computeR2(actual, predicted) {
  const mean = actual.reduce((s, v) => s + v, 0) / actual.length;
  let ssTot = 0, ssRes = 0;
  for (let i = 0; i < actual.length; i++) {
    ssTot += (actual[i] - mean) ** 2;
    ssRes += (actual[i] - predicted[i]) ** 2;
  }
  if (ssTot === 0) return 0;
  return 1 - ssRes / ssTot;
}

function estimateInitialDi(t, q) {
  if (t.length < 2 || q[0] <= 0 || q[q.length - 1] <= 0) return 0.001;
  const tLast = t[t.length - 1];
  if (tLast === 0) return 0.001;
  return Math.max(1e-6, Math.min(0.5, -Math.log(q[q.length - 1] / q[0]) / tLast));
}

// --- Fitting ---

function fitSingleModel(tValues, qValues, modelType) {
  const qi0 = qValues[0] || 1;
  const di0 = estimateInitialDi(tValues, qValues);
  const qMin = Math.min(...qValues.filter(v => v > 0)) || 0.1;
  const qMax = Math.max(...qValues) || 1;

  let paramFunction, initialValues, minValues, maxValues;

  if (modelType === 'exponential') {
    paramFunction = ([qi, di]) => (t) => exponentialModel(t, [qi, di]);
    initialValues = [qi0, di0];
    minValues = [0.1 * qMin, 1e-7];
    maxValues = [10 * qMax, 1.0];
  } else if (modelType === 'hyperbolic') {
    paramFunction = ([qi, di, b]) => (t) => hyperbolicModel(t, [qi, di, b]);
    initialValues = [qi0, di0, 0.5];
    minValues = [0.1 * qMin, 1e-7, 0.001];
    maxValues = [10 * qMax, 1.0, 2.0];
  } else {
    paramFunction = ([qi, di]) => (t) => harmonicModel(t, [qi, di]);
    initialValues = [qi0, di0];
    minValues = [0.1 * qMin, 1e-7];
    maxValues = [10 * qMax, 1.0];
  }

  try {
    const data = { x: tValues, y: qValues };
    const options = {
      damping: 1.5,
      initialValues,
      minValues,
      maxValues,
      maxIterations: 200,
      errorTolerance: 1e-8,
    };

    const result = levenbergMarquardt(data, paramFunction, options);
    const params = result.parameterValues;

    // Compute predicted values and R2
    const predicted = tValues.map(t => {
      const fn = paramFunction(params);
      return fn(t);
    });
    const r2 = computeR2(qValues, predicted);

    if (modelType === 'exponential') {
      return { model: 'exponential', qi: params[0], di: params[1], b: 0, r2 };
    } else if (modelType === 'hyperbolic') {
      return { model: 'hyperbolic', qi: params[0], di: params[1], b: params[2], r2 };
    } else {
      return { model: 'harmonic', qi: params[0], di: params[1], b: 1, r2 };
    }
  } catch (err) {
    // Fallback: simple exponential estimate
    return {
      model: modelType,
      qi: qi0,
      di: di0,
      b: modelType === 'hyperbolic' ? 0.5 : modelType === 'harmonic' ? 1 : 0,
      r2: -1,
      warning: `Fit failed for ${modelType}: ${err.message}`
    };
  }
}

// --- Public API ---

export function fitDeclineCurve(dates, productions, declineModel) {
  if (dates.length < 3) {
    return {
      model: 'exponential',
      qi: productions[0] || 0,
      di: 0.001,
      b: 0,
      r2: -1,
      warning: 'Insufficient data points for curve fitting (< 3)'
    };
  }

  // Convert dates to t (days since first date)
  const t = dates.map(d => daysBetween(dates[0], d));

  const modelsToFit = declineModel === 'best_fit'
    ? ['exponential', 'hyperbolic', 'harmonic']
    : [declineModel];

  const fits = modelsToFit.map(m => fitSingleModel(t, productions, m));

  // Return best fit by R2
  fits.sort((a, b) => b.r2 - a.r2);
  return fits[0];
}

export function evaluateDecline(fit, tDays) {
  const { qi, di, b, model } = fit;
  if (model === 'exponential') return exponentialModel(tDays, [qi, di]);
  if (model === 'hyperbolic') return hyperbolicModel(tDays, [qi, di, b]);
  return harmonicModel(tDays, [qi, di]);
}

export { daysBetween };

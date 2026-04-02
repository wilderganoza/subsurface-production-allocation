export function validateAllocationRequest(body) {
  const errors = [];

  // Production history
  if (!Array.isArray(body.productionHistory) || body.productionHistory.length === 0) {
    errors.push('productionHistory must be a non-empty array.');
  } else {
    for (let i = 0; i < body.productionHistory.length; i++) {
      const rec = body.productionHistory[i];
      if (!rec.date) errors.push(`productionHistory[${i}] missing date.`);
      if (typeof rec.totalProduction !== 'number' || rec.totalProduction < 0) {
        errors.push(`productionHistory[${i}] totalProduction must be a non-negative number.`);
      }
    }
    // Check for duplicate dates
    const dates = body.productionHistory.map(r => r.date);
    const uniqueDates = new Set(dates);
    if (uniqueDates.size !== dates.length) {
      errors.push('productionHistory contains duplicate dates.');
    }
  }

  // Sand properties
  if (!Array.isArray(body.sandProperties) || body.sandProperties.length === 0) {
    errors.push('sandProperties must be a non-empty array.');
  } else {
    for (let i = 0; i < body.sandProperties.length; i++) {
      const sp = body.sandProperties[i];
      if (!sp.sandName) errors.push(`sandProperties[${i}] missing sandName.`);
      if (typeof sp.kh !== 'number' || sp.kh <= 0) {
        errors.push(`sandProperties[${i}] kh must be a positive number.`);
      }
    }
  }

  // Intervention matrix
  const im = body.interventionMatrix;
  if (!im || !Array.isArray(im.sandNames) || !Array.isArray(im.interventionDates) || !Array.isArray(im.matrix)) {
    errors.push('interventionMatrix must have sandNames, interventionDates, and matrix arrays.');
  } else {
    if (im.sandNames.length === 0) errors.push('interventionMatrix.sandNames must not be empty.');
    if (im.interventionDates.length === 0) errors.push('interventionMatrix.interventionDates must not be empty.');
    if (im.matrix.length !== im.sandNames.length) {
      errors.push('interventionMatrix.matrix rows must match sandNames length.');
    }
    for (let s = 0; s < im.matrix.length; s++) {
      if (!Array.isArray(im.matrix[s]) || im.matrix[s].length !== im.interventionDates.length) {
        errors.push(`interventionMatrix.matrix[${s}] columns must match interventionDates length.`);
      }
    }

    // Check that sand names in interventionMatrix match sandProperties
    if (body.sandProperties) {
      const propNames = new Set(body.sandProperties.map(s => s.sandName));
      for (const name of im.sandNames) {
        if (!propNames.has(name)) {
          errors.push(`Sand "${name}" in interventionMatrix not found in sandProperties.`);
        }
      }
    }
  }

  // Decline model
  const validModels = ['exponential', 'hyperbolic', 'harmonic', 'best_fit'];
  if (body.declineModel && !validModels.includes(body.declineModel)) {
    errors.push(`declineModel must be one of: ${validModels.join(', ')}`);
  }

  return errors;
}

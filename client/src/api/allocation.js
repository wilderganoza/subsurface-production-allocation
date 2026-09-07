export async function runAllocation(well) {
  const body = {
    wellName: well.name,
    productionHistory: well.productionData,
    sandProperties: well.sandProperties,
    interventionMatrix: well.interventionMatrix,
    declineModel: well.declineModel || 'best_fit',
  };

  const res = await fetch('/api/allocate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.errors ? data.errors.join('; ') : 'Server error');
  }

  return res.json();
}

function generateDescription(decision) {
  const { newSands, closedSands, continuingSands, activeSands, method } = decision;
  
  const parts = [];
  
  // Describe what happens with continuing sands
  if (continuingSands.length > 0 && method !== 'kh_distribution') {
    const sandsList = continuingSands.join(', ');
    parts.push(`Se declinan las arenas ${sandsList}`);
  }
  
  // Describe closed sands
  if (closedSands.length > 0) {
    const sandsList = closedSands.join(', ');
    if (closedSands.length === 1) {
      parts.push(`se cierra la arena ${sandsList}`);
    } else {
      parts.push(`se cierran las arenas ${sandsList}`);
    }
  }
  
  // Describe new sands and incremental distribution
  if (newSands.length > 0) {
    const sandsList = newSands.join(', ');
    if (method === 'decline_plus_incremental') {
      parts.push(`se distribuye el incremental entre las arenas ${sandsList}`);
    } else {
      // For kh_distribution with new sands
      if (continuingSands.length > 0) {
        parts.push(`se abren las arenas ${sandsList}`);
      } else {
        parts.push(`se distribuye la producción proporcional al kh de las arenas ${sandsList}`);
      }
    }
  }
  
  // Special case: only kh distribution with no changes
  if (method === 'kh_distribution' && newSands.length === 0 && closedSands.length === 0) {
    const sandsList = activeSands.join(', ');
    return `Se distribuye la producción proporcional al kh de las arenas ${sandsList}.`;
  }
  
  // Join all parts
  if (parts.length === 0) {
    return 'Sin cambios en la configuración de arenas.';
  }
  
  // Capitalize first letter and add period
  let description = parts.join(', ');
  description = description.charAt(0).toUpperCase() + description.slice(1) + '.';
  
  return description;
}

export default function CriteriaView({ decisions }) {
  console.log('CriteriaView - decisions:', decisions);
  
  if (!decisions || decisions.length === 0) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
        No decision criteria available. Run the allocation first.
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <h3 style={{ marginBottom: '8px', fontSize: '16px', fontWeight: 600 }}>
        Allocation Criteria by Intervention
      </h3>
      <p style={{ marginBottom: '20px', fontSize: '13px', color: 'var(--color-text-muted)' }}>
        Describes what happens at each intervention period.
      </p>

      <div style={{ overflowX: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: 'var(--color-surface)', borderBottom: '2px solid var(--color-border)' }}>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-muted)', width: '120px' }}>
                Intervention
              </th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-muted)', width: '200px' }}>
                Period
              </th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                Criteria
              </th>
            </tr>
          </thead>
          <tbody>
            {decisions.map((decision, idx) => (
              <tr
                key={idx}
                style={{
                  borderBottom: '1px solid var(--color-border)',
                  background: idx % 2 === 0 ? 'transparent' : 'rgba(139, 143, 163, 0.03)',
                }}
              >
                <td style={{ padding: '14px', fontWeight: 600, color: 'var(--color-text)' }}>
                  #{decision.periodIndex + 1}
                </td>
                <td style={{ padding: '14px', color: 'var(--color-text-muted)', fontSize: '12px' }}>
                  {decision.startDate}
                  <br />
                  <span style={{ opacity: 0.7 }}>→ {decision.endDate}</span>
                </td>
                <td style={{ padding: '14px', color: 'var(--color-text)', lineHeight: '1.6' }}>
                  {generateDescription(decision)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

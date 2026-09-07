import { Router } from 'express';
import { validateAllocationRequest } from '../services/validator.js';
import { allocateProduction } from '../services/allocationEngine.js';

const router = Router();

router.post('/allocate', (req, res) => {
  const errors = validateAllocationRequest(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  try {
    // Sort production history by date
    req.body.productionHistory.sort((a, b) => a.date.localeCompare(b.date));

    const result = allocateProduction({
      productionHistory: req.body.productionHistory,
      sandProperties: req.body.sandProperties,
      interventionMatrix: req.body.interventionMatrix,
      declineModel: req.body.declineModel || 'best_fit'
    });

    const enrichedResult = {
      ...result,
      decisions: result.decisions ?? [],
    };

    console.log('Allocation result keys:', Object.keys(enrichedResult));

    res.json(enrichedResult);
  } catch (err) {
    console.error('Allocation error:', err);
    res.status(500).json({ error: 'Internal server error during allocation computation.' });
  }
});

export default router;

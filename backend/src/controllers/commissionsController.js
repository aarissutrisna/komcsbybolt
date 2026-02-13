import * as commissionsService from '../services/commissionsService.js';

export const calculateByDate = async (req, res) => {
  try {
    const { branchId, tanggal } = req.body;

    if (!branchId || !tanggal) {
      return res.status(400).json({ error: 'branchId and tanggal required' });
    }

    const result = await commissionsService.calculateCommissionByDate(branchId, tanggal);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const calculateByBranch = async (req, res) => {
  try {
    const { branchId, periodStart, periodEnd } = req.body;

    if (!branchId || !periodStart || !periodEnd) {
      return res.status(400).json({ error: 'branchId, periodStart, periodEnd required' });
    }

    const result = await commissionsService.calculateCommissionByBranch(branchId, periodStart, periodEnd);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

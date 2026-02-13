import * as withdrawalsService from '../services/withdrawalsService.js';

export const create = async (req, res) => {
  try {
    const { nominal } = req.body;

    if (!nominal || nominal <= 0) {
      return res.status(400).json({ error: 'Valid nominal amount required' });
    }

    const result = await withdrawalsService.createWithdrawalRequest(req.user.id, nominal);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const approve = async (req, res) => {
  try {
    const { withdrawalId, approved, catatan } = req.body;

    if (!withdrawalId) {
      return res.status(400).json({ error: 'withdrawalId required' });
    }

    const result = await withdrawalsService.approveWithdrawalRequest(withdrawalId, approved, catatan);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getAll = async (req, res) => {
  try {
    const { userId, branchId, status } = req.query;

    const filters = {};
    if (userId) filters.userId = userId;
    if (branchId) filters.branchId = branchId;
    if (status) filters.status = status;

    const result = await withdrawalsService.getWithdrawalRequests(filters);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getBalance = async (req, res) => {
  try {
    const result = await withdrawalsService.getUserBalance(req.user.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

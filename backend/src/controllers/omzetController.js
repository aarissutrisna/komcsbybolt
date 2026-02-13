import * as omzetService from '../services/omzetService.js';
import * as commissionsService from '../services/commissionsService.js';

export const create = async (req, res) => {
  try {
    const { userId, branchId, amount, date, description } = req.body;

    if (!userId || !branchId || !amount || !date) {
      return res.status(400).json({ error: 'userId, branchId, amount, date required' });
    }

    const omzet = await omzetService.createOmzet(userId, branchId, amount, date, description);
    res.status(201).json(omzet);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getByDate = async (req, res) => {
  try {
    const { date, startDate, endDate } = req.query;

    if (date) {
      const omzet = await omzetService.getOmzetByDate(date);
      res.json(omzet);
    } else if (startDate && endDate) {
      const omzet = await omzetService.getOmzetByDate(startDate);
      res.json(omzet);
    } else {
      res.status(400).json({ error: 'date or startDate/endDate required' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getByBranch = async (req, res) => {
  try {
    const { branchId, startDate, endDate } = req.query;

    if (!branchId) {
      return res.status(400).json({ error: 'branchId required' });
    }

    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const end = endDate || new Date().toISOString().split('T')[0];

    const omzet = await omzetService.getOmzetByBranch(branchId, start, end);
    res.json(omzet);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getByUser = async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    const omzet = await omzetService.getOmzetByUser(userId);
    res.json(omzet);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getStats = async (req, res) => {
  try {
    const { branchId, month, year } = req.query;

    if (!branchId || !month || !year) {
      return res.status(400).json({ error: 'branchId, month, year required' });
    }

    const stats = await omzetService.getOmzetStats(branchId, month, year);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const receiveN8NWebhook = async (req, res) => {
  try {
    const { branchId, data, tanggal, cash, piutang, token } = req.body;

    if (!branchId) {
      return res.status(400).json({ error: 'branchId required' });
    }

    const N8N_WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET;
    if (N8N_WEBHOOK_SECRET && token !== N8N_WEBHOOK_SECRET) {
      return res.status(401).json({ error: 'Invalid webhook token' });
    }

    let omzetItems = [];
    if (data) {
      omzetItems = Array.isArray(data) ? data : [data];
    } else if (tanggal && cash !== undefined && piutang !== undefined) {
      omzetItems = [{ tanggal, cash, piutang }];
    } else {
      return res.status(400).json({ error: 'Missing data: provide either "data" array or tanggal/cash/piutang fields' });
    }

    const results = await omzetService.syncOmzetFromN8N(branchId, omzetItems);

    const commissionResults = [];
    for (const item of results) {
      try {
        const commissionResult = await commissionsService.calculateCommissionByDate(branchId, item.date);
        commissionResults.push({ tanggal: item.date, result: commissionResult });
      } catch (error) {
        console.error(`Commission calculation failed for ${item.date}:`, error);
      }
    }

    res.json({
      success: true,
      message: `Received and processed ${results.length} omzet records`,
      recordsProcessed: results.length,
      omzetData: results,
      commissionResults: commissionResults,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const syncFromN8N = async (req, res) => {
  try {
    const { branchId, startDate, endDate } = req.body;

    if (!branchId) {
      return res.status(400).json({ error: 'branchId required' });
    }

    const result = await omzetService.fetchAndSyncFromN8N(branchId, startDate, endDate);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

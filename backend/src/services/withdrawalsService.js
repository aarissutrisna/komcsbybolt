import pool from '../config/database.js';

export const createWithdrawalRequest = async (userId, nominal) => {
  try {
    const commissionsResult = await pool.query(
      'SELECT SUM(commission_amount) as total_komisi FROM commissions WHERE user_id = $1 AND status = $2',
      [userId, 'paid']
    );

    const totalKomisi = commissionsResult.rows[0]?.total_komisi || 0;

    const mutationsResult = await pool.query(
      `SELECT SUM(CASE WHEN tipe = 'masuk' THEN nominal ELSE -nominal END) as net_mutations
       FROM commission_mutations
       WHERE user_id = $1`,
      [userId]
    );

    const totalMutations = mutationsResult.rows[0]?.net_mutations || 0;
    const availableBalance = totalKomisi + totalMutations;

    if (nominal > availableBalance) {
      throw new Error(`Insufficient balance. Available: ${availableBalance}, Requested: ${nominal}`);
    }

    const userResult = await pool.query(
      'SELECT branch_id FROM users WHERE id = $1',
      [userId]
    );

    const branchId = userResult.rows[0]?.branch_id;

    const result = await pool.query(
      `INSERT INTO withdrawal_requests (user_id, branch_id, nominal, status, tanggal)
       VALUES ($1, $2, $3, $4, CURRENT_DATE)
       RETURNING *`,
      [userId, branchId, nominal, 'pending']
    );

    return {
      success: true,
      message: 'Withdrawal request created',
      availableBalance: availableBalance,
      withdrawal: result.rows[0],
    };
  } catch (error) {
    throw error;
  }
};

export const approveWithdrawalRequest = async (withdrawalId, approved, catatan) => {
  try {
    const withdrawalResult = await pool.query(
      'SELECT * FROM withdrawal_requests WHERE id = $1',
      [withdrawalId]
    );

    if (withdrawalResult.rows.length === 0) {
      throw new Error('Withdrawal request not found');
    }

    const withdrawal = withdrawalResult.rows[0];
    const newStatus = approved ? 'approved' : 'rejected';

    const updateResult = await pool.query(
      `UPDATE withdrawal_requests
       SET status = $1, catatan = $2
       WHERE id = $3
       RETURNING *`,
      [newStatus, catatan || '', withdrawalId]
    );

    if (approved) {
      await pool.query(
        `INSERT INTO commission_mutations (user_id, branch_id, tanggal, tipe, nominal, keterangan)
         VALUES ($1, $2, CURRENT_DATE, $3, $4, $5)`,
        [
          withdrawal.user_id,
          withdrawal.branch_id,
          'keluar',
          withdrawal.nominal,
          `Penarikan komisi - ${catatan || ''}`,
        ]
      );
    }

    return {
      success: true,
      message: `Withdrawal request ${newStatus}`,
      status: newStatus,
      withdrawal: updateResult.rows[0],
    };
  } catch (error) {
    throw error;
  }
};

export const getWithdrawalRequests = async (filters = {}) => {
  try {
    let query = 'SELECT * FROM withdrawal_requests WHERE 1 = 1';
    const params = [];

    if (filters.userId) {
      query += ` AND user_id = $${params.length + 1}`;
      params.push(filters.userId);
    }

    if (filters.branchId) {
      query += ` AND branch_id = $${params.length + 1}`;
      params.push(filters.branchId);
    }

    if (filters.status) {
      query += ` AND status = $${params.length + 1}`;
      params.push(filters.status);
    }

    query += ' ORDER BY tanggal DESC';

    const result = await pool.query(query, params);
    return result.rows;
  } catch (error) {
    throw error;
  }
};

export const getUserBalance = async (userId) => {
  try {
    const commissionsResult = await pool.query(
      'SELECT SUM(commission_amount) as total_komisi FROM commissions WHERE user_id = $1 AND status = $2',
      [userId, 'paid']
    );

    const totalKomisi = commissionsResult.rows[0]?.total_komisi || 0;

    const mutationsResult = await pool.query(
      `SELECT SUM(CASE WHEN tipe = 'masuk' THEN nominal ELSE -nominal END) as net_mutations
       FROM commission_mutations
       WHERE user_id = $1`,
      [userId]
    );

    const totalMutations = mutationsResult.rows[0]?.net_mutations || 0;

    return {
      totalCommissions: totalKomisi,
      totalMutations: totalMutations,
      availableBalance: totalKomisi + totalMutations,
    };
  } catch (error) {
    throw error;
  }
};

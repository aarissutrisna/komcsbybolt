import pool from '../config/database.js';

export const calculateCommissionByDate = async (branchId, tanggal) => {
  try {
    const omzetResult = await pool.query(
      'SELECT * FROM omzet WHERE branch_id = $1 AND date = $2',
      [branchId, tanggal]
    );

    if (omzetResult.rows.length === 0) {
      return { success: false, message: 'No omzet data found for this date' };
    }

    const omzetData = omzetResult.rows[0];
    const branchResult = await pool.query(
      'SELECT target_min, target_max FROM branches WHERE id = $1',
      [branchId]
    );

    if (branchResult.rows.length === 0) {
      throw new Error('Branch not found');
    }

    const branch = branchResult.rows[0];
    const omzetTotal = omzetData.amount || 0;
    let komisiPersen = 0;

    if (omzetTotal >= branch.target_max) {
      komisiPersen = 0.4;
    } else if (omzetTotal >= branch.target_min) {
      komisiPersen = 0.2;
    }

    const csResult = await pool.query(
      'SELECT id, faktor_pengali FROM users WHERE branch_id = $1 AND role = $2',
      [branchId, 'cs']
    );

    const attendanceResult = await pool.query(
      'SELECT user_id, status_kehadiran FROM attendance_data WHERE branch_id = $1 AND tanggal = $2',
      [branchId, tanggal]
    );

    const commissionData = csResult.rows.map((cs) => {
      const attendance = attendanceResult.rows.find((a) => a.user_id === cs.id);
      const status = attendance?.status_kehadiran || 'alpha';

      let statusMultiplier = 0;
      if (status === 'hadir') statusMultiplier = 1;
      else if (status === 'setengah' || status === 'izin') statusMultiplier = 0.5;

      const komisiNominal = omzetTotal * (komisiPersen / 100);
      const totalKomisi = komisiNominal * (cs.faktor_pengali || 0) * statusMultiplier;

      return {
        user_id: cs.id,
        branch_id: branchId,
        tanggal: tanggal,
        omzet: omzetTotal,
        attendance_status: status,
        faktor_pengali: cs.faktor_pengali || 0,
        komisi_persen: komisiPersen,
        komisi_nominal: komisiNominal,
        total_komisi: totalKomisi,
      };
    });

    if (commissionData.length > 0) {
      for (const commission of commissionData) {
        await pool.query(
          `INSERT INTO commissions (user_id, branch_id, omzet_total, commission_amount, commission_percentage, period_start, period_end)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (user_id, period_start) DO UPDATE SET
           commission_amount = $4, commission_percentage = $5`,
          [
            commission.user_id,
            commission.branch_id,
            commission.omzet,
            commission.total_komisi,
            commission.komisi_persen,
            commission.tanggal,
            commission.tanggal,
          ]
        );
      }
    }

    return {
      success: true,
      message: `Calculated commissions for ${commissionData.length} CS users`,
      omzet: omzetTotal,
      komisiPersen: komisiPersen,
      commissions: commissionData,
    };
  } catch (error) {
    throw error;
  }
};

export const calculateCommissionByBranch = async (branchId, periodStart, periodEnd) => {
  try {
    const omzetResult = await pool.query(
      'SELECT DISTINCT date FROM omzet WHERE branch_id = $1 AND date >= $2 AND date <= $3',
      [branchId, periodStart, periodEnd]
    );

    const results = [];
    for (const row of omzetResult.rows) {
      const result = await calculateCommissionByDate(branchId, row.date);
      results.push(result);
    }

    return {
      success: true,
      message: `Calculated commissions for branch ${branchId}`,
      dates_processed: results.length,
      results: results,
    };
  } catch (error) {
    throw error;
  }
};

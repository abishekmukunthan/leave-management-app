import pool from "./db.js";

/**
 * Ensures data integrity for Priyadharshini and decoupled in-charge/membership relationships:
 * - Role: employee
 * - Member of: Executive Team
 * - Team In-charge of: EMR Engineering
 * - EMR leave approval permission active
 */
export async function runDataRepairs() {
  try {
    // 1. Locate Priyadharshini
    const userRes = await pool.query(
      "SELECT id, name, email, role, team_id FROM users WHERE name ILIKE '%Priyadharshini%' OR email ILIKE '%priya%dharshini%' OR username ILIKE '%priyadharshini%'"
    );
    if (userRes.rows.length === 0) {
      return;
    }
    const priya = userRes.rows[0];

    // 2. Locate EMR Engineering team
    const emrRes = await pool.query(
      "SELECT id, name, team_admin_id FROM teams WHERE name ILIKE '%EMR Engineering%' OR name ILIKE '%EMR%'"
    );

    // 3. Locate Executive Team
    const execRes = await pool.query(
      "SELECT id, name FROM teams WHERE name ILIKE '%Executive Team%' OR name ILIKE '%Executive%'"
    );

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Ensure Priyadharshini role is employee
      if (priya.role !== "employee") {
        await client.query(
          "UPDATE users SET role = 'employee', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
          [priya.id]
        );
      }

      // If EMR Engineering exists, set Priyadharshini as its Team In-charge
      if (emrRes.rows.length > 0) {
        const emrTeam = emrRes.rows[0];
        if (emrTeam.team_admin_id !== priya.id) {
          await client.query(
            "UPDATE teams SET team_admin_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
            [priya.id, emrTeam.id]
          );
        }

        // Ensure EMR approval permission is granted
        const permRes = await client.query(
          "SELECT permission_id FROM team_approval_permissions WHERE team_id = $1",
          [emrTeam.id]
        );
        let permId = permRes.rows[0]?.permission_id;
        if (!permId) {
          permId = "EMR_ENGINEERING_TEAM_LEAVE_APPROVAL_PERMISSION";
          await client.query(
            `INSERT INTO permissions (id, description, permission_type, is_active)
             VALUES ($1, 'Approve leaves for EMR Engineering', 'LEAVE_APPROVAL', true)
             ON CONFLICT (id) DO NOTHING`,
            [permId]
          );
          await client.query(
            `INSERT INTO team_approval_permissions (team_id, permission_id)
             VALUES ($1, $2)
             ON CONFLICT (team_id) DO UPDATE SET permission_id = EXCLUDED.permission_id`,
            [emrTeam.id, permId]
          );
        }
        await client.query(
          `INSERT INTO user_permissions (user_id, permission_id, assigned_by, assigned_at)
           VALUES ($1, $2, $1, NOW())
           ON CONFLICT (user_id, permission_id) DO NOTHING`,
          [priya.id, permId]
        );
      }

      // If Executive Team exists, ensure Priyadharshini's home membership is Executive Team
      if (execRes.rows.length > 0) {
        const execTeam = execRes.rows[0];
        await client.query(
          "UPDATE users SET team_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
          [execTeam.id, priya.id]
        );
        await client.query(
          "UPDATE employee_profiles SET team = $1, department = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2",
          [execTeam.name, priya.id]
        );
        console.log(`[DataRepair] Priyadharshini assigned to ${execTeam.name} with In-charge of EMR Engineering.`);
      }

      await client.query("COMMIT");
    } catch (innerErr) {
      await client.query("ROLLBACK");
      console.error("[DataRepair] Transaction error during data repairs:", innerErr.message);
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("[DataRepair] Non-fatal error during data repairs:", err.message);
  }
}

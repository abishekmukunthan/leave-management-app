-- ============================================================================
-- IDEMPOTENT MIGRATION: Fix Priyadharshini Team Membership & In-Charge Status
-- ============================================================================
-- Expected State:
-- 1. Priyadharshini's home team membership (users.team_id) -> Executive Team
-- 2. Priyadharshini's role -> 'employee'
-- 3. EMR Engineering team in-charge (teams.team_admin_id) -> Priyadharshini
-- 4. Priyadharshini retains EMR Engineering leave approval permission
-- ============================================================================

DO $$
DECLARE
  v_priya_id UUID;
  v_exec_team_id UUID;
  v_emr_team_id UUID;
  v_emr_perm_id VARCHAR;
BEGIN
  -- 1. Locate Priyadharshini
  SELECT id INTO v_priya_id 
  FROM users 
  WHERE name ILIKE '%Priyadharshini%' OR email ILIKE '%priyadharshini%' 
  LIMIT 1;

  -- 2. Locate Executive Team and EMR Engineering
  SELECT id INTO v_exec_team_id FROM teams WHERE name ILIKE '%Executive%' LIMIT 1;
  SELECT id INTO v_emr_team_id FROM teams WHERE name ILIKE '%EMR%' LIMIT 1;

  IF v_priya_id IS NOT NULL THEN
    -- A. Ensure role is employee
    UPDATE users 
    SET role = 'employee', updated_at = CURRENT_TIMESTAMP 
    WHERE id = v_priya_id;

    -- B. Set team membership to Executive Team (if Executive Team exists)
    IF v_exec_team_id IS NOT NULL THEN
      UPDATE users 
      SET team_id = v_exec_team_id, updated_at = CURRENT_TIMESTAMP 
      WHERE id = v_priya_id;

      UPDATE employee_profiles 
      SET team = 'Executive Team', department = 'Executive Team', updated_at = CURRENT_TIMESTAMP 
      WHERE user_id = v_priya_id;
    END IF;

    -- C. Ensure EMR Engineering has Priyadharshini as Team In-charge
    IF v_emr_team_id IS NOT NULL THEN
      UPDATE teams 
      SET team_admin_id = v_priya_id, updated_at = CURRENT_TIMESTAMP 
      WHERE id = v_emr_team_id;

      -- Ensure approval permission is mapped and granted
      SELECT permission_id INTO v_emr_perm_id 
      FROM team_approval_permissions 
      WHERE team_id = v_emr_team_id;

      IF v_emr_perm_id IS NOT NULL THEN
        INSERT INTO user_permissions (user_id, permission_id, assigned_by, assigned_at)
        VALUES (v_priya_id, v_emr_perm_id, v_priya_id, NOW())
        ON CONFLICT (user_id, permission_id) DO NOTHING;
      END IF;
    END IF;
  END IF;
END $$;

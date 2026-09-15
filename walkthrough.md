# Superior Admin Team Membership & Assignment Support

Updated team membership rules and user management so that Superior Admin users can optionally belong to a normal organizational team (e.g. "Executive Team") while strictly preserving their global Superior Admin role, permissions, and administrative privileges.

---

## 1. Summary of Changes

### Backend

1. **Candidate Search Filter (`superiorDao.searchTeamMemberCandidates`)**:
   - Removed `AND u.role != 'superior_admin'` from candidate query. Active Superior Admin accounts (like Nadia Perera or any second Superior Admin) now appear in the **Add Members** candidate list.
   - Preserves candidate metadata (`role = 'superior_admin'`, `current_team_id`, `requires_move_confirmation`).

2. **Add / Move Team Member (`superiorDao.addOrMoveTeamMember`)**:
   - Removed the restriction blocking `superior_admin` users from being added or moved to a team.
   - Adding or moving updates `users.team_id` and synchronizes `employee_profiles.team`.
   - The user's role remains strictly `superior_admin`, preserving global admin rights and permission access.

3. **Remove Team Member (`superiorDao.removeMemberFromTeam`)**:
   - Removes team assignment by setting `users.team_id = NULL` and resets `employee_profiles.team = 'Executive Management'` for Superior Admins.

4. **Create Team Initial Members (`superiorDao.createTeam` & `superiorDao.getUnassignedEmployees`)**:
   - Removed the restriction rejecting `superior_admin` as initial team members.
   - Updated `getUnassignedEmployees` to include active `superior_admin` users whose `team_id IS NULL`.

5. **User Creation & Editing (`superiorController.js` & `superiorDao.js`)**:
   - In `superiorController.createUser`: Changed `team_id: role === "superior_admin" ? null : team_id` to `team_id: team_id || null`.
   - In `superiorDao.createUser`: Team assignment is now optional for all users including Superior Admins. When a team is selected, `teamName` is fetched and saved to the profile. Global permissions are granted to newly created Superior Admins.
   - In `superiorController.editUser` and `superiorDao.editUser`: Added support for `team_id`. Superior Admin accounts can have their team assigned, moved, or unassigned via the Edit User modal.

### Frontend

1. **Configuration Page (`frontend/src/pages/ConfigurationPage.jsx`)**:
   - In **Team Edit → Team Members**: Displays a dedicated `Superior Admin` badge when a team member has `role === "superior_admin"`.
   - In **Team Edit → Add Members Search Dropdown**: Displays a distinct `Superior Admin` badge next to the user's name/email.
   - In **Create Team → Initial Members**: Displays `Superior Admin` badge for eligible unassigned candidates.

2. **User Management Page (`frontend/src/pages/UserManagementPage.jsx`)**:
   - In **Create User Modal**: Removed the check hiding the Assigned Team dropdown for Superior Admin. Assigned Team is now available and optional for Superior Admin (None / Executive Team / any active team). Added an informative note clarifying that Superior Admin retains full system administrative authority regardless of team assignment.
   - In **Edit User Modal**: Replaced the disabled `"No Team (System Admin)"` text field with an active **Assigned Team** dropdown selector, allowing Superior Admin accounts to be assigned or reassigned to any active team directly.
   - In **User Management Table**: The team column displays the assigned team badge/dot for Superior Admins when assigned to a team (e.g. Executive Team).

3. **Leave Workflow Integrity**:
   - Self-approval protection remains strictly enforced in `adminController.js`: `String(approved_by) === String(leave.employee_id)` blocks self-approval.
   - Another Superior Admin or authorized approver can approve leaves.

---

## 2. Test Verification

### Backend Tests
- `npm test`: **19 test suites passed, 145 / 145 tests passed**
  - `superiorAdminTeamMembership.test.js` (NEW):
    - Confirmed candidate search includes active Superior Admins.
    - Confirmed adding a Superior Admin to Executive Team preserves `role: "superior_admin"` and updates `team_id`.
    - Confirmed moving a Superior Admin between teams with confirmation flow preserves role and privileges.
    - Confirmed editing Superior Admin's team updates `team_id` and `team_name`.
    - Confirmed self-approval block (`403`) remains enforced for Superior Admin.
    - Confirmed another Superior Admin can approve leave requests.
  - `superiorAdminSafety.test.js`: Verified optional `team_id` handling.
  - `teamMemberManagement.test.js`: Verified adding Superior Admin to teams.

### Frontend Tests & Build
- `npm test`: **9 test suites passed, 47 / 47 tests passed**
  - Updated `UserManagementActions.test.jsx` to verify optional team select for Superior Admin in Create User modal.
- `npm run lint`: **0 errors** (4 existing warnings in other files).
- `npm run build`: Production build succeeded (`dist/` generated with zero errors).

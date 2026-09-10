import { useState, useEffect, useCallback } from "react";
import {
  Users,
  Plus,
  Edit2,
  X,
  RefreshCw,
  Check,
  AlertCircle,
  Clock,
  Layers,
  Save,
  CheckCircle2,
  Power,
  Shield,
  Sparkles,
  Key,
  Award,
  UserMinus,
  AlertTriangle,
  Search,
  ArrowRightLeft,
  Trash2,
  Info,
} from "lucide-react";
import { useLeave } from "../context/useLeave";
import {
  getSuperiorTeams,
  createSuperiorTeam,
  updateSuperiorTeam,
  deactivateTeam,
  activateTeam,
  getSuperiorLeaveTypes,
  createSuperiorLeaveType,
  updateSuperiorLeaveType,
  deactivateSuperiorLeaveType,
  getSuperiorUsers,
  getSuperiorUserLeaveEntitlements,
  updateSuperiorUserLeaveEntitlements,
  getSuperiorPermissions,
  createSuperiorPermission,
  updateSuperiorPermission,
  generateTeamPermissions,
  updateTeamApprovalPermission,
  assignTeamLead,
  removeTeamLead,
  getUnassignedEmployees,
  getTeamMembers,
  getTeamMemberCandidates,
  addOrMoveTeamMember,
  removeTeamMember,
  getTeamInchargeCandidates,
} from "../services/api";

const getTeamColor = (teamName) => {
  if (!teamName) return "#64748B";
  const name = teamName.toLowerCase();
  if (name.includes("eng")) return "#4F46E5";
  if (name.includes("sale")) return "#F59E0B";
  if (name.includes("mark")) return "#EC4899";
  if (name.includes("hr") || name.includes("human")) return "#06B6D4";
  return "#6366F1";
};

export const ConfigurationPage = () => {
  const { showToast, loggedInUser } = useLeave();

  // Navigation Tab State: 'teams' | 'leave-types' | 'quotas' | 'permissions'
  const [activeTab, setActiveTab] = useState("teams");

  // General Loading & Error States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Teams State
  const [teams, setTeams] = useState([]);

  // Create Team Modal State (with Initial Team Members)
  const [createTeamModalOpen, setCreateTeamModalOpen] = useState(false);
  const [createTeamForm, setCreateTeamForm] = useState({ name: "", team_admin_id: "" });
  const [createTeamError, setCreateTeamError] = useState("");
  const [submittingCreateTeam, setSubmittingCreateTeam] = useState(false);
  const [selectedInitialMembers, setSelectedInitialMembers] = useState([]);
  const [unassignedList, setUnassignedList] = useState([]);
  const [unassignedSearch, setUnassignedSearch] = useState("");
  const [unassignedLoading, setUnassignedLoading] = useState(false);
  const [inchargeCandidates, setInchargeCandidates] = useState([]);

  // Edit Team Modal State (3 Sections: Details, Lead, Members)
  const [editTeamModalOpen, setEditTeamModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [editTeamName, setEditTeamName] = useState("");
  const [savingTeamName, setSavingTeamName] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loadingTeamMembers, setLoadingTeamMembers] = useState(false);
  const [candidateSearch, setCandidateSearch] = useState("");
  const [candidateList, setCandidateList] = useState([]);
  const [candidateLoading, setCandidateLoading] = useState(false);
  const [addingMemberId, setAddingMemberId] = useState(null);

  // Remove Member Confirmation Modal State
  const [removeMemberModal, setRemoveMemberModal] = useState({
    isOpen: false,
    member: null,
    team: null,
    isSubmitting: false,
    error: "",
  });

  // Move Member Confirmation Modal State
  const [moveMemberModal, setMoveMemberModal] = useState({
    isOpen: false,
    candidate: null,
    team: null,
    isSubmitting: false,
    error: "",
  });

  // Assign / Change Team Lead Modal State
  const [assignLeadModal, setAssignLeadModal] = useState({
    isOpen: false,
    team: null,
    selectedUserId: "",
    removePreviousLeadPermission: true,
    isSubmitting: false,
    error: "",
  });

  // Remove Team Lead Confirmation Modal State
  const [removeLeadModal, setRemoveLeadModal] = useState({
    isOpen: false,
    team: null,
    isSubmitting: false,
    error: "",
  });

  // Activate / Deactivate Team Modal States
  const [activateTeamTarget, setActivateTeamTarget] = useState(null);
  const [activatingTeam, setActivatingTeam] = useState(false);
  const [deactivateTeamTarget, setDeactivateTeamTarget] = useState(null);
  const [deactivatingTeam, setDeactivatingTeam] = useState(false);

  // Leave Types State
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [ltModalOpen, setLtModalOpen] = useState(false);
  const [editingLt, setEditingLt] = useState(null);
  const [ltForm, setLtForm] = useState({
    name: "",
    code: "",
    unit: "days",
    default_quota: 5,
    requires_substitute: true,
  });
  const [ltFormError, setLtFormError] = useState("");
  const [submittingLt, setSubmittingLt] = useState(false);

  // Quotas / Entitlements State
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedUserObj, setSelectedUserObj] = useState(null);
  const [entitlements, setEntitlements] = useState([]);
  const [quotasLoading, setQuotasLoading] = useState(false);
  const [savingQuotas, setSavingQuotas] = useState(false);

  // Permissions State
  const [permissions, setPermissions] = useState([]);
  const [permModalOpen, setPermModalOpen] = useState(false);
  const [editingPerm, setEditingPerm] = useState(null);
  const [permForm, setPermForm] = useState({
    id: "",
    description: "",
    permission_type: "LEAVE_APPROVAL",
    is_active: true,
  });
  const [permFormError, setPermFormError] = useState("");
  const [submittingPerm, setSubmittingPerm] = useState(false);
  const [generatingPerms, setGeneratingPerms] = useState(false);

  // Configure Team Permission Modal State
  const [teamPermModalOpen, setTeamPermModalOpen] = useState(false);
  const [configuringTeam, setConfiguringTeam] = useState(null);
  const [selectedTeamPermId, setSelectedTeamPermId] = useState("");
  const [savingTeamPerm, setSavingTeamPerm] = useState(false);

  // Load All Configuration Data
  const loadAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tRes, ltRes, uRes, pRes] = await Promise.all([
        getSuperiorTeams(),
        getSuperiorLeaveTypes(),
        getSuperiorUsers(),
        getSuperiorPermissions(),
      ]);
      setTeams(tRes.teams || []);
      setLeaveTypes(ltRes.leaveTypes || []);
      setAllUsers(uRes.users || []);
      setPermissions(pRes.data || []);
    } catch (err) {
      console.error("Error loading config data:", err);
      setError(err.message || "Failed to load configuration data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      getSuperiorTeams(),
      getSuperiorLeaveTypes(),
      getSuperiorUsers(),
      getSuperiorPermissions(),
    ])
      .then(([tRes, ltRes, uRes, pRes]) => {
        if (isMounted) {
          setTeams(tRes.teams || []);
          setLeaveTypes(ltRes.leaveTypes || []);
          setAllUsers(uRes.users || []);
          setPermissions(pRes.data || []);
        }
      })
      .catch((err) => {
        if (isMounted) setError(err.message || "Failed to load configuration data");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Handle Fetching Employee Entitlements when Selected User Changes
  useEffect(() => {
    let isMounted = true;
    if (!selectedUserId) {
      return;
    }
    getSuperiorUserLeaveEntitlements(selectedUserId)
      .then((res) => {
        if (isMounted) {
          setSelectedUserObj(res.employee || null);
          setEntitlements(res.entitlements || []);
        }
      })
      .catch((err) => {
        if (isMounted) showToast(err.message || "Failed to load user leave quotas", "warning");
      })
      .finally(() => {
        if (isMounted) setQuotasLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [selectedUserId, showToast]);

  // Handle User Change in Quotas Tab
  const handleSelectUserForQuotas = (userId) => {
    setSelectedUserId(userId);
    if (!userId) {
      setSelectedUserObj(null);
      setEntitlements([]);
    } else {
      setQuotasLoading(true);
    }
  };

  // =========================================================================
  // TEAM HANDLERS (CREATE TEAM WITH INITIAL MEMBERS & EDIT TEAM WITH MEMBERS)
  // =========================================================================
  const handleOpenAddTeam = async () => {
    setCreateTeamForm({ name: "", team_admin_id: "" });
    setCreateTeamError("");
    setSelectedInitialMembers([]);
    setUnassignedSearch("");
    setCreateTeamModalOpen(true);
    try {
      setUnassignedLoading(true);
      const [res, inchargeRes] = await Promise.all([
        getUnassignedEmployees(""),
        getTeamInchargeCandidates("", "").catch(() => ({ candidates: [] })),
      ]);
      setUnassignedList(res.data || []);
      setInchargeCandidates(inchargeRes.candidates || []);
    } catch (err) {
      console.error("Error fetching unassigned employees or in-charge candidates:", err);
    } finally {
      setUnassignedLoading(false);
    }
  };

  const handleSearchUnassigned = async (val) => {
    setUnassignedSearch(val);
    try {
      setUnassignedLoading(true);
      const res = await getUnassignedEmployees(val);
      setUnassignedList(res.data || []);
    } catch (err) {
      console.error("Error searching unassigned employees:", err);
    } finally {
      setUnassignedLoading(false);
    }
  };

  const handleSelectInitialMember = (emp) => {
    if (!selectedInitialMembers.some((m) => m.id === emp.id)) {
      setSelectedInitialMembers((prev) => [...prev, emp]);
    }
  };

  const handleRemoveInitialMember = (empId) => {
    setSelectedInitialMembers((prev) => prev.filter((m) => m.id !== empId));
  };

  const handleCreateTeamSubmit = async (e) => {
    e.preventDefault();
    setCreateTeamError("");

    if (!createTeamForm.name.trim()) {
      setCreateTeamError("Team Name is required.");
      return;
    }

    setSubmittingCreateTeam(true);
    try {
      await createSuperiorTeam({
        name: createTeamForm.name.trim(),
        team_admin_id: createTeamForm.team_admin_id || null,
        initial_member_ids: selectedInitialMembers.map((m) => m.id),
        superior_admin_id: loggedInUser?.id,
      });
      showToast(`Team "${createTeamForm.name.trim()}" created successfully!`, "success");
      setCreateTeamModalOpen(false);
      loadAllData();
    } catch (err) {
      console.error("Error creating team:", err);
      setCreateTeamError(err.message || "Failed to create team");
    } finally {
      setSubmittingCreateTeam(false);
    }
  };

  const handleOpenEditTeam = async (team) => {
    setEditingTeam(team);
    setEditTeamName(team.name || "");
    setTeamMembers([]);
    setLoadingTeamMembers(true);
    setCandidateSearch("");
    setCandidateList([]);
    setEditTeamModalOpen(true);

    try {
      const [membersRes, candRes] = await Promise.all([
        getTeamMembers(team.id),
        getTeamMemberCandidates(team.id, ""),
      ]);
      setTeamMembers(membersRes.members || []);
      setCandidateList(candRes.data || []);
      setEditingTeam((prev) => ({
        ...prev,
        ...membersRes.team,
        member_count: membersRes.count,
        total_members: membersRes.count,
      }));
    } catch (err) {
      console.error("Error loading team members:", err);
      showToast(err.message || "Failed to load team members", "warning");
    } finally {
      setLoadingTeamMembers(false);
    }
  };

  const handleSaveTeamName = async () => {
    if (!editTeamName.trim()) {
      showToast("Team Name is required.", "warning");
      return;
    }
    setSavingTeamName(true);
    try {
      await updateSuperiorTeam(editingTeam.id, {
        name: editTeamName.trim(),
      });
      showToast(`Team name updated to "${editTeamName.trim()}"!`, "success");
      setEditingTeam((prev) => ({ ...prev, name: editTeamName.trim() }));
      loadAllData();
    } catch (err) {
      console.error("Error updating team name:", err);
      showToast(err.message || "Failed to update team name", "warning");
    } finally {
      setSavingTeamName(false);
    }
  };

  const handleSearchCandidates = async (val) => {
    setCandidateSearch(val);
    if (!editingTeam) return;
    try {
      setCandidateLoading(true);
      const res = await getTeamMemberCandidates(editingTeam.id, val);
      setCandidateList(res.data || []);
    } catch (err) {
      console.error("Error searching candidates:", err);
    } finally {
      setCandidateLoading(false);
    }
  };

  const handleAddMemberClick = (candidate) => {
    if (candidate.is_already_member) {
      showToast("User is already a member of this team.", "info");
      return;
    }
    if (candidate.requires_move_confirmation) {
      setMoveMemberModal({
        isOpen: true,
        candidate,
        team: editingTeam,
        isSubmitting: false,
        error: "",
      });
    } else {
      handleAddMemberDirect(candidate);
    }
  };

  const handleAddMemberDirect = async (candidate) => {
    setAddingMemberId(candidate.id);
    try {
      const res = await addOrMoveTeamMember(editingTeam.id, candidate.id, {
        superior_admin_id: loggedInUser?.id,
        confirm_move: false,
      });
      showToast(res.message || `Successfully added ${candidate.name}!`, "success");
      const [membersRes, candRes] = await Promise.all([
        getTeamMembers(editingTeam.id),
        getTeamMemberCandidates(editingTeam.id, candidateSearch),
      ]);
      setTeamMembers(membersRes.members || []);
      setCandidateList(candRes.data || []);
      setEditingTeam((prev) => ({
        ...prev,
        member_count: membersRes.count,
        total_members: membersRes.count,
      }));
      loadAllData();
    } catch (err) {
      console.error("Error adding member:", err);
      if (err.requiresConfirmation) {
        setMoveMemberModal({
          isOpen: true,
          candidate,
          team: editingTeam,
          isSubmitting: false,
          error: "",
        });
      } else {
        showToast(err.message || "Failed to add member", "warning");
      }
    } finally {
      setAddingMemberId(null);
    }
  };

  const handleConfirmMoveMember = async () => {
    if (!moveMemberModal.candidate || !moveMemberModal.team) return;
    setMoveMemberModal((prev) => ({ ...prev, isSubmitting: true, error: "" }));
    try {
      const res = await addOrMoveTeamMember(
        moveMemberModal.team.id,
        moveMemberModal.candidate.id,
        {
          superior_admin_id: loggedInUser?.id,
          confirm_move: true,
        }
      );
      showToast(res.message || `Moved ${moveMemberModal.candidate.name} successfully!`, "success");
      setMoveMemberModal({ isOpen: false, candidate: null, team: null, isSubmitting: false, error: "" });
      const [membersRes, candRes] = await Promise.all([
        getTeamMembers(editingTeam.id),
        getTeamMemberCandidates(editingTeam.id, candidateSearch),
      ]);
      setTeamMembers(membersRes.members || []);
      setCandidateList(candRes.data || []);
      setEditingTeam((prev) => ({
        ...prev,
        member_count: membersRes.count,
        total_members: membersRes.count,
      }));
      loadAllData();
    } catch (err) {
      console.error("Error moving member:", err);
      setMoveMemberModal((prev) => ({
        ...prev,
        isSubmitting: false,
        error: err.message || "Failed to move member",
      }));
    }
  };

  const handleOpenRemoveMember = (member) => {
    if (member.is_team_lead || String(member.id) === String(editingTeam?.team_admin_id)) {
      showToast(
        "This user is the current Team Lead. Please remove or change the Team Lead before removing this user from the team.",
        "warning"
      );
      return;
    }
    setRemoveMemberModal({
      isOpen: true,
      member,
      team: editingTeam,
      isSubmitting: false,
      error: "",
    });
  };

  const handleConfirmRemoveMember = async () => {
    if (!removeMemberModal.member || !removeMemberModal.team) return;
    setRemoveMemberModal((prev) => ({ ...prev, isSubmitting: true, error: "" }));
    try {
      const res = await removeTeamMember(
        removeMemberModal.team.id,
        removeMemberModal.member.id,
        {
          superior_admin_id: loggedInUser?.id,
        }
      );
      showToast(res.message || "Team member removed successfully.", "info");
      setRemoveMemberModal({ isOpen: false, member: null, team: null, isSubmitting: false, error: "" });
      const [membersRes, candRes] = await Promise.all([
        getTeamMembers(editingTeam.id),
        getTeamMemberCandidates(editingTeam.id, candidateSearch),
      ]);
      setTeamMembers(membersRes.members || []);
      setCandidateList(candRes.data || []);
      setEditingTeam((prev) => ({
        ...prev,
        member_count: membersRes.count,
        total_members: membersRes.count,
      }));
      loadAllData();
    } catch (err) {
      console.error("Error removing member:", err);
      setRemoveMemberModal((prev) => ({
        ...prev,
        isSubmitting: false,
        error: err.message || "Failed to remove member",
      }));
    }
  };

  const handleConfirmActivateTeam = async () => {
    if (!activateTeamTarget) return;
    setActivatingTeam(true);
    try {
      await activateTeam(activateTeamTarget.id, loggedInUser?.id);
      showToast("Team activated successfully.", "success");
      setActivateTeamTarget(null);
      loadAllData();
    } catch (err) {
      console.error("Error activating team:", err);
      showToast(err.message || "Failed to activate team", "warning");
    } finally {
      setActivatingTeam(false);
    }
  };

  const handleConfirmDeactivateTeam = async () => {
    if (!deactivateTeamTarget) return;
    setDeactivatingTeam(true);
    try {
      await deactivateTeam(deactivateTeamTarget.id, loggedInUser?.id);
      showToast("Team deactivated successfully.", "success");
      setDeactivateTeamTarget(null);
      loadAllData();
    } catch (err) {
      console.error("Error deactivating team:", err);
      showToast(err.message || "Failed to deactivate team", "warning");
    } finally {
      setDeactivatingTeam(false);
    }
  };

  // Team In-charge Assignment Handlers
  const handleOpenAssignLead = async (team) => {
    setAssignLeadModal({
      isOpen: true,
      team,
      selectedUserId: team.team_admin_id || "",
      removePreviousLeadPermission: true,
      isSubmitting: false,
      error: "",
    });
    try {
      const res = await getTeamInchargeCandidates(team.id, "");
      setInchargeCandidates(res.candidates || []);
    } catch (err) {
      console.error("Error fetching in-charge candidates:", err);
    }
  };

  const handleConfirmAssignLead = async (e) => {
    e.preventDefault();
    if (!assignLeadModal.team) return;
    if (!assignLeadModal.selectedUserId) {
      setAssignLeadModal((prev) => ({ ...prev, error: "Please select a user to assign as Team In-charge." }));
      return;
    }
    setAssignLeadModal((prev) => ({ ...prev, isSubmitting: true, error: "" }));
    try {
      await assignTeamLead(assignLeadModal.team.id, {
        user_id: assignLeadModal.selectedUserId,
        remove_previous_lead_permission: assignLeadModal.removePreviousLeadPermission,
      });
      showToast(`Team In-charge assigned successfully for ${assignLeadModal.team.name}!`, "success");
      setAssignLeadModal({
        isOpen: false,
        team: null,
        selectedUserId: "",
        removePreviousLeadPermission: true,
        isSubmitting: false,
        error: "",
      });
      loadAllData();
    } catch (err) {
      console.error("Error assigning team in-charge:", err);
      setAssignLeadModal((prev) => ({ ...prev, error: err.message || "Failed to assign team in-charge.", isSubmitting: false }));
    }
  };

  const handleOpenRemoveLead = (team) => {
    setRemoveLeadModal({
      isOpen: true,
      team,
      isSubmitting: false,
      error: "",
    });
  };

  const handleConfirmRemoveLead = async (e) => {
    e.preventDefault();
    if (!removeLeadModal.team) return;
    setRemoveLeadModal((prev) => ({ ...prev, isSubmitting: true, error: "" }));
    try {
      await removeTeamLead(removeLeadModal.team.id);
      showToast(`Team In-charge removed from ${removeLeadModal.team.name}. Permissions revoked.`, "info");
      setRemoveLeadModal({
        isOpen: false,
        team: null,
        isSubmitting: false,
        error: "",
      });
      loadAllData();
    } catch (err) {
      console.error("Error removing team in-charge:", err);
      setRemoveLeadModal((prev) => ({ ...prev, error: err.message || "Failed to remove team in-charge.", isSubmitting: false }));
    }
  };

  // =========================================================================
  // LEAVE TYPE HANDLERS
  // =========================================================================
  const handleOpenAddLt = () => {
    setEditingLt(null);
    setLtForm({
      name: "",
      code: "",
      unit: "days",
      default_quota: 5,
      requires_substitute: true,
    });
    setLtFormError("");
    setLtModalOpen(true);
  };

  const handleOpenEditLt = (lt) => {
    setEditingLt(lt);
    setLtForm({
      name: lt.name || "",
      code: lt.code || "",
      unit: lt.unit || "days",
      default_quota: parseFloat(lt.default_quota) || 0,
      requires_substitute: lt.requires_substitute !== false,
    });
    setLtFormError("");
    setLtModalOpen(true);
  };

  const handleLtFormSubmit = async (e) => {
    e.preventDefault();
    setLtFormError("");

    if (!ltForm.name.trim()) {
      setLtFormError("Leave Type Name is required.");
      return;
    }
    if (!ltForm.code.trim()) {
      setLtFormError("System Code is required.");
      return;
    }

    setSubmittingLt(true);
    try {
      if (editingLt) {
        await updateSuperiorLeaveType(editingLt.id, {
          name: ltForm.name.trim(),
          code: ltForm.code.trim().toUpperCase(),
          unit: ltForm.unit,
          default_quota: parseFloat(ltForm.default_quota) || 0,
          requires_substitute: Boolean(ltForm.requires_substitute),
        });
        showToast(`Leave Type "${ltForm.name}" updated successfully!`, "success");
      } else {
        await createSuperiorLeaveType({
          name: ltForm.name.trim(),
          code: ltForm.code.trim().toUpperCase(),
          unit: ltForm.unit,
          default_quota: parseFloat(ltForm.default_quota) || 0,
          requires_substitute: Boolean(ltForm.requires_substitute),
        });
        showToast(`Leave Type "${ltForm.name}" created successfully!`, "success");
      }
      setLtModalOpen(false);
      loadAllData();
    } catch (err) {
      console.error("Error submitting leave type:", err);
      setLtFormError(err.message || "Failed to save leave type");
    } finally {
      setSubmittingLt(false);
    }
  };

  const handleDeactivateLt = async (lt) => {
    if (!window.confirm(`Are you sure you want to deactivate the "${lt.name}" leave type?`)) {
      return;
    }
    try {
      await deactivateSuperiorLeaveType(lt.id);
      showToast(`Leave type "${lt.name}" deactivated.`, "info");
      loadAllData();
    } catch (err) {
      console.error("Error deactivating leave type:", err);
      showToast(err.message || "Failed to deactivate leave type", "warning");
    }
  };

  // =========================================================================
  // QUOTA / ENTITLEMENT HANDLERS
  // =========================================================================
  const handleAllocatedChange = (leaveTypeId, val) => {
    const parsedVal = parseFloat(val);
    const newAlloc = isNaN(parsedVal) ? 0 : parsedVal;

    setEntitlements((prev) =>
      prev.map((item) => {
        if (item.leave_type_id === leaveTypeId) {
          const usedVal = parseFloat(item.used) || 0;
          const remainingVal = Math.max(0, newAlloc - usedVal);
          return {
            ...item,
            allocated: newAlloc,
            remaining: remainingVal,
          };
        }
        return item;
      })
    );
  };

  const handleSaveQuotas = async () => {
    if (!selectedUserId) return;
    setSavingQuotas(true);

    try {
      const payload = entitlements.map((item) => ({
        leave_type_id: item.leave_type_id,
        allocated: parseFloat(item.allocated) || 0,
      }));

      await updateSuperiorUserLeaveEntitlements(selectedUserId, payload);
      showToast("Employee leave quotas updated successfully!", "success");
      const res = await getSuperiorUserLeaveEntitlements(selectedUserId);
      setEntitlements(res.entitlements || []);
    } catch (err) {
      console.error("Error updating leave quotas:", err);
      showToast(err.message || "Failed to update leave quotas", "warning");
    } finally {
      setSavingQuotas(false);
    }
  };

  // =========================================================================
  // PERMISSION MANAGEMENT HANDLERS
  // =========================================================================
  const handleOpenAddPerm = () => {
    setEditingPerm(null);
    setPermForm({
      id: "",
      description: "",
      permission_type: "LEAVE_APPROVAL",
      is_active: true,
    });
    setPermFormError("");
    setPermModalOpen(true);
  };

  const handleOpenEditPerm = (perm) => {
    setEditingPerm(perm);
    setPermForm({
      id: perm.id,
      description: perm.description || "",
      permission_type: perm.permission_type || "LEAVE_APPROVAL",
      is_active: perm.is_active !== false,
    });
    setPermFormError("");
    setPermModalOpen(true);
  };

  const handlePermFormSubmit = async (e) => {
    e.preventDefault();
    setPermFormError("");

    if (!editingPerm) {
      if (!permForm.id.trim()) {
        setPermFormError("Permission ID is required.");
        return;
      }
      const pattern = /^[A-Z0-9_]+$/;
      if (!pattern.test(permForm.id.trim())) {
        setPermFormError(
          "Permission ID must be uppercase and contain only letters (A-Z), numbers (0-9), and underscores (_)."
        );
        return;
      }
    }

    if (!permForm.description.trim()) {
      setPermFormError("Description is required.");
      return;
    }

    setSubmittingPerm(true);
    try {
      if (editingPerm) {
        await updateSuperiorPermission(editingPerm.id, {
          description: permForm.description.trim(),
          is_active: permForm.is_active,
        });
        showToast(`Permission "${editingPerm.id}" updated successfully!`, "success");
      } else {
        await createSuperiorPermission({
          id: permForm.id.trim(),
          description: permForm.description.trim(),
          permission_type: permForm.permission_type || "LEAVE_APPROVAL",
        });
        showToast(`Permission "${permForm.id.trim()}" created successfully!`, "success");
      }
      setPermModalOpen(false);
      loadAllData();
    } catch (err) {
      console.error("Error saving permission:", err);
      setPermFormError(err.message || "Failed to save permission.");
    } finally {
      setSubmittingPerm(false);
    }
  };

  const handleTogglePermStatus = async (perm) => {
    try {
      const newStatus = !perm.is_active;
      await updateSuperiorPermission(perm.id, {
        description: perm.description,
        is_active: newStatus,
      });
      showToast(
        `Permission "${perm.id}" is now ${newStatus ? "Active" : "Inactive"}.`,
        "success"
      );
      loadAllData();
    } catch (err) {
      console.error("Error toggling permission status:", err);
      showToast(err.message || "Failed to toggle permission status", "warning");
    }
  };

  const handleGenerateTeamPermissions = async () => {
    setGeneratingPerms(true);
    try {
      const res = await generateTeamPermissions(loggedInUser?.id);
      showToast(
        res.message || "Missing team approval permissions generated successfully.",
        "success"
      );
      loadAllData();
    } catch (err) {
      console.error("Error generating team permissions:", err);
      showToast(err.message || "Failed to generate missing permissions", "warning");
    } finally {
      setGeneratingPerms(false);
    }
  };

  const handleOpenConfigureTeamPerm = (team) => {
    setConfiguringTeam(team);
    setSelectedTeamPermId(team.approval_permission_id || (permissions[0]?.id || ""));
    setTeamPermModalOpen(true);
  };

  const handleSaveTeamPermission = async (e) => {
    e.preventDefault();
    if (!configuringTeam || !selectedTeamPermId) return;

    setSavingTeamPerm(true);
    try {
      await updateTeamApprovalPermission(
        configuringTeam.id,
        selectedTeamPermId,
        loggedInUser?.id
      );
      showToast(
        `Leave approval permission for team "${configuringTeam.name}" updated successfully!`,
        "success"
      );
      setTeamPermModalOpen(false);
      loadAllData();
    } catch (err) {
      console.error("Error updating team approval permission:", err);
      showToast(err.message || "Failed to update team approval permission", "warning");
    } finally {
      setSavingTeamPerm(false);
    }
  };

  // Filter team admin candidates from allUsers
  const teamAdminCandidates = allUsers.filter(
    (u) => u.is_active !== false && u.role !== "superior_admin"
  );

  return (
    <div className="admin-page-container">
      {/* Header Row */}
      <div className="admin-header-row">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <h2 className="admin-title">System Configuration</h2>
            <span className="counter-pill pill-blue">Master Controls</span>
          </div>
          <p className="admin-subtitle">
            Manage teams, leave policies, and employee leave quotas.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button
            className="secondary-btn"
            onClick={loadAllData}
            title="Refresh All Configurations"
          >
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Main Tab Switcher */}
      <div className="table-controls-bar">
        <div className="filter-tabs">
          <button
            className={`filter-tab ${activeTab === "teams" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("teams")}
          >
            <Users size={14} style={{ marginRight: "0.35rem" }} />
            Teams ({teams.length})
          </button>
          <button
            className={`filter-tab ${activeTab === "leave-types" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("leave-types")}
          >
            <Clock size={14} style={{ marginRight: "0.35rem" }} />
            Leave Types ({leaveTypes.length})
          </button>
          <button
            className={`filter-tab ${activeTab === "quotas" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("quotas")}
          >
            <Layers size={14} style={{ marginRight: "0.35rem" }} />
            Leave Quotas
          </button>
          <button
            className={`filter-tab ${activeTab === "permissions" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("permissions")}
          >
            <Shield size={14} style={{ marginRight: "0.35rem" }} />
            Permissions ({permissions.length})
          </button>
        </div>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="form-error-alert" style={{ marginBottom: "1.25rem" }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="table-card" style={{ padding: "3rem", textAlign: "center" }}>
          <p style={{ color: "#64748b", fontSize: "0.875rem" }}>
            Loading configuration data...
          </p>
        </div>
      )}

      {/* =========================================================================
          TAB 1: TEAMS MANAGEMENT
         ========================================================================= */}
      {!loading && activeTab === "teams" && (
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
            }}
          >
            <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#475569" }}>
              Active & Configured Organization Teams
            </span>
            <button className="primary-btn" onClick={handleOpenAddTeam}>
              <Plus size={15} strokeWidth={2.5} />
              <span>Add Team</span>
            </button>
          </div>

          <div className="table-card">
            {teams.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <Users size={24} />
                </div>
                <h3>No Teams Found</h3>
                <p>Create your first team to assign employees and team leads.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Team Name</th>
                      <th>Team In-charge</th>
                      <th>Approval Permission</th>
                      <th>Total Members</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teams.map((team) => {
                      const isActive = team.is_active !== false;

                      return (
                        <tr key={team.id}>
                          <td>
                            <div className="team-name-cell">
                              <span
                                className="team-dot"
                                style={{ backgroundColor: getTeamColor(team.name) }}
                              ></span>
                              <strong className="font-semibold" style={{ color: "#0f172a" }}>
                                {team.name}
                              </strong>
                            </div>
                          </td>
                          <td>
                            {team.team_admin_id ? (
                              <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                                  <Shield size={14} className="text-purple" />
                                  <strong className="font-semibold" style={{ fontSize: "0.8125rem", color: "#0f172a" }}>
                                    {team.team_admin_name}
                                  </strong>
                                </div>
                                {team.team_admin_email && (
                                  <span style={{ fontSize: "0.725rem", color: "#64748b", fontFamily: "monospace" }}>
                                    {team.team_admin_email}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span style={{ fontSize: "0.75rem", color: "#94a3b8", fontStyle: "italic" }}>
                                No Team In-charge assigned
                              </span>
                            )}
                          </td>
                          <td>
                            {team.approval_permission_id ? (
                              <div>
                                <span
                                  style={{
                                    fontFamily: "monospace",
                                    fontSize: "0.725rem",
                                    fontWeight: 600,
                                    background: "#e0e7ff",
                                    color: "#4338ca",
                                    padding: "0.15rem 0.45rem",
                                    borderRadius: "4px",
                                    display: "inline-block",
                                    border: "1px solid #c7d2fe",
                                  }}
                                  title={team.approval_permission_description || ""}
                                >
                                  {team.approval_permission_id}
                                </span>
                              </div>
                            ) : (
                              <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>None configured</span>
                            )}
                          </td>
                          <td>
                            <span className="counter-pill pill-blue">
                              {team.total_members || team.member_count || 0} Members
                            </span>
                          </td>
                          <td>
                            {isActive ? (
                              <span className="status-pill status-pill-accepted">Active</span>
                            ) : (
                              <span className="status-pill status-pill-rejected">Inactive</span>
                            )}
                          </td>
                          <td>
                            <div className="team-action-buttons-vertical">
                              <button
                                type="button"
                                className="action-btn-vertical secondary-btn"
                                onClick={() => handleOpenAssignLead(team)}
                                title={team.team_admin_id ? "Change assigned Team In-charge" : "Assign a Team In-charge"}
                              >
                                <Award size={13} />
                                <span>Assign In-charge</span>
                              </button>
                              <button
                                type="button"
                                className="action-btn-vertical secondary-btn"
                                onClick={() => handleOpenConfigureTeamPerm(team)}
                                title="Configure required leave approval permission"
                              >
                                <Key size={13} />
                                <span>Permission</span>
                              </button>
                              <button
                                type="button"
                                className="action-btn-vertical secondary-btn"
                                onClick={() => handleOpenEditTeam(team)}
                                title="Edit team details and members"
                              >
                                <Edit2 size={13} />
                                <span>Edit</span>
                              </button>
                              {isActive ? (
                                <button
                                  type="button"
                                  className="action-btn-vertical admin-reject-btn"
                                  onClick={() => setDeactivateTeamTarget(team)}
                                  title="Deactivate team"
                                >
                                  <Power size={13} />
                                  <span>Deactivate Team</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="action-btn-vertical admin-approve-btn"
                                  onClick={() => setActivateTeamTarget(team)}
                                  title="Activate team"
                                >
                                  <CheckCircle2 size={13} />
                                  <span>Activate Team</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: LEAVE TYPES MANAGEMENT
         ========================================================================= */}
      {!loading && activeTab === "leave-types" && (
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
            }}
          >
            <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#475569" }}>
              Leave Policies & Calculation Rules
            </span>
            <button className="primary-btn" onClick={handleOpenAddLt}>
              <Plus size={15} strokeWidth={2.5} />
              <span>Add Leave Type</span>
            </button>
          </div>

          <div className="table-card">
            {leaveTypes.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <Clock size={24} />
                </div>
                <h3>No Leave Types Configured</h3>
                <p>Add leave types to define company leave policies.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Leave Type</th>
                      <th>Code</th>
                      <th>Unit</th>
                      <th>Default Quota</th>
                      <th>Requires Substitute</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaveTypes.map((lt) => {
                      const isActive = lt.is_active !== false;

                      return (
                        <tr key={lt.id}>
                          <td>
                            <strong className="font-semibold" style={{ color: "#0f172a" }}>
                              {lt.name}
                            </strong>
                          </td>
                          <td>
                            <span className="cell-id">{lt.code}</span>
                          </td>
                          <td>
                            <span
                              style={{
                                textTransform: "capitalize",
                                fontWeight: 600,
                                fontSize: "0.8125rem",
                                color: lt.unit === "hours" ? "#06b6d4" : "#4f46e5",
                              }}
                            >
                              {lt.unit}
                            </span>
                          </td>
                          <td>
                            <span className="font-mono font-semibold" style={{ fontSize: "0.875rem" }}>
                              {parseFloat(lt.default_quota)} {lt.unit}
                            </span>
                          </td>
                          <td>
                            {lt.requires_substitute ? (
                              <span className="badge badge-substitute-assigned">
                                <Check size={11} style={{ marginRight: "3px" }} /> Required
                              </span>
                            ) : (
                              <span className="badge badge-substitute-not-assigned">Not Required</span>
                            )}
                          </td>
                          <td>
                            {isActive ? (
                              <span className="status-pill status-pill-accepted">Active</span>
                            ) : (
                              <span className="status-pill status-pill-rejected">Inactive</span>
                            )}
                          </td>
                          <td>
                            <div className="admin-action-buttons">
                              <button
                                type="button"
                                className="secondary-btn"
                                style={{ padding: "0.25rem 0.6rem", fontSize: "0.75rem" }}
                                onClick={() => handleOpenEditLt(lt)}
                              >
                                <Edit2 size={13} />
                                <span>Edit</span>
                              </button>
                              {isActive && (
                                <button
                                  type="button"
                                  className="admin-reject-btn"
                                  style={{ padding: "0.25rem 0.6rem", fontSize: "0.75rem" }}
                                  onClick={() => handleDeactivateLt(lt)}
                                >
                                  <Power size={13} />
                                  <span>Deactivate</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: LEAVE QUOTAS / ENTITLEMENTS
         ========================================================================= */}
      {!loading && activeTab === "quotas" && (
        <div>
          {/* Employee Selection Section */}
          <div
            className="table-card"
            style={{
              padding: "1.25rem",
              marginBottom: "1.25rem",
              background: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1rem",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", flex: 1, minWidth: "280px" }}>
              <Users size={20} className="text-blue" />
              <div style={{ flex: 1 }}>
                <label
                  htmlFor="quotaUserSelect"
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    color: "#64748b",
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    display: "block",
                    marginBottom: "0.25rem",
                  }}
                >
                  Select Employee Account
                </label>
                <select
                  id="quotaUserSelect"
                  className="form-select"
                  value={selectedUserId}
                  onChange={(e) => handleSelectUserForQuotas(e.target.value)}
                  style={{ maxWidth: "420px" }}
                >
                  <option value="">-- Choose Employee --</option>
                  {allUsers
                    .filter((u) => u.is_active !== false)
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role}) — {u.team_name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {selectedUserId && entitlements.length > 0 && (
              <button
                className="primary-btn"
                onClick={handleSaveQuotas}
                disabled={savingQuotas}
                style={{ padding: "0.6rem 1.25rem" }}
              >
                <Save size={15} />
                <span>{savingQuotas ? "Saving Changes..." : "Save Quota Changes"}</span>
              </button>
            )}
          </div>

          {/* Entitlements Table */}
          {!selectedUserId ? (
            <div className="table-card" style={{ padding: "3rem", textAlign: "center" }}>
              <div className="empty-icon" style={{ margin: "0 auto 1rem auto" }}>
                <Layers size={24} />
              </div>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.25rem" }}>
                Select an Employee Above
              </h3>
              <p style={{ fontSize: "0.8125rem", color: "#64748b", margin: 0 }}>
                Choose an employee account from the dropdown to view and customize their leave quotas.
              </p>
            </div>
          ) : quotasLoading ? (
            <div className="table-card" style={{ padding: "3rem", textAlign: "center" }}>
              <p style={{ color: "#64748b", fontSize: "0.875rem" }}>
                Loading leave entitlements...
              </p>
            </div>
          ) : (
            <div className="table-card">
              {selectedUserObj && (
                <div
                  style={{
                    padding: "1rem 1.25rem",
                    borderBottom: "1px solid #e2e8f0",
                    background: "#f8fafc",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <span style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#0f172a" }}>
                      {selectedUserObj.name}
                    </span>
                    <span style={{ fontSize: "0.8125rem", color: "#64748b", marginLeft: "0.5rem" }}>
                      ({selectedUserObj.username || selectedUserObj.email})
                    </span>
                  </div>
                  <span className="badge badge-info">Current Year Allocations</span>
                </div>
              )}

              <div className="table-responsive">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Leave Type</th>
                      <th>Unit</th>
                      <th>Allocated Quota</th>
                      <th>Used</th>
                      <th>Remaining Balance</th>
                      <th>Year</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entitlements.map((item) => (
                      <tr key={item.leave_type_id}>
                        <td>
                          <strong className="font-semibold" style={{ color: "#0f172a" }}>
                            {item.leave_type_name}
                          </strong>
                          <span className="cell-id" style={{ marginLeft: "0.5rem" }}>
                            {item.leave_type_code}
                          </span>
                        </td>
                        <td>
                          <span
                            style={{
                              textTransform: "capitalize",
                              fontWeight: 600,
                              fontSize: "0.8125rem",
                              color: item.leave_type_unit === "hours" ? "#06b6d4" : "#4f46e5",
                            }}
                          >
                            {item.leave_type_unit}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", maxWidth: "140px" }}>
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              className="form-input"
                              style={{
                                padding: "0.35rem 0.5rem",
                                fontSize: "0.875rem",
                                fontWeight: 700,
                                color: "#4f46e5",
                              }}
                              value={item.allocated}
                              onChange={(e) =>
                                handleAllocatedChange(item.leave_type_id, e.target.value)
                              }
                            />
                          </div>
                        </td>
                        <td>
                          <span className="font-mono font-medium" style={{ color: "#64748b" }}>
                            {parseFloat(item.used)}
                          </span>
                        </td>
                        <td>
                          <span
                            className="font-mono font-bold"
                            style={{
                              fontSize: "0.9375rem",
                              color: item.remaining > 0 ? "#10b981" : "#ef4444",
                            }}
                          >
                            {parseFloat(item.remaining)}
                          </span>
                        </td>
                        <td>
                          <span className="text-muted" style={{ fontSize: "0.8125rem" }}>
                            {item.year}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div
                style={{
                  padding: "1rem 1.25rem",
                  borderTop: "1px solid #e2e8f0",
                  display: "flex",
                  justifyContent: "flex-end",
                  background: "#ffffff",
                }}
              >
                <button
                  className="primary-btn"
                  onClick={handleSaveQuotas}
                  disabled={savingQuotas}
                >
                  <CheckCircle2 size={15} />
                  <span>{savingQuotas ? "Saving..." : "Save Quotas"}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 4: PERMISSIONS MANAGEMENT
         ========================================================================= */}
      {!loading && activeTab === "permissions" && (
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
              flexWrap: "wrap",
              gap: "0.75rem",
            }}
          >
            <div>
              <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#475569" }}>
                Configurable Leave Approval Permissions
              </span>
              <p style={{ margin: 0, fontSize: "0.75rem", color: "#64748b" }}>
                Define permissions required to approve team leave requests and assign them to users.
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <button
                className="secondary-btn"
                onClick={handleGenerateTeamPermissions}
                disabled={generatingPerms}
                title="Generate missing default approval permissions for all active teams"
              >
                <Sparkles size={14} className="text-purple" />
                <span>{generatingPerms ? "Generating..." : "Generate Missing Team Permissions"}</span>
              </button>
              <button className="primary-btn" onClick={handleOpenAddPerm}>
                <Plus size={15} strokeWidth={2.5} />
                <span>Add Permission</span>
              </button>
            </div>
          </div>

          <div className="table-card">
            {permissions.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <Shield size={24} />
                </div>
                <h3>No Permissions Found</h3>
                <p>Click "Generate Missing Team Permissions" or "+ Add Permission" to create approval permissions.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Permission ID / Key</th>
                      <th>Description</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {permissions.map((perm) => {
                      const isActive = perm.is_active !== false;

                      return (
                        <tr key={perm.id}>
                          <td>
                            <span
                              style={{
                                fontFamily: "monospace",
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                background: "#e0e7ff",
                                color: "#4338ca",
                                padding: "0.25rem 0.6rem",
                                borderRadius: "6px",
                                display: "inline-block",
                                border: "1px solid #c7d2fe",
                              }}
                            >
                              {perm.id}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: "0.8125rem", color: "#334155", fontWeight: 500 }}>
                              {perm.description}
                            </span>
                          </td>
                          <td>
                            <span
                              style={{
                                fontSize: "0.6875rem",
                                fontWeight: 700,
                                padding: "0.15rem 0.5rem",
                                borderRadius: "9999px",
                                background: "#f1f5f9",
                                color: "#475569",
                                border: "1px solid #e2e8f0",
                              }}
                            >
                              {perm.permission_type || "LEAVE_APPROVAL"}
                            </span>
                          </td>
                          <td>
                            {isActive ? (
                              <span className="status-pill status-pill-accepted">Active</span>
                            ) : (
                              <span className="status-pill status-pill-rejected">Inactive</span>
                            )}
                          </td>
                          <td>
                            <div className="admin-action-buttons">
                              <button
                                type="button"
                                className="secondary-btn"
                                style={{ padding: "0.25rem 0.6rem", fontSize: "0.75rem" }}
                                onClick={() => handleOpenEditPerm(perm)}
                                title="Edit permission description or status"
                              >
                                <Edit2 size={13} />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                className={isActive ? "admin-reject-btn" : "secondary-btn"}
                                style={{ padding: "0.25rem 0.6rem", fontSize: "0.75rem" }}
                                onClick={() => handleTogglePermStatus(perm)}
                                title={isActive ? "Deactivate permission" : "Activate permission"}
                              >
                                <Power size={13} />
                                <span>{isActive ? "Deactivate" : "Activate"}</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: CREATE NEW TEAM (WITH INITIAL TEAM MEMBERS)
         ========================================================================= */}
      {createTeamModalOpen && (
        <div className="modal-backdrop" onClick={() => setCreateTeamModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "560px" }}>
            <div className="modal-header">
              <div>
                <h2>Create New Team</h2>
              </div>
              <button className="modal-close-btn" onClick={() => setCreateTeamModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTeamSubmit}>
              <div className="modal-body" style={{ gap: "1.1rem", maxHeight: "75vh", overflowY: "auto" }}>
                {createTeamError && (
                  <div className="form-error-alert">
                    <AlertCircle size={16} />
                    <span>{createTeamError}</span>
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="createTeamName" className="form-label required">
                    Team Name
                  </label>
                  <input
                    id="createTeamName"
                    type="text"
                    className="form-input"
                    placeholder="e.g. Finance, Quality Assurance"
                    value={createTeamForm.name}
                    onChange={(e) => setCreateTeamForm({ ...createTeamForm, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="createTeamIncharge" className="form-label">
                    Team In-charge (Optional)
                  </label>
                  <select
                    id="createTeamIncharge"
                    className="form-select"
                    value={createTeamForm.team_admin_id}
                    onChange={(e) => setCreateTeamForm({ ...createTeamForm, team_admin_id: e.target.value })}
                  >
                    <option value="">-- Select Team In-charge --</option>
                    {(inchargeCandidates.length > 0
                      ? inchargeCandidates
                      : teamAdminCandidates
                    ).map((u) => {
                      const isEmployee = u.role === "employee";
                      const roleLabel = isEmployee ? "Employee" : "Team Lead";
                      const isOtherLead = u.is_incharge_of_other_team;
                      return (
                        <option
                          key={u.id}
                          value={u.id}
                          disabled={isOtherLead}
                        >
                          {u.name} ({u.email}) — [{roleLabel}] {u.current_team_name ? `• Current: ${u.current_team_name}` : "• Unassigned"} {isOtherLead ? `[Already leading ${u.current_team_name}]` : ""}
                        </option>
                      );
                    })}
                  </select>
                  {/* Warning note if selected user currently belongs to another team */}
                  {(() => {
                    const sel = (inchargeCandidates.length > 0 ? inchargeCandidates : allUsers).find(
                      (c) => c.id === createTeamForm.team_admin_id
                    );
                    if (sel && sel.current_team_name) {
                      return (
                        <div
                          style={{
                            marginTop: "6px",
                            padding: "6px 10px",
                            background: "#eff6ff",
                            border: "1px solid #bfdbfe",
                            borderRadius: "6px",
                            fontSize: "0.75rem",
                            color: "#1e40af",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <Info size={14} style={{ flexShrink: 0 }} />
                          <span>
                            This user currently belongs to <strong>{sel.current_team_name}</strong>. Assigning them as Team In-charge will move them to this team.
                          </span>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>

                {/* Initial Team Members (Unassigned Employees Only) */}
                <div className="form-group" style={{ marginTop: "0.25rem" }}>
                  <label className="form-label">
                    Add Initial Team Members
                    <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 400, marginLeft: "6px" }}>
                      (Unassigned active employees only)
                    </span>
                  </label>

                  {/* Selected Members Chips */}
                  {selectedInitialMembers.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "6px",
                        marginBottom: "8px",
                        padding: "8px",
                        backgroundColor: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                      }}
                    >
                      {selectedInitialMembers.map((m) => (
                        <span
                          key={m.id}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "4px 8px",
                            backgroundColor: "#e0e7ff",
                            color: "#3730a3",
                            borderRadius: "6px",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                          }}
                        >
                          <span>{m.name}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveInitialMember(m.id)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#4338ca",
                              cursor: "pointer",
                              padding: 0,
                              display: "flex",
                              alignItems: "center",
                            }}
                            title="Remove member"
                          >
                            <X size={13} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Search Input for Unassigned Employees */}
                  <div style={{ position: "relative", marginBottom: "8px" }}>
                    <Search
                      size={15}
                      style={{
                        position: "absolute",
                        left: "10px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "#94a3b8",
                      }}
                    />
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Search unassigned employees by name, email, designation..."
                      style={{ paddingLeft: "32px" }}
                      value={unassignedSearch}
                      onChange={(e) => handleSearchUnassigned(e.target.value)}
                    />
                  </div>

                  {/* Scrollable List of Available Unassigned Employees */}
                  <div
                    style={{
                      maxHeight: "160px",
                      overflowY: "auto",
                      border: "1px solid #e2e8f0",
                      borderRadius: "6px",
                      backgroundColor: "#ffffff",
                    }}
                  >
                    {unassignedLoading ? (
                      <div style={{ padding: "12px", textAlign: "center", fontSize: "0.8125rem", color: "#64748b" }}>
                        Loading unassigned employees...
                      </div>
                    ) : unassignedList.filter((u) => !selectedInitialMembers.some((m) => m.id === u.id)).length === 0 ? (
                      <div style={{ padding: "12px", textAlign: "center", fontSize: "0.8125rem", color: "#94a3b8" }}>
                        No unassigned employees found.
                      </div>
                    ) : (
                      unassignedList
                        .filter((u) => !selectedInitialMembers.some((m) => m.id === u.id))
                        .map((emp) => (
                          <div
                            key={emp.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "8px 12px",
                              borderBottom: "1px solid #f1f5f9",
                              fontSize: "0.8125rem",
                            }}
                          >
                            <div>
                              <strong style={{ color: "#0f172a" }}>{emp.name}</strong>
                              <span style={{ color: "#64748b", marginLeft: "6px", fontSize: "0.75rem" }}>
                                {emp.email}
                              </span>
                              {emp.designation && (
                                <span
                                  style={{
                                    marginLeft: "8px",
                                    fontSize: "0.6875rem",
                                    background: "#f1f5f9",
                                    padding: "1px 6px",
                                    borderRadius: "4px",
                                    color: "#475569",
                                  }}
                                >
                                  {emp.designation}
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              className="secondary-btn"
                              style={{ padding: "2px 8px", fontSize: "0.75rem" }}
                              onClick={() => handleSelectInitialMember(emp)}
                            >
                              + Add
                            </button>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setCreateTeamModalOpen(false)}
                  disabled={submittingCreateTeam}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={submittingCreateTeam}
                >
                  {submittingCreateTeam ? "Creating..." : "Create Team"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: EDIT TEAM DETAILS & TEAM MEMBERS
         ========================================================================= */}
      {editTeamModalOpen && editingTeam && (
        <div className="modal-backdrop" onClick={() => setEditTeamModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "680px" }}>
            <div className="modal-header">
              <div>
                <h2>Edit Team: {editingTeam.name}</h2>
              </div>
              <button className="modal-close-btn" onClick={() => setEditTeamModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ gap: "1.25rem", maxHeight: "75vh", overflowY: "auto" }}>
              {/* SECTION 1: TEAM DETAILS */}
              <div
                style={{
                  padding: "1rem",
                  backgroundColor: "#f8fafc",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <h4 style={{ fontSize: "0.875rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.5rem" }}>
                  Section 1: Team Details
                </h4>
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                  <input
                    type="text"
                    className="form-input"
                    value={editTeamName}
                    onChange={(e) => setEditTeamName(e.target.value)}
                    placeholder="Team Name"
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="primary-btn"
                    onClick={handleSaveTeamName}
                    disabled={savingTeamName || !editTeamName.trim()}
                    style={{ whiteSpace: "nowrap" }}
                  >
                    {savingTeamName ? "Saving..." : "Save Team Name"}
                  </button>
                </div>
              </div>

              {/* SECTION 2: TEAM IN-CHARGE */}
              <div
                style={{
                  padding: "1rem",
                  backgroundColor: "#f8fafc",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h4 style={{ fontSize: "0.875rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.25rem" }}>
                      Section 2: Team In-charge
                    </h4>
                    {editingTeam.team_admin_id ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px", flexWrap: "wrap" }}>
                        <Shield size={16} className="text-purple" />
                        <strong style={{ fontSize: "0.875rem", color: "#0f172a" }}>
                          {editingTeam.team_admin_name || "Assigned Team In-charge"}
                        </strong>
                        {editingTeam.team_admin_email && (
                          <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                            ({editingTeam.team_admin_email})
                          </span>
                        )}
                        <span style={{
                          fontSize: "0.6875rem",
                          background: editingTeam.team_admin_role === "employee" ? "#e0f2fe" : "#ede9fe",
                          color: editingTeam.team_admin_role === "employee" ? "#0369a1" : "#6d28d9",
                          padding: "1px 6px",
                          borderRadius: "4px",
                          fontWeight: 600,
                          textTransform: "capitalize"
                        }}>
                          {editingTeam.team_admin_role === "employee" ? "Employee" : "Team Lead"}
                        </span>
                        {editingTeam.approval_permission_id && (
                          <span style={{
                            fontSize: "0.6875rem",
                            background: "#dcfce7",
                            color: "#15803d",
                            padding: "1px 6px",
                            borderRadius: "4px",
                            fontWeight: 600
                          }}>
                            Approval Permission Active
                          </span>
                        )}
                      </div>
                    ) : (
                      <span style={{ fontSize: "0.8125rem", color: "#94a3b8", fontStyle: "italic" }}>
                        No Team In-charge currently assigned
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      type="button"
                      className="secondary-btn"
                      style={{ fontSize: "0.75rem", padding: "0.3rem 0.65rem" }}
                      onClick={() => {
                        handleOpenAssignLead(editingTeam);
                      }}
                    >
                      <Award size={14} />
                      <span>{editingTeam.team_admin_id ? "Change Team In-charge" : "Assign Team In-charge"}</span>
                    </button>
                    {editingTeam.team_admin_id && (
                      <button
                        type="button"
                        className="admin-reject-btn"
                        style={{ fontSize: "0.75rem", padding: "0.3rem 0.65rem" }}
                        onClick={() => {
                          handleOpenRemoveLead(editingTeam);
                        }}
                      >
                        <UserMinus size={14} />
                        <span>Remove In-charge</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION 3: TEAM MEMBERS */}
              <div
                style={{
                  padding: "1rem",
                  backgroundColor: "#ffffff",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                  <h4 style={{ fontSize: "0.875rem", fontWeight: 700, color: "#0f172a" }}>
                    Section 3: Team Members
                  </h4>
                  <span className="counter-pill pill-blue">
                    {teamMembers.length} {teamMembers.length === 1 ? "Member" : "Members"}
                  </span>
                </div>

                {/* Current Members Table */}
                {loadingTeamMembers ? (
                  <div style={{ textAlign: "center", padding: "1.5rem", color: "#64748b", fontSize: "0.875rem" }}>
                    Loading team members...
                  </div>
                ) : teamMembers.length === 0 ? (
                  <div className="empty-state-compact" style={{ padding: "1rem" }}>
                    <Users size={20} style={{ color: "#94a3b8" }} />
                    <p style={{ fontSize: "0.8125rem" }}>No team members assigned yet.</p>
                  </div>
                ) : (
                  <div className="table-responsive" style={{ maxHeight: "200px", overflowY: "auto", marginBottom: "1rem" }}>
                    <table className="custom-table" style={{ fontSize: "0.8125rem" }}>
                      <thead>
                        <tr>
                          <th>Employee</th>
                          <th>Role</th>
                          <th>Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teamMembers.map((m) => {
                          const isLead = m.is_team_lead || String(m.id) === String(editingTeam.team_admin_id);
                          return (
                            <tr key={m.id}>
                              <td>
                                <div>
                                  <strong style={{ color: "#0f172a" }}>{m.name}</strong>
                                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{m.email}</div>
                                </div>
                              </td>
                              <td>
                                {isLead ? (
                                  <span style={{ fontSize: "0.6875rem", background: "#ede9fe", color: "#6d28d9", padding: "2px 6px", borderRadius: "4px", fontWeight: 700 }}>
                                    Team In-charge
                                  </span>
                                ) : (
                                  <span style={{ fontSize: "0.6875rem", background: "#f1f5f9", color: "#475569", padding: "2px 6px", borderRadius: "4px" }}>
                                    {m.role === "team_admin" ? "Team Lead" : "Employee"}
                                  </span>
                                )}
                              </td>
                              <td>
                                {m.is_active !== false ? (
                                  <span className="status-pill status-pill-accepted" style={{ fontSize: "0.6875rem" }}>
                                    Active
                                  </span>
                                ) : (
                                  <span className="status-pill status-pill-rejected" style={{ fontSize: "0.6875rem" }}>
                                    Inactive
                                  </span>
                                )}
                              </td>
                              <td>
                                {isLead ? (
                                  <button
                                    type="button"
                                    className="secondary-btn"
                                    disabled
                                    style={{ padding: "2px 6px", fontSize: "0.6875rem", opacity: 0.5, cursor: "not-allowed" }}
                                    title="This user is the current Team In-charge. Please remove or change the Team In-charge assignment before removing this user from the team."
                                  >
                                    In-charge Protected
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className="admin-reject-btn"
                                    style={{ padding: "2px 6px", fontSize: "0.6875rem" }}
                                    onClick={() => handleOpenRemoveMember(m)}
                                  >
                                    <Trash2 size={12} />
                                    <span>Remove</span>
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Add Team Member Search Box */}
                <div
                  style={{
                    padding: "0.85rem",
                    backgroundColor: "#f8fafc",
                    borderRadius: "6px",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                    Add Team Member
                  </label>
                  <div style={{ position: "relative", marginBottom: "8px" }}>
                    <Search
                      size={15}
                      style={{
                        position: "absolute",
                        left: "10px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "#94a3b8",
                      }}
                    />
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Search employees to add by name, email, department..."
                      style={{ paddingLeft: "32px", fontSize: "0.8125rem" }}
                      value={candidateSearch}
                      onChange={(e) => handleSearchCandidates(e.target.value)}
                    />
                  </div>

                  {/* Scrollable Candidate Dropdown */}
                  <div
                    style={{
                      maxHeight: "160px",
                      overflowY: "auto",
                      border: "1px solid #e2e8f0",
                      borderRadius: "6px",
                      backgroundColor: "#ffffff",
                    }}
                  >
                    {candidateLoading ? (
                      <div style={{ padding: "10px", textAlign: "center", fontSize: "0.75rem", color: "#64748b" }}>
                        Searching employees...
                      </div>
                    ) : candidateList.length === 0 ? (
                      <div style={{ padding: "10px", textAlign: "center", fontSize: "0.75rem", color: "#94a3b8" }}>
                        No matching employees found.
                      </div>
                    ) : (
                      candidateList.map((c) => {
                        const inThisTeam = c.is_already_member || c.current_team_id === editingTeam.id;
                        return (
                          <div
                            key={c.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "6px 10px",
                              borderBottom: "1px solid #f1f5f9",
                              fontSize: "0.75rem",
                            }}
                          >
                            <div>
                              <strong style={{ color: "#0f172a" }}>{c.name}</strong>
                              <span style={{ color: "#64748b", marginLeft: "6px" }}>{c.email}</span>
                              <div style={{ marginTop: "2px" }}>
                                {inThisTeam ? (
                                  <span style={{ fontSize: "0.6875rem", color: "#15803d", background: "#dcfce7", padding: "1px 5px", borderRadius: "3px" }}>
                                    Already in this team
                                  </span>
                                ) : c.current_team_id ? (
                                  <span style={{ fontSize: "0.6875rem", color: "#b45309", background: "#fef3c7", padding: "1px 5px", borderRadius: "3px" }}>
                                    Currently in {c.current_team_name}
                                  </span>
                                ) : (
                                  <span style={{ fontSize: "0.6875rem", color: "#475569", background: "#f1f5f9", padding: "1px 5px", borderRadius: "3px" }}>
                                    No team assigned
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              type="button"
                              className="secondary-btn"
                              style={{ padding: "2px 8px", fontSize: "0.75rem" }}
                              disabled={inThisTeam || !c.can_add || addingMemberId === c.id}
                              onClick={() => handleAddMemberClick(c)}
                            >
                              {addingMemberId === c.id ? "Adding..." : inThisTeam ? "In Team" : c.requires_move_confirmation ? "Move Here" : "+ Add"}
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setEditTeamModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: CONFIRM REMOVE TEAM MEMBER
         ========================================================================= */}
      {removeMemberModal.isOpen && removeMemberModal.member && (
        <div className="modal-backdrop" onClick={() => setRemoveMemberModal({ ...removeMemberModal, isOpen: false })}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "440px" }}>
            <div className="modal-header">
              <h2>Remove Team Member</h2>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setRemoveMemberModal({ ...removeMemberModal, isOpen: false })}
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ gap: "0.75rem" }}>
              {removeMemberModal.error && (
                <div className="form-error-alert">
                  <AlertCircle size={16} />
                  <span>{removeMemberModal.error}</span>
                </div>
              )}
              <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                <AlertTriangle size={24} style={{ color: "#ef4444", flexShrink: 0, marginTop: "2px" }} />
                <p style={{ fontSize: "0.875rem", color: "#334155", lineHeight: 1.5, margin: 0 }}>
                  Are you sure you want to remove <strong>{removeMemberModal.member.name}</strong> from{" "}
                  <strong>{removeMemberModal.team?.name}</strong>? The employee account and leave history will remain
                  unchanged.
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setRemoveMemberModal({ ...removeMemberModal, isOpen: false })}
                disabled={removeMemberModal.isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-reject-btn"
                onClick={handleConfirmRemoveMember}
                disabled={removeMemberModal.isSubmitting}
              >
                {removeMemberModal.isSubmitting ? "Removing..." : "Remove Member"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: CONFIRM MOVE EMPLOYEE TO TEAM
         ========================================================================= */}
      {moveMemberModal.isOpen && moveMemberModal.candidate && (
        <div className="modal-backdrop" onClick={() => setMoveMemberModal({ ...moveMemberModal, isOpen: false })}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "460px" }}>
            <div className="modal-header">
              <h2>Move Employee to Team</h2>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setMoveMemberModal({ ...moveMemberModal, isOpen: false })}
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ gap: "0.75rem" }}>
              {moveMemberModal.error && (
                <div className="form-error-alert">
                  <AlertCircle size={16} />
                  <span>{moveMemberModal.error}</span>
                </div>
              )}
              <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                <ArrowRightLeft size={24} style={{ color: "#f59e0b", flexShrink: 0, marginTop: "2px" }} />
                <p style={{ fontSize: "0.875rem", color: "#334155", lineHeight: 1.5, margin: 0 }}>
                  <strong>{moveMemberModal.candidate.name}</strong> currently belongs to{" "}
                  <strong>{moveMemberModal.candidate.current_team_name || "another team"}</strong>. Do you want to
                  move them to <strong>{moveMemberModal.team?.name}</strong>?
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setMoveMemberModal({ ...moveMemberModal, isOpen: false })}
                disabled={moveMemberModal.isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary-btn"
                onClick={handleConfirmMoveMember}
                disabled={moveMemberModal.isSubmitting}
              >
                {moveMemberModal.isSubmitting ? "Moving..." : "Move Employee"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: ADD / EDIT LEAVE TYPE
         ========================================================================= */}
      {ltModalOpen && (
        <div className="modal-backdrop" onClick={() => setLtModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "520px" }}>
            <div className="modal-header">
              <div>
                <h2>{editingLt ? "Edit Leave Policy" : "Create New Leave Type"}</h2>
              </div>
              <button className="modal-close-btn" onClick={() => setLtModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleLtFormSubmit}>
              <div className="modal-body" style={{ gap: "1rem" }}>
                {ltFormError && (
                  <div className="form-error-alert">
                    <AlertCircle size={16} />
                    <span>{ltFormError}</span>
                  </div>
                )}

                <div className="form-row-2">
                  <div className="form-group">
                    <label htmlFor="ltName" className="form-label required">
                      Leave Type Name
                    </label>
                    <input
                      id="ltName"
                      type="text"
                      className="form-input"
                      placeholder="e.g. Study Leave"
                      value={ltForm.name}
                      onChange={(e) => setLtForm({ ...ltForm, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="ltCode" className="form-label required">
                      System Code
                    </label>
                    <input
                      id="ltCode"
                      type="text"
                      className="form-input font-mono"
                      placeholder="e.g. STUDY"
                      value={ltForm.code}
                      onChange={(e) => setLtForm({ ...ltForm, code: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label htmlFor="ltUnit" className="form-label required">
                      Calculation Unit
                    </label>
                    <select
                      id="ltUnit"
                      className="form-select"
                      value={ltForm.unit}
                      onChange={(e) => setLtForm({ ...ltForm, unit: e.target.value })}
                    >
                      <option value="days">Days</option>
                      <option value="hours">Hours</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="ltQuota" className="form-label required">
                      Default Annual Quota
                    </label>
                    <input
                      id="ltQuota"
                      type="number"
                      min="0"
                      step="0.5"
                      className="form-input"
                      value={ltForm.default_quota}
                      onChange={(e) => setLtForm({ ...ltForm, default_quota: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group" style={{ flexDirection: "row", alignItems: "center", gap: "0.5rem" }}>
                  <input
                    id="ltSubCheck"
                    type="checkbox"
                    checked={ltForm.requires_substitute}
                    onChange={(e) => setLtForm({ ...ltForm, requires_substitute: e.target.checked })}
                    style={{ width: "16px", height: "16px", cursor: "pointer" }}
                  />
                  <label htmlFor="ltSubCheck" className="form-label" style={{ margin: 0, cursor: "pointer" }}>
                    Requires Substitute Employee Approval
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setLtModalOpen(false)}
                  disabled={submittingLt}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={submittingLt}
                >
                  {submittingLt ? "Saving..." : editingLt ? "Update Leave Policy" : "Create Leave Type"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: CREATE / EDIT PERMISSION
         ========================================================================= */}
      {permModalOpen && (
        <div className="modal-backdrop" onClick={() => setPermModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "540px" }}>
            <div className="modal-header">
              <div>
                <h2>{editingPerm ? "Edit Leave Approval Permission" : "Create New Leave Approval Permission"}</h2>
              </div>
              <button className="modal-close-btn" onClick={() => setPermModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handlePermFormSubmit}>
              <div className="modal-body" style={{ gap: "1rem" }}>
                {permFormError && (
                  <div className="form-error-alert">
                    <AlertCircle size={16} />
                    <span>{permFormError}</span>
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="permId" className="form-label required">
                    Permission ID / Key
                  </label>
                  {editingPerm ? (
                    <input
                      id="permId"
                      type="text"
                      className="form-input font-mono"
                      value={permForm.id}
                      disabled
                      style={{ background: "#f1f5f9", cursor: "not-allowed", color: "#64748b" }}
                    />
                  ) : (
                    <div>
                      <input
                        id="permId"
                        type="text"
                        className="form-input font-mono"
                        placeholder="e.g. ENGINEERING_TEAM_LEAVE_APPROVAL_PERMISSION"
                        value={permForm.id}
                        onChange={(e) =>
                          setPermForm({
                            ...permForm,
                            id: e.target.value.toUpperCase().replace(/\s+/g, "_"),
                          })
                        }
                        required
                      />
                      <span style={{ fontSize: "0.72rem", color: "#64748b", marginTop: "0.3rem", display: "block" }}>
                        Format: Uppercase with underscores. Examples:{" "}
                        <code style={{ color: "#4338ca" }}>ENGINEERING_TEAM_LEAVE_APPROVAL_PERMISSION</code>,{" "}
                        <code style={{ color: "#4338ca" }}>SALES_TEAM_LEAVE_APPROVAL_PERMISSION</code>
                      </span>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="permDesc" className="form-label required">
                    Description
                  </label>
                  <input
                    id="permDesc"
                    type="text"
                    className="form-input"
                    placeholder="e.g. Permission for approving Engineering team leave"
                    value={permForm.description}
                    onChange={(e) => setPermForm({ ...permForm, description: e.target.value })}
                    required
                  />
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label htmlFor="permType" className="form-label">
                      Permission Type
                    </label>
                    <input
                      id="permType"
                      type="text"
                      className="form-input font-mono"
                      value={permForm.permission_type}
                      onChange={(e) => setPermForm({ ...permForm, permission_type: e.target.value })}
                    />
                  </div>

                  {editingPerm && (
                    <div className="form-group" style={{ justifyContent: "center" }}>
                      <label className="form-label">Active Status</label>
                      <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", marginTop: "0.4rem" }}>
                        <input
                          type="checkbox"
                          checked={permForm.is_active}
                          onChange={(e) => setPermForm({ ...permForm, is_active: e.target.checked })}
                          style={{ width: "16px", height: "16px" }}
                        />
                        <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Active Permission</span>
                      </label>
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setPermModalOpen(false)}
                  disabled={submittingPerm}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={submittingPerm}
                >
                  {submittingPerm ? "Saving..." : editingPerm ? "Update Permission" : "Create Permission"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: CONFIGURE TEAM APPROVAL PERMISSION
         ========================================================================= */}
      {teamPermModalOpen && configuringTeam && (
        <div className="modal-backdrop" onClick={() => setTeamPermModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "520px" }}>
            <div className="modal-header">
              <div>
                <h2>Team Leave Approval Permission</h2>
                <p style={{ margin: 0, fontSize: "0.75rem", color: "#64748b" }}>
                  Configure which permission key is required to approve leave for <strong>{configuringTeam.name}</strong>.
                </p>
              </div>
              <button className="modal-close-btn" onClick={() => setTeamPermModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveTeamPermission}>
              <div className="modal-body" style={{ gap: "1rem" }}>
                <div className="form-group">
                  <label htmlFor="teamPermSelect" className="form-label required">
                    Required Approval Permission
                  </label>
                  <select
                    id="teamPermSelect"
                    className="form-select font-mono"
                    value={selectedTeamPermId}
                    onChange={(e) => setSelectedTeamPermId(e.target.value)}
                    required
                  >
                    <option value="">-- Select Leave Approval Permission --</option>
                    {permissions
                      .filter((p) => p.is_active || p.id === configuringTeam.approval_permission_id)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.id} ({p.description})
                        </option>
                      ))}
                  </select>
                  <span style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.35rem", display: "block" }}>
                    Only users with this specific permission assigned will be permitted to approve or reject leave for this team.
                  </span>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setTeamPermModalOpen(false)}
                  disabled={savingTeamPerm}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={savingTeamPerm || !selectedTeamPermId}
                >
                  {savingTeamPerm ? "Saving..." : "Save Team Mapping"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: ASSIGN / CHANGE TEAM IN-CHARGE
         ========================================================================= */}
      {assignLeadModal.isOpen && assignLeadModal.team && (
        <div className="modal-backdrop" onClick={() => setAssignLeadModal({ ...assignLeadModal, isOpen: false })}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "520px" }}>
            <div className="modal-header">
              <div>
                <h2 style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                  <Award size={18} className="text-purple" />
                  <span>{assignLeadModal.team.team_admin_id ? "Change Team In-charge" : "Assign Team In-charge"}</span>
                </h2>
                <p style={{ margin: 0, fontSize: "0.75rem", color: "#64748b" }}>
                  Team: <strong>{assignLeadModal.team.name}</strong>
                </p>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setAssignLeadModal({ ...assignLeadModal, isOpen: false })}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmAssignLead}>
              <div className="modal-body" style={{ gap: "1rem" }}>
                {assignLeadModal.error && (
                  <div className="form-error-alert" style={{ margin: 0 }}>
                    <AlertCircle size={16} />
                    <span>{assignLeadModal.error}</span>
                  </div>
                )}

                {/* Team & Current Lead strip */}
                <div
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    padding: "0.75rem 1rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <span style={{ fontSize: "0.75rem", color: "#64748b", display: "block" }}>Current Team In-charge</span>
                    <strong style={{ fontSize: "0.875rem", color: "#0f172a" }}>
                      {assignLeadModal.team.team_admin_name || "Unassigned"}
                    </strong>
                  </div>
                  <span className="counter-pill pill-blue">
                    {assignLeadModal.team.total_members || assignLeadModal.team.member_count || 0} Members
                  </span>
                </div>

                {/* Select User Dropdown */}
                <div className="form-group">
                  <label htmlFor="leadUserSelect" className="form-label required">
                    Select Team In-charge User
                  </label>
                  <select
                    id="leadUserSelect"
                    className="form-select"
                    value={assignLeadModal.selectedUserId}
                    onChange={(e) => setAssignLeadModal({ ...assignLeadModal, selectedUserId: e.target.value })}
                    required
                  >
                    <option value="">-- Choose an employee or lead --</option>
                    {(inchargeCandidates.length > 0
                      ? inchargeCandidates
                      : allUsers.filter((u) => u.role !== "superior_admin" && u.is_active !== false)
                    ).map((u) => {
                      const isEmp = u.role === "employee";
                      const isOtherLead = u.is_incharge_of_other_team;
                      return (
                        <option key={u.id} value={u.id} disabled={isOtherLead}>
                          {u.name} ({u.email}) — [{isEmp ? "Employee" : "Team Lead"}] {u.current_team_name ? `• Current: ${u.current_team_name}` : "• Unassigned"} {isOtherLead ? `[Already leading ${u.current_team_name}]` : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Info if moving user from another team */}
                {(() => {
                  const selUser = (inchargeCandidates.length > 0 ? inchargeCandidates : allUsers).find(
                    (u) => String(u.id) === String(assignLeadModal.selectedUserId)
                  );
                  if (selUser && selUser.current_team_name && selUser.current_team_name !== assignLeadModal.team.name) {
                    return (
                      <div
                        style={{
                          padding: "0.65rem 0.85rem",
                          background: "#eff6ff",
                          border: "1px solid #bfdbfe",
                          borderRadius: "6px",
                          fontSize: "0.75rem",
                          color: "#1e40af",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.45rem",
                        }}
                      >
                        <Info size={15} style={{ flexShrink: 0 }} />
                        <span>
                          This user currently belongs to <strong>{selUser.current_team_name}</strong>. Assigning them as Team In-charge will move them to this team.
                        </span>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Warning if replacing an existing lead */}
                {assignLeadModal.team.team_admin_id &&
                  String(assignLeadModal.team.team_admin_id) !== String(assignLeadModal.selectedUserId) && (
                    <div
                      style={{
                        padding: "0.65rem 0.85rem",
                        background: "#fffbeb",
                        border: "1px solid #fde68a",
                        borderRadius: "6px",
                        fontSize: "0.75rem",
                        color: "#92400e",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "0.45rem",
                      }}
                    >
                      <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: "1px" }} />
                      <span>
                        <strong>Note:</strong> <strong>{assignLeadModal.team.team_admin_name}</strong> is currently assigned as the Team In-charge of <strong>{assignLeadModal.team.name}</strong>. Assigning a new in-charge will replace them.
                      </span>
                    </div>
                  )}

                {/* Checkbox: Remove permission from previous lead */}
                {assignLeadModal.team.team_admin_id && (
                  <label
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "0.55rem",
                      padding: "0.6rem 0.75rem",
                      borderRadius: "6px",
                      background: "#f1f5f9",
                      border: "1px solid #cbd5e1",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={assignLeadModal.removePreviousLeadPermission}
                      onChange={(e) =>
                        setAssignLeadModal({
                          ...assignLeadModal,
                          removePreviousLeadPermission: e.target.checked,
                        })
                      }
                      style={{ marginTop: "2px", cursor: "pointer" }}
                    />
                    <span style={{ fontSize: "0.8125rem", color: "#334155", lineHeight: 1.4 }}>
                      <strong>Remove approval permission from previous Team In-charge</strong>
                      <span style={{ display: "block", fontSize: "0.725rem", color: "#64748b" }}>
                        Revokes this team's leave approval permission from {assignLeadModal.team.team_admin_name} and demotes them to employee if they lead no other teams.
                      </span>
                    </span>
                  </label>
                )}

                <div
                  style={{
                    padding: "0.65rem 0.85rem",
                    background: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    borderRadius: "6px",
                    fontSize: "0.75rem",
                    color: "#166534",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.45rem",
                  }}
                >
                  <CheckCircle2 size={15} style={{ flexShrink: 0, marginTop: "1px" }} />
                  <span>
                    {(() => {
                      const selUser = (inchargeCandidates.length > 0 ? inchargeCandidates : allUsers).find(
                        (u) => String(u.id) === String(assignLeadModal.selectedUserId)
                      );
                      if (selUser && selUser.role === "employee") {
                        return "This employee will become the Team In-charge for this team and will receive the team leave approval permission. Their role will remain Employee.";
                      }
                      return `This user will become the Team In-charge for this team and will receive the team leave approval permission.`;
                    })()}
                  </span>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setAssignLeadModal({ ...assignLeadModal, isOpen: false })}
                  disabled={assignLeadModal.isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={assignLeadModal.isSubmitting || !assignLeadModal.selectedUserId}
                >
                  {assignLeadModal.isSubmitting ? "Assigning..." : "Confirm Assignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: REMOVE TEAM IN-CHARGE CONFIRMATION
         ========================================================================= */}
      {removeLeadModal.isOpen && removeLeadModal.team && (
        <div className="modal-backdrop" onClick={() => setRemoveLeadModal({ ...removeLeadModal, isOpen: false })}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "480px" }}>
            <div className="modal-header" style={{ background: "#fef3c7", borderBottomColor: "#fde68a" }}>
              <div>
                <h2 style={{ color: "#92400e", display: "flex", alignItems: "center", gap: "0.45rem" }}>
                  <UserMinus size={18} className="text-amber" />
                  <span>Remove Team In-charge</span>
                </h2>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setRemoveLeadModal({ ...removeLeadModal, isOpen: false })}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmRemoveLead}>
              <div className="modal-body" style={{ gap: "0.85rem" }}>
                {removeLeadModal.error && (
                  <div className="form-error-alert" style={{ margin: 0 }}>
                    <AlertCircle size={16} />
                    <span>{removeLeadModal.error}</span>
                  </div>
                )}

                <p style={{ fontSize: "0.875rem", color: "#0f172a", margin: 0, lineHeight: 1.5 }}>
                  Are you sure you want to remove <strong>{removeLeadModal.team.team_admin_name}</strong> as Team In-charge of <strong>{removeLeadModal.team.name}</strong>?
                </p>

                <div
                  style={{
                    padding: "0.75rem 0.95rem",
                    background: "#fffbeb",
                    border: "1px solid #fde68a",
                    borderRadius: "6px",
                    fontSize: "0.8125rem",
                    color: "#78350f",
                  }}
                >
                  <ul style={{ margin: 0, paddingLeft: "1.2rem", lineHeight: 1.5 }}>
                    <li>The team's leave approval permission will be revoked from this user.</li>
                    <li>Their role will remain preserved.</li>
                    <li>The team will have no Team In-charge until a new one is assigned.</li>
                    <li><strong>Historical leave requests and approvals are safely preserved.</strong></li>
                  </ul>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setRemoveLeadModal({ ...removeLeadModal, isOpen: false })}
                  disabled={removeLeadModal.isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-reject-btn"
                  disabled={removeLeadModal.isSubmitting}
                  style={{ padding: "0.5rem 1rem", fontSize: "0.8125rem" }}
                >
                  {removeLeadModal.isSubmitting ? "Removing..." : "Yes, Remove Team In-charge"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* =========================================================================
          ACTIVATE TEAM CONFIRMATION MODAL
         ========================================================================= */}
      {activateTeamTarget && (
        <div className="modal-backdrop" onClick={() => setActivateTeamTarget(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "460px" }}>
            <div className="modal-header" style={{ background: "#ecfdf5", borderBottomColor: "#a7f3d0" }}>
              <div>
                <h2 style={{ color: "#065f46", display: "flex", alignItems: "center", gap: "0.45rem" }}>
                  <CheckCircle2 size={18} style={{ color: "#10B981" }} />
                  <span>Activate Team</span>
                </h2>
              </div>
              <button className="modal-close-btn" onClick={() => setActivateTeamTarget(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <p style={{ fontSize: "0.875rem", color: "#0f172a", margin: 0 }}>
                Are you sure you want to activate this team again?
              </p>
              <p style={{ fontSize: "0.8125rem", color: "#475569", margin: "0.35rem 0 0 0" }}>
                Target team: <strong>{activateTeamTarget.name}</strong>
              </p>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setActivateTeamTarget(null)}
                disabled={activatingTeam}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-approve-btn"
                onClick={handleConfirmActivateTeam}
                disabled={activatingTeam}
                style={{ padding: "0.5rem 1rem", fontSize: "0.8125rem" }}
              >
                {activatingTeam ? "Activating..." : "Activate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          DEACTIVATE TEAM CONFIRMATION MODAL
         ========================================================================= */}
      {deactivateTeamTarget && (
        <div className="modal-backdrop" onClick={() => setDeactivateTeamTarget(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "460px" }}>
            <div className="modal-header" style={{ background: "#fef2f2", borderBottomColor: "#fecaca" }}>
              <div>
                <h2 style={{ color: "#991b1b", display: "flex", alignItems: "center", gap: "0.45rem" }}>
                  <AlertTriangle size={18} style={{ color: "#ef4444" }} />
                  <span>Deactivate Team</span>
                </h2>
              </div>
              <button className="modal-close-btn" onClick={() => setDeactivateTeamTarget(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <p style={{ fontSize: "0.875rem", color: "#0f172a", margin: 0 }}>
                Are you sure you want to deactivate this team? Existing users and leave history will remain unchanged.
              </p>
              <p style={{ fontSize: "0.8125rem", color: "#475569", margin: "0.35rem 0 0 0" }}>
                Target team: <strong>{deactivateTeamTarget.name}</strong>
              </p>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setDeactivateTeamTarget(null)}
                disabled={deactivatingTeam}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-reject-btn"
                onClick={handleConfirmDeactivateTeam}
                disabled={deactivatingTeam}
                style={{ padding: "0.5rem 1rem", fontSize: "0.8125rem" }}
              >
                {deactivatingTeam ? "Deactivating..." : "Deactivate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

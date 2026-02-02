'use client';

import { useState, useEffect } from 'react';
import {
    timeManagementService,
    ShiftAssignment,
    Shift,
    ShiftAssignmentStatus,
    AssignShiftDto,
} from '@/app/services/time-management';
import { employeeProfileService } from '@/app/services/employee-profile';
import { organizationStructureService } from '@/app/services/organization-structure';
import { useAuth } from '@/context/AuthContext';
import { ThemeCustomizer, ThemeCustomizerTrigger } from '@/components/theme-customizer';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Plus,
    X,
    Eye,
    Check,
    XCircle,
    Clock,
    Calendar,
    Users,
    Building2,
    Briefcase,
} from "lucide-react";

interface Employee {
    _id: string;
    firstName: string;
    lastName: string;
    email?: string;
}

interface Department {
    _id: string;
    name: string;
}

interface Position {
    _id: string;
    title: string;
}

export default function ShiftAssignmentsPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [showThemeCustomizer, setShowThemeCustomizer] = useState(false);

    // Data state
    const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [positions, setPositions] = useState<Position[]>([]);

    // Modal state
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedAssignment, setSelectedAssignment] = useState<ShiftAssignment | null>(null);

    // Form state
    const [assignmentType, setAssignmentType] = useState<'employee' | 'department' | 'position'>('employee');
    const [selectedEmployee, setSelectedEmployee] = useState<string>('');
    const [selectedDepartment, setSelectedDepartment] = useState<string>('');
    const [selectedPosition, setSelectedPosition] = useState<string>('');
    const [selectedShift, setSelectedShift] = useState<string>('');
    const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState<string>('');

    // View and filter state
    const [viewType, setViewType] = useState<'employee' | 'department' | 'position'>('employee');
    const [statusFilter, setStatusFilter] = useState<ShiftAssignmentStatus | 'ALL'>('ALL');

    const extractArrayData = (response: any, type: string = 'unknown'): any[] => {
        console.log(`[${type}] Response:`, response);

        // Check nested data.data structure (pagination response)
        if (Array.isArray(response?.data?.data)) {
            console.log(`[${type}] Found in response.data.data`);
            return response.data.data;
        }

        // Check data.employees structure
        if (Array.isArray(response?.data?.employees)) {
            console.log(`[${type}] Found in response.data.employees`);
            return response.data.employees;
        }

        // Check data.items structure
        if (Array.isArray(response?.data?.items)) {
            console.log(`[${type}] Found in response.data.items`);
            return response.data.items;
        }

        // Check direct data array
        if (Array.isArray(response?.data)) {
            console.log(`[${type}] Found in response.data`);
            return response.data;
        }

        // Check direct response is array
        if (Array.isArray(response)) {
            console.log(`[${type}] Found in response directly`);
            return response;
        }

        console.log(`[${type}] No array found, returning empty array`);
        return [];
    };

    const fetchAllData = async () => {
        try {
            setLoading(true);
            setError(null);

            const [assignRes, shiftsRes, empRes, deptRes, posRes] = await Promise.all([
                timeManagementService.getAllAssignments().catch((err) => {
                    console.error('Assignments error:', err);
                    return { data: [] };
                }),
                timeManagementService.getShifts().catch((err) => {
                    console.error('Shifts error:', err);
                    return { data: [] };
                }),
                employeeProfileService.getAllEmployees(1, 100).catch((err) => {
                    console.error('Employees error:', err);
                    return { data: [] };
                }),
                organizationStructureService.getDepartments().catch((err) => {
                    console.error('Departments error:', err);
                    return { data: [] };
                }),
                organizationStructureService.getPositions().catch((err) => {
                    console.error('Positions error:', err);
                    return { data: [] };
                }),
            ]);

            console.log('empRes:', empRes);
            console.log('deptRes:', deptRes);
            console.log('posRes:', posRes);

            const assignData = extractArrayData(assignRes, 'ASSIGNMENTS');
            const shiftsData = extractArrayData(shiftsRes, 'SHIFTS');
            const empData = extractArrayData(empRes, 'EMPLOYEES');
            const deptData = extractArrayData(deptRes, 'DEPARTMENTS');
            const posData = extractArrayData(posRes, 'POSITIONS');

            console.log('empData extracted:', empData);
            console.log('deptData extracted:', deptData);
            console.log('posData extracted:', posData);

            setAssignments(assignData.filter(Boolean));
            setShifts(shiftsData.filter(Boolean));
            setEmployees(empData.filter(Boolean));
            setDepartments(deptData.filter(Boolean));
            setPositions(posData.filter(Boolean));
        } catch (err: any) {
            console.error('Error fetching data:', err);
            setError('Failed to load shift assignments');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllData();
    }, []);

    const handleAssignShift = async () => {
        try {
            if (!selectedShift || !startDate) {
                setError('Please select a shift and start date');
                return;
            }

            let targetId = '';
            if (assignmentType === 'employee' && !selectedEmployee) {
                setError('Please select an employee');
                return;
            } else if (assignmentType === 'employee') {
                targetId = selectedEmployee;
            } else if (assignmentType === 'department' && !selectedDepartment) {
                setError('Please select a department');
                return;
            } else if (assignmentType === 'department') {
                targetId = selectedDepartment;
            } else if (assignmentType === 'position' && !selectedPosition) {
                setError('Please select a position');
                return;
            } else if (assignmentType === 'position') {
                targetId = selectedPosition;
            }

            setLoading(true);

            const assignDto: any = {
                shiftId: selectedShift,
                startDate,
                endDate: endDate || undefined,
                status: ShiftAssignmentStatus.PENDING,
            };

            if (assignmentType === 'employee') {
                assignDto.employeeId = targetId;
            } else if (assignmentType === 'department') {
                assignDto.departmentId = targetId;
            } else if (assignmentType === 'position') {
                assignDto.positionId = targetId;
            }

            await timeManagementService.assignShift(assignDto);
            setSuccess('Shift assigned successfully!');

            // Reset form
            setSelectedEmployee('');
            setSelectedDepartment('');
            setSelectedPosition('');
            setSelectedShift('');
            setStartDate(new Date().toISOString().split('T')[0]);
            setEndDate('');
            setShowAssignModal(false);

            setTimeout(() => {
                setSuccess(null);
                fetchAllData();
            }, 2000);
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Failed to assign shift');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (assignmentId: string, newStatus: ShiftAssignmentStatus) => {
        try {
            setLoading(true);
            await timeManagementService.updateAssignmentStatus(assignmentId, {
                status: newStatus,
                updatedBy: user?.id,
            });
            setSuccess('Assignment status updated successfully!');
            setTimeout(() => {
                setSuccess(null);
                fetchAllData();
            }, 2000);
        } catch (err: any) {
            setError(err?.message || 'Failed to update status');
        } finally {
            setLoading(false);
        }
    };

    const getShiftName = (shiftId: string) => {
        return shifts.find(s => s._id === shiftId)?.name || 'Unknown';
    };

    const getStatusBadgeClass = (status: string) => {
        switch (status) {
            case ShiftAssignmentStatus.APPROVED:
                return 'bg-success/15 text-success border border-success/30';
            case ShiftAssignmentStatus.PENDING:
                return 'bg-warning/15 text-warning border border-warning/30';
            case ShiftAssignmentStatus.CANCELLED:
                return 'bg-destructive/15 text-destructive border border-destructive/30';
            case ShiftAssignmentStatus.EXPIRED:
                return 'bg-muted/50 text-muted-foreground border border-border';
            default:
                return 'bg-muted/50 text-muted-foreground border border-border';
        }
    };

    const filteredAssignments = assignments.filter(a => {
        if (statusFilter !== 'ALL' && a.status !== statusFilter) return false;

        if (viewType === 'employee') return a.employeeId && a.employeeId !== '';
        if (viewType === 'department') return a.departmentId && a.departmentId !== '';
        if (viewType === 'position') return a.positionId && a.positionId !== '';

        return true;
    });

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-6 relative">
            {/* Theme Customizer */}
            <div className="fixed bottom-6 right-6 z-40">
                <ThemeCustomizerTrigger onClick={() => setShowThemeCustomizer(true)} />
            </div>

            {showThemeCustomizer && (
                <ThemeCustomizer open={showThemeCustomizer} onOpenChange={setShowThemeCustomizer} />
            )}

            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Shift Assignments</h1>
                        <p className="text-muted-foreground">Manage and assign shifts to employees, departments, or positions</p>
                    </div>
                    <button
                        onClick={() => setShowAssignModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
                    >
                        <Plus className="h-4 w-4" />
                        Assign Shift
                    </button>
                </div>

                {/* Alerts */}
                {error && (
                    <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">
                        {error}
                    </div>
                )}
                {success && (
                    <div className="p-4 bg-success/10 border border-success/30 rounded-lg text-success text-sm">
                        {success}
                    </div>
                )}

                {/* View Type Tabs */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-primary" />
                            Assignment Type
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-4">
                            {(['employee', 'department', 'position'] as const).map((type) => (
                                <button
                                    key={type}
                                    onClick={() => setViewType(type)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium ${
                                        viewType === type
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                    }`}
                                >
                                    {type === 'employee' && <Users className="h-4 w-4" />}
                                    {type === 'department' && <Building2 className="h-4 w-4" />}
                                    {type === 'position' && <Briefcase className="h-4 w-4" />}
                                    <span className="capitalize">{type}</span>
                                    <span className="text-xs ml-1">
                                        ({assignments.filter((a) =>
                                            type === 'employee' ? a.employeeId :
                                                type === 'department' ? a.departmentId :
                                                    a.positionId
                                        ).length})
                                    </span>
                                </button>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Status Filter */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Clock className="h-4 w-4 text-primary" />
                            Filter by Status
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {(['ALL', ShiftAssignmentStatus.PENDING, ShiftAssignmentStatus.APPROVED, ShiftAssignmentStatus.CANCELLED, ShiftAssignmentStatus.EXPIRED] as const).map((status) => (
                                <button
                                    key={status}
                                    onClick={() => setStatusFilter(status)}
                                    className={`px-4 py-2 rounded-lg transition-colors font-medium text-sm ${
                                        statusFilter === status
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                    }`}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Assignments Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Shift Assignments</CardTitle>
                        <CardDescription>{filteredAssignments.length} assignments</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex justify-center py-8">
                                <div className="text-muted-foreground">Loading assignments...</div>
                            </div>
                        ) : filteredAssignments.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                No shift assignments found
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="border-b bg-muted/30">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-sm font-semibold text-muted-foreground">
                                                {viewType === 'employee' && 'Employee'}
                                                {viewType === 'department' && 'Department'}
                                                {viewType === 'position' && 'Position'}
                                            </th>
                                            <th className="px-6 py-3 text-left text-sm font-semibold text-muted-foreground">
                                                Shift
                                            </th>
                                            <th className="px-6 py-3 text-left text-sm font-semibold text-muted-foreground">
                                                Start Date
                                            </th>
                                            <th className="px-6 py-3 text-left text-sm font-semibold text-muted-foreground">
                                                End Date
                                            </th>
                                            <th className="px-6 py-3 text-left text-sm font-semibold text-muted-foreground">
                                                Status
                                            </th>
                                            <th className="px-6 py-3 text-left text-sm font-semibold text-muted-foreground">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredAssignments.map((assignment) => {
                                            const employee = employees.find(e => e._id === assignment.employeeId);
                                            const empName = employee ? `${employee.firstName || ''} ${employee.lastName || ''}`.trim() : 'N/A';
                                            const deptName = departments.find(d => d._id === assignment.departmentId)?.name || 'N/A';
                                            const posName = positions.find(p => p._id === assignment.positionId)?.title || 'N/A';

                                            return (
                                                <tr key={assignment._id} className="border-b hover:bg-muted/30 transition-colors">
                                                    <td className="px-6 py-4 text-sm text-foreground font-medium">
                                                        {viewType === 'employee' && empName}
                                                        {viewType === 'department' && deptName}
                                                        {viewType === 'position' && posName}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-foreground">
                                                        {getShiftName(assignment.shiftId)}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-muted-foreground">
                                                        {new Date(assignment.startDate).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-muted-foreground">
                                                        {assignment.endDate ? new Date(assignment.endDate).toLocaleDateString() : '—'}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm">
                                                        <Badge className={`${getStatusBadgeClass(assignment.status)} inline-flex`}>
                                                            {assignment.status}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm space-x-2">
                                                        <button
                                                            onClick={() => {
                                                                setSelectedAssignment(assignment);
                                                                setShowViewModal(true);
                                                            }}
                                                            className="inline-flex items-center gap-1 px-3 py-1 border border-border rounded-lg hover:bg-muted/30 transition-colors"
                                                        >
                                                            <Eye className="h-3 w-3" />
                                                            View
                                                        </button>
                                                        {assignment.status === ShiftAssignmentStatus.PENDING && (
                                                            <>
                                                                <button
                                                                    onClick={() => handleStatusUpdate(assignment._id, ShiftAssignmentStatus.APPROVED)}
                                                                    className="inline-flex items-center gap-1 px-3 py-1 bg-success text-success-foreground rounded-lg hover:bg-success/90 transition-colors"
                                                                >
                                                                    <Check className="h-3 w-3" />
                                                                    Approve
                                                                </button>
                                                                <button
                                                                    onClick={() => handleStatusUpdate(assignment._id, ShiftAssignmentStatus.CANCELLED)}
                                                                    className="inline-flex items-center gap-1 px-3 py-1 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors"
                                                                >
                                                                    <XCircle className="h-3 w-3" />
                                                                    Reject
                                                                </button>
                                                            </>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Assign Shift Modal */}
            {showAssignModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-md">
                        <CardHeader className="flex flex-row items-center justify-between pb-3">
                            <CardTitle>Assign Shift</CardTitle>
                            <button
                                onClick={() => setShowAssignModal(false)}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Assignment Type */}
                            <div>
                                <label className="text-sm font-medium text-foreground block mb-2">Assignment Type</label>
                                <div className="flex gap-2">
                                    {(['employee', 'department', 'position'] as const).map((type) => (
                                        <button
                                            key={type}
                                            onClick={() => {
                                                setAssignmentType(type);
                                                setSelectedEmployee('');
                                                setSelectedDepartment('');
                                                setSelectedPosition('');
                                            }}
                                            className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors ${
                                                assignmentType === type
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                            }`}
                                        >
                                            {type.charAt(0).toUpperCase() + type.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Employee Select */}
                            {assignmentType === 'employee' && (
                                <div>
                                    <label className="text-sm font-medium text-foreground block mb-2">Select Employee</label>
                                    <select
                                        value={selectedEmployee}
                                        onChange={(e) => setSelectedEmployee(e.target.value)}
                                        className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground bg-background"
                                    >
                                        <option value="">Choose an employee...</option>
                                        {employees.map((emp) => (
                                            <option key={emp._id} value={emp._id}>
                                                {emp.firstName} {emp.lastName}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Department Select */}
                            {assignmentType === 'department' && (
                                <div>
                                    <label className="text-sm font-medium text-foreground block mb-2">Select Department</label>
                                    <select
                                        value={selectedDepartment}
                                        onChange={(e) => setSelectedDepartment(e.target.value)}
                                        className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground bg-background"
                                    >
                                        <option value="">Choose a department...</option>
                                        {departments.map((dept) => (
                                            <option key={dept._id} value={dept._id}>
                                                {dept.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Position Select */}
                            {assignmentType === 'position' && (
                                <div>
                                    <label className="text-sm font-medium text-foreground block mb-2">Select Position</label>
                                    <select
                                        value={selectedPosition}
                                        onChange={(e) => setSelectedPosition(e.target.value)}
                                        className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground bg-background"
                                    >
                                        <option value="">Choose a position...</option>
                                        {positions.map((pos) => (
                                            <option key={pos._id} value={pos._id}>
                                                {pos.title}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Shift Select */}
                            <div>
                                <label className="text-sm font-medium text-foreground block mb-2">Select Shift</label>
                                <select
                                    value={selectedShift}
                                    onChange={(e) => setSelectedShift(e.target.value)}
                                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground bg-background"
                                >
                                    <option value="">Choose a shift...</option>
                                    {shifts.map((shift) => (
                                        <option key={shift._id} value={shift._id}>
                                            {shift.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Start Date */}
                            <div>
                                <label className="text-sm font-medium text-foreground block mb-2">Start Date</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground bg-background"
                                />
                            </div>

                            {/* End Date */}
                            <div>
                                <label className="text-sm font-medium text-foreground block mb-2">End Date (Optional)</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground bg-background"
                                />
                            </div>

                            {/* Buttons */}
                            <div className="flex gap-2 pt-4">
                                <button
                                    onClick={() => setShowAssignModal(false)}
                                    className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted/30 transition-colors text-foreground font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAssignShift}
                                    disabled={loading}
                                    className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50"
                                >
                                    Assign
                                </button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* View Assignment Modal */}
            {showViewModal && selectedAssignment && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-md">
                        <CardHeader className="flex flex-row items-center justify-between pb-3">
                            <CardTitle>Assignment Details</CardTitle>
                            <button
                                onClick={() => setShowViewModal(false)}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <p className="text-sm text-muted-foreground">Shift</p>
                                <p className="font-medium text-foreground">{getShiftName(selectedAssignment.shiftId)}</p>
                            </div>

                            {selectedAssignment.employeeId && (
                                <div>
                                    <p className="text-sm text-muted-foreground">Employee</p>
                                    <p className="font-medium text-foreground">
                                        {(() => {
                                            const emp = employees.find(e => e._id === selectedAssignment.employeeId);
                                            return emp ? `${emp.firstName || ''} ${emp.lastName || ''}`.trim() : 'N/A';
                                        })()}
                                    </p>
                                </div>
                            )}

                            {selectedAssignment.departmentId && (
                                <div>
                                    <p className="text-sm text-muted-foreground">Department</p>
                                    <p className="font-medium text-foreground">
                                        {departments.find(d => d._id === selectedAssignment.departmentId)?.name}
                                    </p>
                                </div>
                            )}

                            {selectedAssignment.positionId && (
                                <div>
                                    <p className="text-sm text-muted-foreground">Position</p>
                                    <p className="font-medium text-foreground">
                                        {positions.find(p => p._id === selectedAssignment.positionId)?.title}
                                    </p>
                                </div>
                            )}

                            <div>
                                <p className="text-sm text-muted-foreground">Start Date</p>
                                <p className="font-medium text-foreground">
                                    {new Date(selectedAssignment.startDate).toLocaleDateString()}
                                </p>
                            </div>

                            {selectedAssignment.endDate && (
                                <div>
                                    <p className="text-sm text-muted-foreground">End Date</p>
                                    <p className="font-medium text-foreground">
                                        {new Date(selectedAssignment.endDate).toLocaleDateString()}
                                    </p>
                                </div>
                            )}

                            <div>
                                <p className="text-sm text-muted-foreground">Status</p>
                                <Badge className={`mt-1 ${getStatusBadgeClass(selectedAssignment.status)} inline-flex`}>
                                    {selectedAssignment.status}
                                </Badge>
                            </div>

                            <button
                                onClick={() => setShowViewModal(false)}
                                className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
                            >
                                Close
                            </button>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { timeManagementService } from '@/app/services/time-management';
import { employeeProfileService } from '@/app/services/employee-profile';

interface EmployeeWithLateness {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    department?: string;
    position?: string;
    latenessCount: number;
    escalationStatus?: 'ESCALATED' | 'NORMAL';
    lastUpdated?: string;
}

interface EmployeesResponseData {
    employees?: Array<{
        _id: string;
        firstName: string;
        lastName: string;
        email: string;
        department?: { name: string };
        departmentId?: { name: string };
        position?: { name: string };
        positionId?: { name: string };
    }>;
}

interface LatenessCountResponse {
    data?: number;
}

interface EvaluateLatenessResponse {
    data?: {
        escalated?: boolean;
        count?: number;
        alreadyEscalated?: boolean;
    };
}

export default function RepeatedLatenessPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Data state
    const [employees, setEmployees] = useState<EmployeeWithLateness[]>([]);
    const [allEmployeesLateness, setAllEmployeesLateness] = useState<EmployeeWithLateness[]>([]); // All records including 0 lateness
    const [filteredEmployees, setFilteredEmployees] = useState<EmployeeWithLateness[]>([]);

    // Filter & search state
    const [searchTerm, setSearchTerm] = useState('');
    const [filterByThreshold, setFilterByThreshold] = useState<number | null>(null);
    const [sortBy, setSortBy] = useState<'name' | 'lateness' | 'department'>('lateness');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [viewMode, setViewMode] = useState<'flagged' | 'all'>('flagged'); // New view mode state

    // Modal state for evaluation
    const [showEvaluateModal, setShowEvaluateModal] = useState(false);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
    const [evaluateWindowDays, setEvaluateWindowDays] = useState(90);
    const [evaluateThreshold, setEvaluateThreshold] = useState(3);
    const [evaluatingEmployeeId, setEvaluatingEmployeeId] = useState<string | null>(null);

    // Configuration state
    const latenessConfig = {
        defaultWindowDays: 90,
        defaultThreshold: 3,
    };

    /**
     * Fetch all employees and their lateness counts
     */
    const fetchEmployeesWithLateness = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // Fetch all employees with pagination (large limit to get all)
            const employeesResponse = await employeeProfileService.getAllEmployees(1, 1000) as EmployeesResponseData;
            const allEmployees = employeesResponse?.employees || [];

            // Fetch lateness count for each employee
            const employeesWithLateness: EmployeeWithLateness[] = await Promise.all(
                allEmployees.map(async (emp: any) => {
                    try {
                        const latenessResponse = await timeManagementService.getRepeatedLatenessCount(emp._id) as LatenessCountResponse;
                        const latenessCount = latenessResponse?.data || 0;

                        return {
                            _id: emp._id,
                            firstName: emp.firstName || '',
                            lastName: emp.lastName || '',
                            email: emp.email || '',
                            department: emp.department?.name || emp.departmentId?.name || 'N/A',
                            position: emp.position?.name || emp.positionId?.name || 'N/A',
                            latenessCount: latenessCount,
                            lastUpdated: new Date().toISOString(),
                        };
                    } catch (err) {
                        console.warn(`Failed to fetch lateness count for employee ${emp._id}`, err);
                        return {
                            _id: emp._id,
                            firstName: emp.firstName || '',
                            lastName: emp.lastName || '',
                            email: emp.email || '',
                            department: emp.department?.name || emp.departmentId?.name || 'N/A',
                            position: emp.position?.name || emp.positionId?.name || 'N/A',
                            latenessCount: 0,
                            lastUpdated: new Date().toISOString(),
                        };
                    }
                })
            );

            // Filter out employees with 0 lateness
            const flaggedList = employeesWithLateness.filter(emp => emp.latenessCount > 0);
            setEmployees(flaggedList);
            setAllEmployeesLateness(employeesWithLateness); // Store all records
            setFilteredEmployees(flaggedList);
        } catch (err: any) {
            console.error('Failed to fetch employees:', err);
            setError(err?.response?.data?.message || err?.message || 'Failed to load employees');
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Apply filters and sorting to employees
     */
    useEffect(() => {
        // Start with the appropriate dataset based on view mode
        let filtered = viewMode === 'all' ? [...allEmployeesLateness] : [...employees];

        // Search filter - by employee ID, name, email, or department
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(emp =>
                emp._id.toLowerCase().includes(term) ||
                emp.firstName.toLowerCase().includes(term) ||
                emp.lastName.toLowerCase().includes(term) ||
                emp.email.toLowerCase().includes(term) ||
                emp.department?.toLowerCase().includes(term)
            );
        }

        // Threshold filter
        if (filterByThreshold !== null) {
            filtered = filtered.filter(emp => emp.latenessCount >= filterByThreshold);
        }

        // Sorting
        filtered.sort((a, b) => {
            let compareValue = 0;

            if (sortBy === 'name') {
                compareValue = `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
            } else if (sortBy === 'lateness') {
                compareValue = a.latenessCount - b.latenessCount;
            } else if (sortBy === 'department') {
                compareValue = (a.department || '').localeCompare(b.department || '');
            }

            return sortOrder === 'asc' ? compareValue : -compareValue;
        });

        setFilteredEmployees(filtered);
    }, [employees, allEmployeesLateness, viewMode, searchTerm, filterByThreshold, sortBy, sortOrder]);

    /**
     * Handle evaluate and escalate for an employee
     */
    const handleEvaluateEmployee = async () => {
        if (!selectedEmployeeId) return;

        try {
            setEvaluatingEmployeeId(selectedEmployeeId);

            const response = await timeManagementService.evaluateRepeatedLateness(
                selectedEmployeeId,
                {
                    windowDays: evaluateWindowDays,
                    threshold: evaluateThreshold,
                }
            ) as EvaluateLatenessResponse;

            if (response?.data?.escalated) {
                setSuccess(
                    `Escalation created for employee. ${response.data.count || 0} late events found in the last ${evaluateWindowDays} days.`
                );
            } else if (response?.data?.alreadyEscalated) {
                setSuccess('Employee already has an active escalation.');
            } else {
                setSuccess(
                    `No escalation needed. Employee has ${response.data?.count || 0} late events (threshold: ${evaluateThreshold}).`
                );
            }

            // Refresh the data
            await fetchEmployeesWithLateness();
            setShowEvaluateModal(false);
        } catch (err: any) {
            console.error('Failed to evaluate repeated lateness:', err);
            setError(err?.message || 'Failed to evaluate repeated lateness');
        } finally {
            setEvaluatingEmployeeId(null);
        }
    };

    /**
     * Open evaluate modal
     */
    const openEvaluateModal = (employeeId: string) => {
        setSelectedEmployeeId(employeeId);
        setEvaluateWindowDays(latenessConfig.defaultWindowDays);
        setEvaluateThreshold(latenessConfig.defaultThreshold);
        setShowEvaluateModal(true);
    };

    /**
     * Close evaluate modal
     */
    const closeEvaluateModal = () => {
        setShowEvaluateModal(false);
        setSelectedEmployeeId(null);
    };

    // Initial load
    useEffect(() => {
        fetchEmployeesWithLateness();
    }, [fetchEmployeesWithLateness]);

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Repeated Lateness Tracking</h1>
                    <p className="mt-2 text-gray-600">
                        Monitor and flag repeated offenders for disciplinary action and tracking
                    </p>
                </div>

                {/* Alert Messages */}
                {error && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-800">{error}</p>
                    </div>
                )}
                {success && (
                    <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-green-800">{success}</p>
                    </div>
                )}

                {/* Controls Section */}
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    {/* View Mode Toggle */}
                    <div className="mb-6 flex gap-2">
                        <button
                            onClick={() => setViewMode('flagged')}
                            className={`px-4 py-2 rounded-md font-medium transition-colors ${
                                viewMode === 'flagged'
                                    ? 'bg-red-600 text-white'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                        >
                            Flagged Only ({employees.length})
                        </button>
                        <button
                            onClick={() => setViewMode('all')}
                            className={`px-4 py-2 rounded-md font-medium transition-colors ${
                                viewMode === 'all'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                        >
                            View All ({allEmployeesLateness.length})
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Search */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Search
                            </label>
                            <input
                                type="text"
                                placeholder="ID, name, email, or department..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>

                        {/* Filter by Threshold */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Minimum Lateness Count
                            </label>
                            <select
                                value={filterByThreshold?.toString() || ''}
                                onChange={(e) => setFilterByThreshold(e.target.value ? Number(e.target.value) : null)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">All</option>
                                <option value="2">2+</option>
                                <option value="3">3+</option>
                                <option value="5">5+</option>
                                <option value="10">10+</option>
                            </select>
                        </div>

                        {/* Sort By */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Sort By
                            </label>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as 'name' | 'lateness' | 'department')}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="lateness">Lateness Count</option>
                                <option value="name">Employee Name</option>
                                <option value="department">Department</option>
                            </select>
                        </div>

                        {/* Sort Order */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Order
                            </label>
                            <select
                                value={sortOrder}
                                onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="desc">Descending</option>
                                <option value="asc">Ascending</option>
                            </select>
                        </div>
                    </div>

                    {/* Refresh Button */}
                    <div className="mt-4 flex justify-end">
                        <button
                            onClick={fetchEmployeesWithLateness}
                            disabled={loading}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {loading ? 'Refreshing...' : 'Refresh Data'}
                        </button>
                    </div>
                </div>

                {/* Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-500 text-sm font-medium">Total Employees</p>
                                <p className="text-3xl font-bold text-gray-900">{employees.length}</p>
                            </div>
                            <div className="bg-blue-100 rounded-full p-3">
                                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-2a6 6 0 0112 0v2z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-500 text-sm font-medium">Avg Lateness Count</p>
                                <p className="text-3xl font-bold text-gray-900">
                                    {employees.length > 0
                                        ? (employees.reduce((sum, emp) => sum + emp.latenessCount, 0) / employees.length).toFixed(1)
                                        : 0}
                                </p>
                            </div>
                            <div className="bg-yellow-100 rounded-full p-3">
                                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-500 text-sm font-medium">High Offenders (5+)</p>
                                <p className="text-3xl font-bold text-gray-900">
                                    {employees.filter(emp => emp.latenessCount >= 5).length}
                                </p>
                            </div>
                            <div className="bg-red-100 rounded-full p-3">
                                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4v2m0 4v2M6.458 20H3a1 1 0 01-1-1V4a1 1 0 011-1h18a1 1 0 011 1v15a1 1 0 01-1 1h-3.458" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Employees Table */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    {loading ? (
                        <div className="p-8 text-center">
                            <p className="text-gray-500">Loading employees...</p>
                        </div>
                    ) : filteredEmployees.length === 0 ? (
                        <div className="p-8 text-center">
                            <p className="text-gray-500">
                                {employees.length === 0
                                    ? 'No employees with lateness records found.'
                                    : 'No employees match the current filters.'}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Employee
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Email
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Department
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Position
                                    </th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Lateness Count
                                    </th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                {filteredEmployees.map((employee) => (
                                    <tr key={employee._id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                                                    {`${employee.firstName[0]}${employee.lastName[0]}`.toUpperCase()}
                                                </div>
                                                <div className="ml-4">
                                                    <p className="text-sm font-medium text-gray-900">
                                                        {employee.firstName} {employee.lastName}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                            {employee.email}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                            {employee.department || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                            {employee.position || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span
                            className={`inline-flex items-center justify-center h-8 w-8 rounded-full font-bold text-sm ${
                                employee.latenessCount >= 5
                                    ? 'bg-red-100 text-red-800'
                                    : employee.latenessCount >= 3
                                        ? 'bg-yellow-100 text-yellow-800'
                                        : 'bg-orange-100 text-orange-800'
                            }`}
                        >
                          {employee.latenessCount}
                        </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            {employee.latenessCount >= 5 ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            High Risk
                          </span>
                                            ) : employee.latenessCount >= 3 ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Medium Risk
                          </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            Low Risk
                          </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                            <button
                                                onClick={() => openEvaluateModal(employee._id)}
                                                disabled={evaluatingEmployeeId === employee._id}
                                                className="text-blue-600 hover:text-blue-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                            >
                                                {evaluatingEmployeeId === employee._id ? 'Evaluating...' : 'Flag'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Results Info */}
                {!loading && filteredEmployees.length > 0 && (
                    <div className="mt-4 text-sm text-gray-600">
                        Showing {filteredEmployees.length} of {viewMode === 'all' ? allEmployeesLateness.length : employees.length} employees with lateness records
                    </div>
                )}
            </div>

            {/* Evaluate Modal */}
            {showEvaluateModal && selectedEmployeeId && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">
                            Flag Employee for Discipline Review
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Time Window (Days)
                                </label>
                                <input
                                    type="number"
                                    value={evaluateWindowDays}
                                    onChange={(e) => setEvaluateWindowDays(Number(e.target.value))}
                                    min="1"
                                    max="365"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Review lateness records from the last X days
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Escalation Threshold
                                </label>
                                <input
                                    type="number"
                                    value={evaluateThreshold}
                                    onChange={(e) => setEvaluateThreshold(Number(e.target.value))}
                                    min="1"
                                    max="50"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Flag for discipline if lateness count exceeds this threshold
                                </p>
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded p-3">
                                <p className="text-sm text-blue-800">
                                    <strong>Note:</strong> This action will evaluate the employee's lateness record and create an escalation if the threshold is met.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={closeEvaluateModal}
                                disabled={evaluatingEmployeeId !== null}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleEvaluateEmployee}
                                disabled={evaluatingEmployeeId !== null}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {evaluatingEmployeeId === selectedEmployeeId ? 'Processing...' : 'Flag for Discipline'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


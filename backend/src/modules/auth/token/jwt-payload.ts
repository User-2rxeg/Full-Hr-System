import { SystemRole } from '../../employee/enums/employee-profile.enums';

export interface JwtPayload {
    sub: string;   // user._id (employeeProfile._id or candidate._id)
    email: string;
    roles: SystemRole[]; // array of roles from EmployeeSystemRole
    userType: 'employee' | 'candidate'; // distinguish between employee and candidate
}

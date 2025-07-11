// src/types/Employee.ts
export interface EmployeeDetails {
  Id: number;
  Title: string;
  DepartmentId: number | string;
  DepartmentTitle: string;
  RoleId: number | string;
  RoleName: string;
  RoleSequence: string;
  IsActive: boolean;
  PlantId: number | string;
  PlantTitle: string;
}


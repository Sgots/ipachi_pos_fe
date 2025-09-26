export interface Customer {
  id: number;
  firstname: string;
  lastname: string;
  mobileNumber: string;
  identificationNumber: string;
  availableBalance: number;
  fingerprintTemplate: string | null;
}

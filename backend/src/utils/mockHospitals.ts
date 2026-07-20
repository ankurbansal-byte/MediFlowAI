export interface MockHospital {
  hospitalId: string;
  hospitalName: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  phone: string;
  email: string;
  website?: string;
  logo?: string;
  status: "active" | "inactive";
  createdAt: Date;
  updatedAt: Date;
}

export let dynamicMockHospitals: MockHospital[] = [
  {
    hospitalId: "HOSP-001",
    hospitalName: "MediFlow Hospital",
    address: "123 Healthcare Ave",
    city: "Metro City",
    state: "State",
    country: "Country",
    pincode: "123456",
    phone: "+15550199",
    email: "info@mediflowhospital.com",
    website: "https://mediflowhospital.com",
    logo: "https://mediflowhospital.com/logo.png",
    status: "active",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  }
];

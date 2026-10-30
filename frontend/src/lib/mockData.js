export const INITIAL_HOSPITALS = [
  {
    id: "hosp-1",
    name: "Nairobi Hospital Hub",
    county: "Nairobi",
    region: "nairobi",
    mapLabel: "Nairobi Hub",
    tier: "Level 6 / Tertiary Hub",
    coordinates: { lat: -1.2921, lng: 36.8219 },
    totalUnits: 142,
    stock: {
      "O-": { units: 6, daysOfCover: 5.8, status: "surplus", expiringIn48h: 4 },
      "O+": { units: 45, daysOfCover: 8.2, status: "safe" },
      "A+": { units: 32, daysOfCover: 6.5, status: "safe" },
      "A-": { units: 10, daysOfCover: 4.2, status: "safe" },
      "B+": { units: 28, daysOfCover: 7.1, status: "safe" },
      "B-": { units: 8, daysOfCover: 5.0, status: "safe" },
      "AB+": { units: 10, daysOfCover: 9.0, status: "safe" },
      "AB-": { units: 3, daysOfCover: 4.5, status: "safe" },
    }
  },
  {
    id: "hosp-2",
    name: "Kuresoi Sub-County Hospital",
    county: "Nakuru",
    region: "south_rift",
    mapLabel: "Kuresoi",
    tier: "Level 4 Sub-County",
    coordinates: { lat: -0.4821, lng: 35.7378 },
    totalUnits: 14,
    stock: {
      "O-": { units: 1, daysOfCover: 0.4, status: "critical", note: "Obstetric emergency pending" },
      "O+": { units: 4, daysOfCover: 2.1, status: "warning" },
      "A+": { units: 3, daysOfCover: 3.5, status: "safe" },
      "A-": { units: 1, daysOfCover: 1.2, status: "warning" },
      "B+": { units: 2, daysOfCover: 2.4, status: "warning" },
      "B-": { units: 1, daysOfCover: 2.0, status: "warning" },
      "AB+": { units: 2, daysOfCover: 6.0, status: "safe" },
      "AB-": { units: 0, daysOfCover: 0.0, status: "critical" },
    }
  },
  {
    id: "hosp-3",
    name: "Nakuru Level 5 Regional Hospital",
    county: "Nakuru",
    region: "south_rift",
    mapLabel: "Nakuru L5",
    tier: "Level 5 Regional Referral",
    coordinates: { lat: -0.2833, lng: 36.0667 },
    totalUnits: 88,
    stock: {
      "O-": { units: 5, daysOfCover: 3.8, status: "safe" },
      "O+": { units: 28, daysOfCover: 5.5, status: "safe" },
      "A+": { units: 20, daysOfCover: 4.8, status: "safe" },
      "A-": { units: 3, daysOfCover: 1.8, status: "warning" },
      "B+": { units: 16, daysOfCover: 4.2, status: "safe" },
      "B-": { units: 6, daysOfCover: 3.9, status: "safe" },
      "AB+": { units: 8, daysOfCover: 7.0, status: "safe" },
      "AB-": { units: 2, daysOfCover: 3.1, status: "safe" },
    }
  },
  {
    id: "hosp-4",
    name: "Naivasha District Hospital",
    county: "Nakuru",
    region: "south_rift",
    mapLabel: "Naivasha",
    tier: "Level 4 District Hospital",
    coordinates: { lat: -0.7172, lng: 36.4310 },
    totalUnits: 29,
    stock: {
      "O-": { units: 2, daysOfCover: 1.5, status: "warning" },
      "O+": { units: 10, daysOfCover: 3.2, status: "safe" },
      "A+": { units: 6, daysOfCover: 2.9, status: "safe" },
      "A-": { units: 2, daysOfCover: 2.1, status: "warning" },
      "B+": { units: 2, daysOfCover: 1.1, status: "critical" },
      "B-": { units: 3, daysOfCover: 3.0, status: "safe" },
      "AB+": { units: 3, daysOfCover: 5.0, status: "safe" },
      "AB-": { units: 1, daysOfCover: 2.5, status: "warning" },
    }
  },
  {
    id: "hosp-5",
    name: "Eldoret Referral & Teaching Hospital",
    county: "Uasin Gishu",
    region: "north_rift",
    mapLabel: "Eldoret",
    tier: "Level 6 / National Teaching Hub",
    coordinates: { lat: 0.5143, lng: 35.2698 },
    totalUnits: 118,
    stock: {
      "O-": { units: 7, daysOfCover: 4.6, status: "safe" },
      "O+": { units: 38, daysOfCover: 6.2, status: "safe" },
      "A+": { units: 26, daysOfCover: 5.4, status: "safe" },
      "A-": { units: 8, daysOfCover: 4.1, status: "safe" },
      "B+": { units: 22, daysOfCover: 5.0, status: "safe" },
      "B-": { units: 7, daysOfCover: 4.3, status: "safe" },
      "AB+": { units: 8, daysOfCover: 8.5, status: "safe" },
      "AB-": { units: 2, daysOfCover: 3.8, status: "safe" },
    }
  },
  {
    id: "hosp-nrb-2",
    name: "Mama Lucy Kibaki Hospital",
    county: "Nairobi",
    region: "nairobi",
    mapLabel: "Mama Lucy",
    tier: "Level 5",
    coordinates: { lat: -1.2742, lng: 36.8965 },
    totalUnits: 16,
    stock: {
      "O-": { units: 1, daysOfCover: 0.4, status: "critical", note: "Maternity theatre waiting" },
      "O+": { units: 5, daysOfCover: 2.2, status: "warning" },
      "A+": { units: 4, daysOfCover: 3.4, status: "safe" },
      "A-": { units: 1, daysOfCover: 1.4, status: "warning" },
      "B+": { units: 2, daysOfCover: 2.6, status: "warning" },
      "B-": { units: 1, daysOfCover: 2.1, status: "warning" },
      "AB+": { units: 2, daysOfCover: 5.5, status: "safe" },
      "AB-": { units: 0, daysOfCover: 0.0, status: "critical" },
    }
  },
  {
    id: "hosp-nrb-3",
    name: "Kiambu Level 5 Hospital",
    county: "Kiambu",
    region: "nairobi",
    mapLabel: "Kiambu L5",
    tier: "Level 5",
    coordinates: { lat: -1.1715, lng: 36.8308 },
    totalUnits: 29,
    stock: {
      "O-": { units: 3, daysOfCover: 2.4, status: "warning" },
      "O+": { units: 9, daysOfCover: 3.6, status: "safe" },
      "A+": { units: 6, daysOfCover: 3.1, status: "safe" },
      "A-": { units: 2, daysOfCover: 2.2, status: "warning" },
      "B+": { units: 2, daysOfCover: 1.1, status: "critical" },
      "B-": { units: 2, daysOfCover: 3.0, status: "safe" },
      "AB+": { units: 4, daysOfCover: 5.2, status: "safe" },
      "AB-": { units: 1, daysOfCover: 2.4, status: "warning" },
    }
  },
  {
    id: "hosp-nrb-4",
    name: "Thika Level 5 Hospital",
    county: "Kiambu",
    region: "nairobi",
    mapLabel: "Thika L5",
    tier: "Level 5",
    coordinates: { lat: -1.0392, lng: 37.0834 },
    totalUnits: 74,
    stock: {
      "O-": { units: 6, daysOfCover: 4.8, status: "safe" },
      "O+": { units: 22, daysOfCover: 6.1, status: "safe" },
      "A+": { units: 16, daysOfCover: 5.2, status: "safe" },
      "A-": { units: 4, daysOfCover: 3.4, status: "safe" },
      "B+": { units: 12, daysOfCover: 4.6, status: "safe" },
      "B-": { units: 4, daysOfCover: 3.8, status: "safe" },
      "AB+": { units: 8, daysOfCover: 7.2, status: "safe" },
      "AB-": { units: 2, daysOfCover: 3.5, status: "safe" },
    }
  },
  {
    id: "hosp-nrb-5",
    name: "Machakos Level 5 Hospital",
    county: "Machakos",
    region: "nairobi",
    mapLabel: "Machakos L5",
    tier: "Level 5",
    coordinates: { lat: -1.5177, lng: 37.2634 },
    totalUnits: 48,
    stock: {
      "O-": { units: 4, daysOfCover: 3.2, status: "safe" },
      "O+": { units: 14, daysOfCover: 4.4, status: "safe" },
      "A+": { units: 10, daysOfCover: 3.9, status: "safe" },
      "A-": { units: 2, daysOfCover: 1.6, status: "warning" },
      "B+": { units: 8, daysOfCover: 3.5, status: "safe" },
      "B-": { units: 3, daysOfCover: 3.1, status: "safe" },
      "AB+": { units: 5, daysOfCover: 6.0, status: "safe" },
      "AB-": { units: 2, daysOfCover: 3.3, status: "safe" },
    }
  }
];

export const INITIAL_ALERTS = [
  {
    id: "alert-201",
    region: "nairobi",
    facility: "Mama Lucy Kibaki Hospital",
    bloodGroup: "O-",
    unitsRemaining: 1,
    daysOfCover: 0.4,
    depletionCountdown: "09h 14m",
    urgency: "CRITICAL",
    surgeContext: "Maternity theatre queue inside Nairobi Region",
    suggestedSource: "Nairobi Hospital Hub"
  },
  {
    id: "alert-202",
    region: "nairobi",
    facility: "Kiambu Level 5 Hospital",
    bloodGroup: "B+",
    unitsRemaining: 2,
    daysOfCover: 1.1,
    depletionCountdown: "26h 40m",
    urgency: "URGENT",
    surgeContext: "Thika Road trauma intake",
    suggestedSource: "Thika Level 5 Hospital"
  },
  {
    id: "alert-101",
    region: "south_rift",
    facility: "Kuresoi Sub-County Hospital",
    bloodGroup: "O-",
    unitsRemaining: 1,
    daysOfCover: 0.4,
    depletionCountdown: "09h 14m",
    urgency: "CRITICAL",
    surgeContext: "Emergency Postpartum Hemorrhage & Scheduled C-Section triage",
    suggestedSource: "Nakuru Level 5 Regional Hospital"
  },
  {
    id: "alert-102",
    region: "south_rift",
    facility: "Naivasha District Hospital",
    bloodGroup: "B+",
    unitsRemaining: 2,
    daysOfCover: 1.1,
    depletionCountdown: "26h 40m",
    urgency: "URGENT",
    surgeContext: "Highway Trauma Ward intake along A104 corridor",
    suggestedSource: "Nakuru Level 5 Regional Hospital"
  },
  {
    id: "alert-103",
    region: "south_rift",
    facility: "Nakuru Level 5 Regional Hospital",
    bloodGroup: "A-",
    unitsRemaining: 3,
    daysOfCover: 1.8,
    depletionCountdown: "43h 10m",
    urgency: "MODERATE",
    surgeContext: "Pediatric oncology scheduled transfusions",
    suggestedSource: "Naivasha District Hospital"
  }
];

export const INITIAL_PROPOSALS = [
  {
    id: "TR-2026-0414",
    region: "nairobi",
    manifestId: "MF-0414",
    status: "PENDING_APPROVAL",
    createdAt: "2 mins ago",
    donor: {
      name: "Nairobi Hospital Hub",
      tier: "Level 6 Hub",
      distance: "8.4 km",
      transitTime: "29 mins",
      postTransferCoverDays: 5.2,
      reservePostTransfer: "5.2 Days",
      reserveStatus: "SAFE"
    },
    recipient: {
      name: "Mama Lucy Kibaki Hospital",
      tier: "Level 5",
      urgency: "CRITICAL (<24h)",
      reason: "Maternity theatre emergency"
    },
    allocatedUnits: [
      { id: "BB-8941", group: "O-", bloodType: "Packed RBC", expiresAt: "48h remaining", coldChain: "2.8°C" },
      { id: "BB-8944", group: "O-", bloodType: "Packed RBC", expiresAt: "48h remaining", coldChain: "3.1°C" }
    ],
    deterministicMetrics: {
      transitTimeMin: 29,
      distanceKm: 8.4,
      coldChainThreshold: "Max 4.0h in cold transport box (Viable)",
      shelfLifeConstraint: "Valid: 29m elapsed << 48h expiration window",
      donorReserveSafe: true
    },
    aiRationale: "Nairobi Hospital Hub holds O- units expiring within 48 hours. Releasing 2 units covers Mama Lucy Kibaki Hospital's maternity shortage while the donor keeps a 5.2-day reserve. The route stays inside Nairobi Region.",
    policyCitation: "MoH Emergency Transfer Guideline §4.2 (Nairobi Region inter-hospital redistribution)",
    verificationHash: "pg_hash_verified_9f82d1c"
  },
  {
    id: "TR-2026-0416",
    region: "south_rift",
    manifestId: "MF-0416",
    status: "PENDING_APPROVAL",
    createdAt: "6 mins ago",
    donor: {
      name: "Nakuru Level 5 Regional Hospital",
      tier: "Level 5 Regional Referral",
      distance: "42.7 km",
      transitTime: "67 mins",
      postTransferCoverDays: 4.1,
      reserveStatus: "SAFE"
    },
    recipient: {
      name: "Kuresoi Sub-County Hospital",
      tier: "Level 4 Sub-County",
      urgency: "CRITICAL (<24h)",
      reason: "Postpartum Hemorrhage Emergency"
    },
    allocatedUnits: [
      { id: "BB-9102", group: "O-", bloodType: "Packed RBC", expiresAt: "36h remaining", coldChain: "3.4°C" },
      { id: "BB-9108", group: "O-", bloodType: "Packed RBC", expiresAt: "40h remaining", coldChain: "3.2°C" }
    ],
    deterministicMetrics: {
      transitTimeMin: 67,
      distanceKm: 42.7,
      coldChainThreshold: "Max 4.0h in cold transport box (Viable)",
      shelfLifeConstraint: "Valid: 67m elapsed << 36h expiration window",
      donorReserveSafe: true
    },
    aiRationale: "Nakuru Level 5 can release 2 units of O- to Kuresoi Sub-County Hospital. The move stays inside South Rift Region and leaves the donor above a 3-day reserve.",
    policyCitation: "MoH Emergency Transfer Guideline §4.2 (South Rift inter-hospital redistribution)",
    verificationHash: "pg_hash_verified_rift_41c"
  }
];

// 4-Stage Linear Transfers Pipeline Data (Matches screenshot workflow)
export const INITIAL_TRANSFERS = [
  {
    id: "TR-2026-0414",
    region: "nairobi",
    manifestId: "MF-0414",
    donor: "Nairobi Hub",
    recipient: "Mama Lucy",
    group: "O-",
    quantity: 2,
    unitIds: ["#BB-8941", "#BB-8944"],
    distance: "8.4 km",
    estDuration: "29 min",
    stage: "APPROVED", // Stages: APPROVED -> COURIER_ASSIGNED -> IN_TRANSIT -> DELIVERED
    coldBox: "CB-08",
    createdAt: "Just approved"
  },
  {
    id: "TR-2026-0415",
    region: "nairobi",
    manifestId: "MF-0415",
    donor: "Thika L5",
    recipient: "Kiambu L5",
    group: "B+",
    quantity: 2,
    unitIds: ["#BB-8200", "#BB-8204"],
    distance: "18.2 km",
    estDuration: "40 min",
    stage: "APPROVED",
    coldBox: "CB-08",
    createdAt: "10 mins ago"
  },
  {
    id: "TR-2026-0413",
    region: "south_rift",
    manifestId: "MF-0413",
    donor: "Naivasha",
    recipient: "Njoro",
    group: "O+",
    quantity: 4,
    unitIds: ["#BB-8506", "#BB-8505", "#BB-8500", "#BB-8498"],
    distance: "41.7 km",
    estDuration: "50 min",
    stage: "IN_TRANSIT",
    courier: {
      driver: "Brian Mwaura",
      vehicle: "KDK 214V",
      coldBox: "CB-06",
      coordinator: "Hassan Abdi"
    },
    progressPercent: 95,
    remainingTime: "Arriving now",
    temperature: "4.0°C",
    createdAt: "42 mins ago"
  },
  {
    id: "TR-2026-0412",
    region: "south_rift",
    manifestId: "MF-0412",
    donor: "Nakuru",
    recipient: "Naivasha",
    group: "B+",
    quantity: 4,
    unitIds: ["#BB-8372", "#BB-8366", "#BB-8364", "#BB-8374"],
    distance: "25.5 km",
    estDuration: "31 min",
    stage: "DELIVERED",
    deliveredTime: "2 h ago",
    courier: {
      driver: "Brian Mwaura",
      vehicle: "KDK 214V",
      coldBox: "CB-05",
      coordinator: "Hassan Abdi"
    }
  },
  {
    id: "TR-2026-0409",
    region: "nairobi",
    manifestId: "MF-0409",
    donor: "Machakos L5",
    recipient: "Mama Lucy",
    group: "O+",
    quantity: 3,
    unitIds: ["#BB-8241", "#BB-8207", "#BB-8240"],
    distance: "49.2 km",
    estDuration: "74 min",
    stage: "DELIVERED",
    deliveredTime: "6 h ago",
    courier: {
      driver: "Brian Mwaura",
      vehicle: "KDK 214V",
      coldBox: "CB-07",
      coordinator: "Hassan Abdi"
    }
  }
];

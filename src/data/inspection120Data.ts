export interface Inspection120Question {
  id: string;
  question: string;
  passed: boolean;
  notes?: string;
}

export interface Inspection120Category {
  id: string;
  title: string;
  totalPoints: number;
  pointsPassedText: string;
  scorePercentageText: string;
  summary: string;
  questions: Inspection120Question[];
}

export interface VehicleMechanicalSpecs {
  engine: string;
  maxPower: string;
  peakTorque: string;
  transmission: string;
  araiMileage: string;
  idleStartStop: string;
}

export interface Full120PointReport {
  totalPassedPoints: number;
  totalPoints: number; // 120
  overallScorePercent: number; // 0 to 100
  grade: "A+" | "A" | "B+" | "B" | "C";
  certificationResult: "Certified" | "Certified After Minor Repairs" | "Major Repairs Required" | "Not Eligible for 1stCars Certified";
  isCertified: boolean;
  specs: VehicleMechanicalSpecs;
  keyFeatures: string[];
  categories: Inspection120Category[];
  notes: string;
  inspectorName?: string;
  inspectionDate?: string;
  workflowStage?: "inspected" | "admin_approved" | "bidding_open" | "offer_made_to_seller" | "purchased";
}

export const DEFAULT_MECHANICAL_SPECS: VehicleMechanicalSpecs = {
  engine: "1.2L DualJet Petrol Engine / 2.0L Turbocharged Diesel",
  maxPower: "118 bhp @ 6000 rpm",
  peakTorque: "172 Nm @ 1500-4000 rpm",
  transmission: "6-Speed Automatic / Manual Torque Converter",
  araiMileage: "20.5 km/l",
  idleStartStop: "Smart Engine Idle Start-Stop Active"
};

export const DEFAULT_KEY_FEATURES: string[] = [
  "120-Point Certified 1stMark Shield Guarantee",
  "Precision Reverse Parking Camera with Dynamic Guidelines",
  "Keyless Push-Button Engine Start / Stop",
  "Smart Touchscreen Infotainment with Apple CarPlay & Android Auto",
  "Automatic LED Projector Headlamps with Signature DRLs",
  "Precision-Cut Alloy Wheels with Excellent Tread",
  "Multi-Function Leather Steering Wheel with Cruise Control"
];

export const OFFICIAL_120_CATEGORIES: Inspection120Category[] = [
  {
    id: "cat_1",
    title: "1. Vehicle Identity & Documents (10 Points)",
    totalPoints: 10,
    pointsPassedText: "10 / 10 Points Passed",
    scorePercentageText: "100% PASS",
    summary: "All original documents verified with clear RTO & service records.",
    questions: [
      { id: "c1_1", question: "Registration Certificate (RC) Verification", passed: true },
      { id: "c1_2", question: "Chassis Number Verification (Stamped vs RC)", passed: true },
      { id: "c1_3", question: "Engine Number Verification", passed: true },
      { id: "c1_4", question: "Insurance Validity & Claim History", passed: true },
      { id: "c1_5", question: "PUC Certificate (Pollution Under Control)", passed: true },
      { id: "c1_6", question: "Service History & Maintenance Logs", passed: true },
      { id: "c1_7", question: "Owner Verification & ID Proof Cross-check", passed: true },
      { id: "c1_8", question: "Finance / Hypothecation Check (NOC Status)", passed: true },
      { id: "c1_9", question: "Duplicate Key Availability (2 Keys Tested)", passed: true },
      { id: "c1_10", question: "Odometer Verification & Anti-Tamper Scan", passed: true }
    ]
  },
  {
    id: "cat_2",
    title: "2. Exterior & Body Structure Inspection (20 Points)",
    totalPoints: 20,
    pointsPassedText: "20 / 20 Points Passed",
    scorePercentageText: "100% PASS",
    summary: "All 20 exterior panels verified with factory fitment gaps.",
    questions: [
      { id: "c2_1", question: "Front Bumper Alignment & Mounts", passed: true },
      { id: "c2_2", question: "Rear Bumper Fitment & Sensor Clips", passed: true },
      { id: "c2_3", question: "Bonnet / Hood Metal Alignment", passed: true },
      { id: "c2_4", question: "Roof Panel & Weather Channels", passed: true },
      { id: "c2_5", question: "Left Front Fender Alignment", passed: true },
      { id: "c2_6", question: "Right Front Fender Alignment", passed: true },
      { id: "c2_7", question: "Left Front Door Alignment & Hinges", passed: true },
      { id: "c2_8", question: "Right Front Door Alignment & Hinges", passed: true },
      { id: "c2_9", question: "Left Rear Door Alignment & Hinges", passed: true },
      { id: "c2_10", question: "Right Rear Door Alignment & Hinges", passed: true },
      { id: "c2_11", question: "Tailgate / Boot Lid Latch & Dampers", passed: true },
      { id: "c2_12", question: "Front Apron Frame Condition", passed: true },
      { id: "c2_13", question: "Left Apron Strut Tower Weld Integrity", passed: true },
      { id: "c2_14", question: "Right Apron Strut Tower Weld Integrity", passed: true },
      { id: "c2_15", question: "Front Cross Member / Radiator Support", passed: true },
      { id: "c2_16", question: "Boot Floor Panel Integrity", passed: true },
      { id: "c2_17", question: "Left Quarter Panel Metal Integrity", passed: true },
      { id: "c2_18", question: "Right Quarter Panel Metal Integrity", passed: true },
      { id: "c2_19", question: "Left A Pillar Spot Welds & Gap", passed: true },
      { id: "c2_20", question: "Right A Pillar Spot Welds & Gap", passed: true }
    ]
  },
  {
    id: "cat_3",
    title: "3. Structural Body Inspection (10 Points)",
    totalPoints: 10,
    pointsPassedText: "10 / 10 Points Passed",
    scorePercentageText: "100% PASS",
    summary: "100% unibody structural integrity with zero accident or weld repairs.",
    questions: [
      { id: "c3_1", question: "Left B Pillar Structural Integrity", passed: true },
      { id: "c3_2", question: "Right B Pillar Structural Integrity", passed: true },
      { id: "c3_3", question: "Left C Pillar Structural Integrity", passed: true },
      { id: "c3_4", question: "Right C Pillar Structural Integrity", passed: true },
      { id: "c3_5", question: "Chassis Rails Frame Alignment", passed: true },
      { id: "c3_6", question: "Floor Panel Underbody Condition", passed: true },
      { id: "c3_7", question: "Panel Alignment & Uniform Gap Check", passed: true },
      { id: "c3_8", question: "Paint Thickness Gauge / Repaint Check", passed: true },
      { id: "c3_9", question: "Rust / Corrosion Inspection", passed: true },
      { id: "c3_10", question: "Accident Repair & Welding Marks Check", passed: true }
    ]
  },
  {
    id: "cat_4",
    title: "4. Glass & Mirrors (8 Points)",
    totalPoints: 8,
    pointsPassedText: "8 / 8 Points Passed",
    scorePercentageText: "100% PASS",
    summary: "Original OEM glass timestamp matched with smooth mirror operation.",
    questions: [
      { id: "c4_1", question: "Front Windshield (OEM Stamp & Cracks)", passed: true },
      { id: "c4_2", question: "Rear Windshield Defogger Grid Lines", passed: true },
      { id: "c4_3", question: "Door Glasses (All 4 Side Windows)", passed: true },
      { id: "c4_4", question: "ORVM Left Electronic Adjustment & Fold", passed: true },
      { id: "c4_5", question: "ORVM Right Electronic Adjustment & Fold", passed: true },
      { id: "c4_6", question: "Wiper Blades Rubber & Sweeping Motion", passed: true },
      { id: "c4_7", question: "Washer Fluid System Spray Nozzles", passed: true },
      { id: "c4_8", question: "Window Power Regulator Operation", passed: true }
    ]
  },
  {
    id: "cat_5",
    title: "5. Lighting System (8 Points)",
    totalPoints: 8,
    pointsPassedText: "8 / 8 Points Passed",
    scorePercentageText: "100% PASS",
    summary: "All exterior and auxiliary lights functioning to specification.",
    questions: [
      { id: "c5_1", question: "Headlamps High/Low Beam & DRLs", passed: true },
      { id: "c5_2", question: "Fog Lamps Functionality", passed: true },
      { id: "c5_3", question: "Tail Lamps Illumination", passed: true },
      { id: "c5_4", question: "Brake Lamps Response", passed: true },
      { id: "c5_5", question: "Reverse Lamps Activation", passed: true },
      { id: "c5_6", question: "Turn Indicators (Front, Side, Rear)", passed: true },
      { id: "c5_7", question: "Hazard Lights Flasher Circuit", passed: true },
      { id: "c5_8", question: "Number Plate Lamps Illumination", passed: true }
    ]
  },
  {
    id: "cat_6",
    title: "6. Tyres & Wheels (10 Points)",
    totalPoints: 10,
    pointsPassedText: "10 / 10 Points Passed",
    scorePercentageText: "100% PASS",
    summary: "Deep tread depth remaining across all tyres; perfectly balanced.",
    questions: [
      { id: "c6_1", question: "Front Left Tyre Condition & Tread Depth", passed: true },
      { id: "c6_2", question: "Front Right Tyre Condition & Tread Depth", passed: true },
      { id: "c6_3", question: "Rear Left Tyre Condition & Tread Depth", passed: true },
      { id: "c6_4", question: "Rear Right Tyre Condition & Tread Depth", passed: true },
      { id: "c6_5", question: "Spare Wheel Condition & Tool Kit", passed: true },
      { id: "c6_6", question: "Wheel Rims / Alloys Curb Scrape Check", passed: true },
      { id: "c6_7", question: "Tyre Tread Depth (>5mm remaining)", passed: true },
      { id: "c6_8", question: "Tyre Pressure & Valve Stem Integrity", passed: true },
      { id: "c6_9", question: "Wheel Alignment Dynamic Check", passed: true },
      { id: "c6_10", question: "Wheel Balancing & High-Speed Vibration", passed: true }
    ]
  },
  {
    id: "cat_7",
    title: "7. Engine & Transmission (15 Points)",
    totalPoints: 15,
    pointsPassedText: "15 / 15 Points Passed",
    scorePercentageText: "100% PASS",
    summary: "Smooth engine start and idle with clean oil and smooth gear transitions.",
    questions: [
      { id: "c7_1", question: "Engine Start Response & Cold Crank", passed: true },
      { id: "c7_2", question: "Engine Idle RPM Stability", passed: true },
      { id: "c7_3", question: "Engine Sound & Tappet Noise Check", passed: true },
      { id: "c7_4", question: "Engine Mounting Rubber Dampeners", passed: true },
      { id: "c7_5", question: "Engine Oil Level & Quality Check", passed: true },
      { id: "c7_6", question: "Oil Leakage Inspection (Sump & Cover)", passed: true },
      { id: "c7_7", question: "Coolant Level & Concentration", passed: true },
      { id: "c7_8", question: "Radiator Core Condition & Fan Motor", passed: true },
      { id: "c7_9", question: "Battery Health Voltage & Terminal Rust", passed: true },
      { id: "c7_10", question: "Alternator Charging Output Voltage", passed: true },
      { id: "c7_11", question: "Drive Belts & Tensioner Wear", passed: true },
      { id: "c7_12", question: "Air Filter Cleanliness", passed: true },
      { id: "c7_13", question: "Gearbox Performance & Shift Engagement", passed: true },
      { id: "c7_14", question: "Clutch Performance & Free Play", passed: true },
      { id: "c7_15", question: "Transmission Fluid Leakage Check", passed: true }
    ]
  },
  {
    id: "cat_8",
    title: "8. Suspension & Steering (10 Points)",
    totalPoints: 10,
    pointsPassedText: "10 / 10 Points Passed",
    scorePercentageText: "100% PASS",
    summary: "Suspension struts responsive with tight, noise-free steering response.",
    questions: [
      { id: "c8_1", question: "Front Suspension Strut Play", passed: true },
      { id: "c8_2", question: "Rear Suspension Shock Dampening", passed: true },
      { id: "c8_3", question: "Shock Absorbers Fluid Leakage Check", passed: true },
      { id: "c8_4", question: "Steering Free Play Tolerance", passed: true },
      { id: "c8_5", question: "Steering Noise on Full Lock Turn", passed: true },
      { id: "c8_6", question: "Power Steering Fluid / EPS Motor", passed: true },
      { id: "c8_7", question: "Steering Rack & Pinion Seal Integrity", passed: true },
      { id: "c8_8", question: "Ball Joints Rubber Boot Condition", passed: true },
      { id: "c8_9", question: "Tie Rod Ends Tightness", passed: true },
      { id: "c8_10", question: "Suspension Bushes & Control Arm Rubber", passed: true }
    ]
  },
  {
    id: "cat_9",
    title: "9. Brake System (8 Points)",
    totalPoints: 8,
    pointsPassedText: "8 / 8 Points Passed",
    scorePercentageText: "100% PASS",
    summary: "ABS and brake pads in prime condition; instant stopping power.",
    questions: [
      { id: "c9_1", question: "Brake Pads Thickness Remaining", passed: true },
      { id: "c9_2", question: "Brake Discs / Drum Runout & Surface", passed: true },
      { id: "c9_3", question: "Brake Fluid Moisture Level", passed: true },
      { id: "c9_4", question: "Brake Pipes & Flex Hose Leakage", passed: true },
      { id: "c9_5", question: "Hand Brake Cable & Holding Power", passed: true },
      { id: "c9_6", question: "ABS Function & Sensor Diagnostic Scan", passed: true },
      { id: "c9_7", question: "Brake Booster Vacuum Pressure", passed: true },
      { id: "c9_8", question: "Brake Performance High-Speed Stopping Test", passed: true }
    ]
  },
  {
    id: "cat_10",
    title: "10. Interior & Electrical (10 Points)",
    totalPoints: 10,
    pointsPassedText: "10 / 10 Points Passed",
    scorePercentageText: "100% PASS",
    summary: "Spotless cabin interior with all electronic features in full working order.",
    questions: [
      { id: "c10_1", question: "Dashboard Surface & Trim Switches", passed: true },
      { id: "c10_2", question: "Steering Wheel Audio & Cruise Controls", passed: true },
      { id: "c10_3", question: "Seats Condition & Upholstery Wear", passed: true },
      { id: "c10_4", question: "Seat Belts Lock Pretensioner Test", passed: true },
      { id: "c10_5", question: "Instrument Cluster Gauges & Warnings", passed: true },
      { id: "c10_6", question: "Dual Tone Horn Functionality", passed: true },
      { id: "c10_7", question: "Power Windows Up/Down Smoothness", passed: true },
      { id: "c10_8", question: "Central Locking & Remote Key Fob", passed: true },
      { id: "c10_9", question: "Infotainment Touchscreen & Speakers", passed: true },
      { id: "c10_10", question: "Interior Cabin Lights & Reading Lamps", passed: true }
    ]
  },
  {
    id: "cat_11",
    title: "11. AC & Comfort Features (5 Points)",
    totalPoints: 5,
    pointsPassedText: "5 / 5 Points Passed",
    scorePercentageText: "100% PASS",
    summary: "Climate control delivers crisp cooling with zero compressor noise.",
    questions: [
      { id: "c11_1", question: "AC Cooling Temperature Delta Output", passed: true },
      { id: "c11_2", question: "Blower Speed & Airflow Vent Selectors", passed: true },
      { id: "c11_3", question: "Heater Core Functionality", passed: true },
      { id: "c11_4", question: "Rear Window Defogger Heating Lines", passed: true },
      { id: "c11_5", question: "Climate Control Auto Sensor Mode", passed: true }
    ]
  },
  {
    id: "cat_12",
    title: "12. Underbody & Road Test (6 Points)",
    totalPoints: 6,
    pointsPassedText: "6 / 6 Points Passed",
    scorePercentageText: "100% PASS",
    summary: "Road test completed across acceleration, high-speed stability, and braking.",
    questions: [
      { id: "c12_1", question: "Underbody Rust & Scrape Shield Check", passed: true },
      { id: "c12_2", question: "Exhaust System Muffler & Catalytic Converter", passed: true },
      { id: "c12_3", question: "Engine Acceleration & Throttle Pickup", passed: true },
      { id: "c12_4", question: "Gear Shift Performance & Clutch Engagement", passed: true },
      { id: "c12_5", question: "Steering Stability & Alignment On Highway", passed: true },
      { id: "c12_6", question: "Emergency Brake Test & Final Road Test", passed: true }
    ]
  }
];

export function calculate120ReportScore(categories: Inspection120Category[]) {
  let totalPassed = 0;
  let totalPoints = 0;

  categories.forEach(cat => {
    cat.questions.forEach(q => {
      totalPoints++;
      if (q.passed) totalPassed++;
    });
  });

  const percentage = totalPoints > 0 ? Math.round((totalPassed / totalPoints) * 100) : 0;

  let grade: "A+" | "A" | "B+" | "B" | "C" = "C";
  let certificationResult: "Certified" | "Certified After Minor Repairs" | "Major Repairs Required" | "Not Eligible for 1stCars Certified" = "Not Eligible for 1stCars Certified";
  let isCertified = false;

  if (percentage >= 95) {
    grade = "A+";
    certificationResult = "Certified";
    isCertified = true;
  } else if (percentage >= 90) {
    grade = "A";
    certificationResult = "Certified";
    isCertified = true;
  } else if (percentage >= 85) {
    grade = "B+";
    certificationResult = "Certified After Minor Repairs";
    isCertified = true;
  } else if (percentage >= 80) {
    grade = "B";
    certificationResult = "Certified After Minor Repairs";
    isCertified = true;
  } else {
    grade = "C";
    certificationResult = "Not Eligible for 1stCars Certified";
    isCertified = false;
  }

  return {
    totalPassed,
    totalPoints: totalPoints || 120,
    overallScorePercent: percentage,
    grade,
    certificationResult,
    isCertified
  };
}

export function getInitial120Report(): Full120PointReport {
  const categories = getStoredInspectionCategories();

  const calc = calculate120ReportScore(categories);

  return {
    totalPassedPoints: calc.totalPassed,
    totalPoints: 120,
    overallScorePercent: calc.overallScorePercent,
    grade: calc.grade,
    certificationResult: calc.certificationResult,
    isCertified: calc.isCertified,
    specs: { ...DEFAULT_MECHANICAL_SPECS },
    keyFeatures: [...DEFAULT_KEY_FEATURES],
    categories,
    notes: "120-Point Certified Inspection completed. All major mechanical and structural systems thoroughly tested.",
    workflowStage: "inspected"
  };
}

// Storage keys for the admin-editable inspection form (shared with Admin CMS)
export const INSPECTION_FORM_STORAGE_KEY = "1stcars_cms_inspection_120_form";
export const INSPECTION_FORM_SETTING_KEY = "inspection_120_form";

// Returns the admin-edited inspection form if one has been saved, otherwise
// falls back to the built-in OFFICIAL_120_CATEGORIES checklist.
export function getStoredInspectionCategories(): Inspection120Category[] {
  if (typeof window !== "undefined") {
    const raw = localStorage.getItem(INSPECTION_FORM_STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return JSON.parse(JSON.stringify(parsed)) as Inspection120Category[];
        }
      } catch (e) {
        console.error("Failed to parse stored inspection form", e);
      }
    }
  }
  return JSON.parse(JSON.stringify(OFFICIAL_120_CATEGORIES)) as Inspection120Category[];
}

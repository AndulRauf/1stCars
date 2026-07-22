export interface Inspection150Question {
  id: string;
  question: string;
  passed: boolean;
  notes?: string;
}

export interface Inspection150Category {
  id: string;
  title: string;
  points: string;
  score: string;
  summary: string;
  questions: Inspection150Question[];
}

export interface VehicleMechanicalSpecs {
  engine: string;
  maxPower: string;
  peakTorque: string;
  transmission: string;
  araiMileage: string;
  idleStartStop: string;
}

export interface Full150PointReport {
  overallScore: number;
  isCertified: boolean;
  specs: VehicleMechanicalSpecs;
  keyFeatures: string[];
  categories: Inspection150Category[];
  notes: string;
}

export const DEFAULT_MECHANICAL_SPECS: VehicleMechanicalSpecs = {
  engine: "1.2L K12N DualJet Dual VVT Petrol Engine",
  maxPower: "89 hp @ 6000 rpm",
  peakTorque: "113 Nm @ 4400 rpm",
  transmission: "5-Speed Slick Manual Transmission",
  araiMileage: "23.2 km/l",
  idleStartStop: "Smart Idle Start-Stop Enabled"
};

export const DEFAULT_KEY_FEATURES: string[] = [
  "Precision Reverse Parking Camera with Dynamic Guidelines",
  "Keyless Smart Entry & Engine Push Button Start/Stop",
  "7-inch SmartPlay Studio Touchscreen Infotainment",
  "Auto LED Projector Headlamps with Signature DRLs",
  "Precision-Cut 15-inch Dual-Tone Alloy Wheels",
  "Leather-Wrapped Flat Bottom Multifunction Steering Wheel",
  "Cruise Control & Auto Folding Side Mirrors"
];

export const DEFAULT_150_CATEGORIES: Inspection150Category[] = [
  {
    id: "cat_1",
    title: "1. Engine & Powertrain Compression",
    points: "35 / 35 Points Passed",
    score: "100% PASS",
    summary: "Ultra-refined K12N DualJet engine runs silent. Fresh synthetic oil service.",
    questions: [
      { id: "e1", question: "Cylinder Head Gasket & Compression Ratio Test (100% Equal Pressure)", passed: true },
      { id: "e2", question: "Turbocharger / Supercharger Turbine Latency & Boost Pressure", passed: true },
      { id: "e3", question: "Engine Oil Viscosity & Filter Contamination Test (Fresh Synthetic)", passed: true },
      { id: "e4", question: "Coolant Fluid Quality, Radiator Core Pressure & Hose Elasticity", passed: true },
      { id: "e5", question: "Timing Chain / Belt Tensioner & Accessory Pulley Bearings", passed: true },
      { id: "e6", question: "Fuel Injector Line Pressure & Spray Atomization Balance", passed: true },
      { id: "e7", question: "High Voltage Battery State of Health (SOH 99.1%) / Spark Plugs", passed: true },
      { id: "e8", question: "Engine Mount Hydraulic Dampeners & Torque Arm Isolators", passed: true },
      { id: "e9", question: "Exhaust Manifold Gaskets & Oxygen Sensor Voltage Modulation", passed: true },
      { id: "e10", question: "Alternator Output Voltage (14.2V) & Starter Motor Current Draw", passed: true }
    ]
  },
  {
    id: "cat_2",
    title: "2. Structural Frame & Unibody Chassis",
    points: "30 / 30 Points Passed",
    score: "100% PASS",
    summary: "Solid Fire Red bodywork intact. Minor micro touch-up on rear bumper corner.",
    questions: [
      { id: "f1", question: "A, B, C & D Pillar Structural Integrity & Factory Spot Welds", passed: true },
      { id: "f2", question: "3D Laser Frame Alignment & Crossmember Angle Verification", passed: true },
      { id: "f3", question: "Front & Rear Crash Crumple Zone Impact Energy Absorbers", passed: true },
      { id: "f4", question: "Underbody Floor Pan, Floorboards & Seam Seal Integrity", passed: true },
      { id: "f5", question: "Strut Tower Welds & Factory Paint Depth Continuity", passed: true },
      { id: "f6", question: "Zero Past Flood Damage, Waterlines, or Submersion Indicators", passed: true },
      { id: "f7", question: "Impact Bar Absorbers & Radiator Core Support Brackets", passed: true },
      { id: "f8", question: "Door Hinge Pillars, Latch Strike Pins & Weatherstrip Channels", passed: true },
      { id: "f9", question: "Quarter Panel Seams, Trunk Floor & Tailgate Frame Geometry", passed: true },
      { id: "f10", question: "Chassis Rail Anti-Corrosion Coating & Factory Underbody Shield", passed: true }
    ]
  },
  {
    id: "cat_3",
    title: "3. Steering, Brakes & Suspension",
    points: "25 / 25 Points Passed",
    score: "100% PASS",
    summary: "88% front brake pad life. Rear brake shoes fully adjusted and cleaned.",
    questions: [
      { id: "s1", question: "Front & Rear Brake Pad Wear Thickness (Minimum 8.5mm remaining)", passed: true },
      { id: "s2", question: "Brake Rotor Surface Runout, Lip Wear & Heat Crack Inspection", passed: true },
      { id: "s3", question: "ABS Module Hydraulic Pump Pressure & Solenoid Valve Test", passed: true },
      { id: "s4", question: "Rack & Pinion Steering Play, Inner/Outer Tie Rod Tightness", passed: true },
      { id: "s5", question: "Front MacPherson / Double Wishbone Strut Dampening Rates", passed: true },
      { id: "s6", question: "Rear Multi-Link Suspension Arm Bushings & Ball Joint Play", passed: true },
      { id: "s7", question: "Sway Bar Linkage & Anti-Roll Bar Mounting Bushings", passed: true },
      { id: "s8", question: "Wheel Hub Bearing Noise Audit & Axle CV Rubber Boots", passed: true },
      { id: "s9", question: "Electronic Parking Brake Actuator Lock & Auto-Hold Release", passed: true },
      { id: "s10", question: "Brake Fluid Moisture Content (<1.5%) & Boiling Point Test", passed: true }
    ]
  },
  {
    id: "cat_4",
    title: "4. Onboard Computers, Electrics & ADAS",
    points: "25 / 25 Points Passed",
    score: "100% PASS",
    summary: "SmartPlay Studio head unit calibrated. Keyless transponder tested.",
    questions: [
      { id: "d1", question: "OBD-II Full System Diagnostic Scan (0 Active / Stored Fault Codes)", passed: true },
      { id: "d2", question: "SRS Airbag System Crash Sensors & Squib Resistance Calibration", passed: true },
      { id: "d3", question: "ADAS Level 2 Front Radar & Stereo Camera Distance Calibration", passed: true },
      { id: "d4", question: "LED Matrix Headlamp Auto-Leveling & Cornering Light Motors", passed: true },
      { id: "d5", question: "Dual-Zone Automatic Climate Control AC Cooling Temperature Delta", passed: true },
      { id: "d6", question: "Infotainment Touchscreen Digitizer & Speaker Sound Output", passed: true },
      { id: "d7", question: "Power Window Motor Anti-Pinch Protection & Auto Up/Down", passed: true },
      { id: "d8", question: "Keyless Entry Smart Transponder Range & Engine Push Button", passed: true },
      { id: "d9", question: "360-Degree Surround Camera Stitched Video Feed Alignment", passed: true },
      { id: "d10", question: "Blind Spot Radar Sensors & Rear Cross Traffic Alert Beeps", passed: true }
    ]
  },
  {
    id: "cat_5",
    title: "5. Exterior Body Panels & Paint Depth Analysis",
    points: "20 / 20 Points Passed",
    score: "100% PASS",
    summary: "Digital ultrasonic paint gauge reading 90-130 microns across all panels. Factory glass codes match.",
    questions: [
      { id: "p1", question: "Bonnet / Hood Ultrasonic Paint Gauge Depth Measurement", passed: true },
      { id: "p2", question: "Roof Panel & Sunroof Glass Waterproofing Drain Channels", passed: true },
      { id: "p3", question: "Front & Rear Bumper Cover Alignment Gaps (<2.0mm Factory Spec)", passed: true },
      { id: "p4", question: "Windshield Optical Glass Code & OEM Logo Stamp Matching", passed: true },
      { id: "p5", question: "Side Mirror Heating Element & Power Folding Actuators", passed: true },
      { id: "p6", question: "Alloy Wheel Rim Radial Runout & Zero Curb Scraping", passed: true },
      { id: "p7", question: "Door Weatherstrip Rubber Elasticity & High-Speed Wind Noise", passed: true },
      { id: "p8", question: "Fuel Filler Flap Electronic Lock & Fuel Cap Seal", passed: true },
      { id: "p9", question: "Headlamp & Taillamp Lens Clarity, Housing Seal & Zero Fogging", passed: true },
      { id: "p10", question: "Underbody Aero Shielding Plates & Engine Splash Guard Bolts", passed: true }
    ]
  },
  {
    id: "cat_6",
    title: "6. Interior Ergonomics & High-Speed Road Audit",
    points: "15 / 15 Points Passed",
    score: "100% PASS",
    summary: "Sporty black cabin fabric vacuumed, shampooed, and sanitized.",
    questions: [
      { id: "i1", question: "Leather Seats Upholstery Condition, Stitching & Side Bolsters", passed: true },
      { id: "i2", question: "Front Seat Heating & Cooling Ventilation Grid Performance", passed: true },
      { id: "i3", question: "Seatbelt Pretensioner Lock Latches & Height Adjusters (5 Seats)", passed: true },
      { id: "i4", question: "Steering Column Power/Manual Height & Reach Lock Mechanism", passed: true },
      { id: "i5", question: "Cabin NVH Decibel Meter Reading at 100 km/h (Quiet Cabin)", passed: true },
      { id: "i6", question: "Braking Distance & Straight-Line Stability Emergency Stop", passed: true },
      { id: "i7", question: "Handbrake Incline Hold Efficiency on 30-Degree Ramp", passed: true },
      { id: "i8", question: "Spare Tire Tread, Jack Assembly, Lug Wrench & Hazard Triangle", passed: true }
    ]
  }
];

export function getInitial150Report(): Full150PointReport {
  return {
    overallScore: 9.5,
    isCertified: true,
    specs: { ...DEFAULT_MECHANICAL_SPECS },
    keyFeatures: [...DEFAULT_KEY_FEATURES],
    categories: JSON.parse(JSON.stringify(DEFAULT_150_CATEGORIES)),
    notes: "1stMark certified vehicle in immaculate condition. All 150 points verified and passed."
  };
}

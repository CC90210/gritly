/**
 * Industry Configuration System
 *
 * When a user completes onboarding, their trade selection + answers
 * produce an IndustryConfig that determines which modules, features,
 * and UI elements are visible in their dashboard.
 *
 * This is the core of Gritly's "feels custom-built" experience.
 */

import type { IndustrySlug } from "@/lib/constants/brand";

export interface ModuleConfig {
  enabled: boolean;
  label: string;
  description: string;
}

export interface IndustryConfig {
  slug: IndustrySlug;
  name: string;
  modules: {
    // Core (always on)
    crm: ModuleConfig;
    scheduling: ModuleConfig;
    quoting: ModuleConfig;
    invoicing: ModuleConfig;
    payments: ModuleConfig;
    // Configurable
    flatRatePricebook: ModuleConfig;
    roomSurfaceEstimating: ModuleConfig;
    areaEstimating: ModuleConfig;
    aerialMeasurements: ModuleConfig;
    recurringJobs: ModuleConfig;
    routeOptimization: ModuleConfig;
    emergencyDispatch: ModuleConfig;
    crewScheduling: ModuleConfig;
    subcontractorMgmt: ModuleConfig;
    gpsTracking: ModuleConfig;
    jobPhotos: ModuleConfig;
    beforeAfterPhotos: ModuleConfig;
    customChecklists: ModuleConfig;
    chemicalTracking: ModuleConfig;
    refrigerantTracking: ModuleConfig;
    waterChemistry: ModuleConfig;
    permitTracking: ModuleConfig;
    panelDocumentation: ModuleConfig;
    colorFinishTracking: ModuleConfig;
    warrantyManagement: ModuleConfig;
    maintenanceAgreements: ModuleConfig;
    seasonalContracts: ModuleConfig;
    trapMonitoring: ModuleConfig;
    progressBilling: ModuleConfig;
    inventoryTracking: ModuleConfig;
    jobCosting: ModuleConfig;
    reviewAutomation: ModuleConfig;
    shiftManagement: ModuleConfig;
    inspectionReports: ModuleConfig;
  };
  // Dashboard widgets to show by default
  defaultWidgets: string[];
  // Terminology overrides (e.g., "Technician" vs "Crew Member" vs "Cleaner")
  terminology: {
    worker: string;
    workerPlural: string;
    job: string;
    jobPlural: string;
    client: string;
    clientPlural: string;
    quote: string;
  };
}

function mod(enabled: boolean, label: string, description: string): ModuleConfig {
  return { enabled, label, description };
}

const BASE_MODULES = {
  crm: mod(true, "Clients", "Manage your customers, properties, and contact history"),
  scheduling: mod(true, "Schedule", "Drag-and-drop job scheduling and dispatch"),
  quoting: mod(true, "Quotes", "Create and send professional estimates"),
  invoicing: mod(true, "Invoices", "Generate invoices and collect payments"),
  payments: mod(true, "Payments", "Online card, ACH, and in-person payments"),
  jobPhotos: mod(true, "Job Photos", "GPS-tagged photos organized by job"),
  customChecklists: mod(true, "Checklists", "Custom forms and inspection checklists"),
  gpsTracking: mod(true, "GPS Tracking", "Real-time team location tracking"),
  jobCosting: mod(true, "Job Costing", "Track labor, materials, and profitability per job"),
  reviewAutomation: mod(true, "Reviews", "Automated Google review requests after each job"),
};

const DISABLED = (label: string, desc: string) => mod(false, label, desc);

export const INDUSTRY_CONFIGS: Record<IndustrySlug, IndustryConfig> = {
  hvac: {
    slug: "hvac",
    name: "HVAC",
    modules: {
      ...BASE_MODULES,
      flatRatePricebook: mod(true, "Pricebook", "Flat-rate pricing with good-better-best options"),
      roomSurfaceEstimating: DISABLED("Room Estimating", "Room-by-room estimating"),
      areaEstimating: DISABLED("Area Estimating", "Square footage estimating"),
      aerialMeasurements: DISABLED("Aerial Measurements", "Satellite roof measurements"),
      recurringJobs: mod(true, "Recurring Jobs", "Maintenance schedules and service plans"),
      routeOptimization: DISABLED("Route Optimization", "Optimize daily driving routes"),
      emergencyDispatch: mod(true, "Emergency Dispatch", "Priority job insertion for urgent calls"),
      crewScheduling: DISABLED("Crew Scheduling", "Multi-technician job assignment"),
      subcontractorMgmt: DISABLED("Subcontractors", "Manage subcontractor compliance and scheduling"),
      beforeAfterPhotos: DISABLED("Before/After", "Side-by-side photo comparison"),
      chemicalTracking: DISABLED("Chemical Tracking", "Chemical usage and compliance logging"),
      refrigerantTracking: mod(true, "Refrigerant Log", "EPA 608 refrigerant tracking per job"),
      waterChemistry: DISABLED("Water Chemistry", "Pool chemical readings and dosing"),
      permitTracking: DISABLED("Permits", "Track permits and inspections"),
      panelDocumentation: DISABLED("Panel Docs", "Electrical panel documentation"),
      colorFinishTracking: DISABLED("Color Tracking", "Paint color and finish records"),
      warrantyManagement: mod(true, "Warranties", "Equipment warranty tracking and alerts"),
      maintenanceAgreements: mod(true, "Service Plans", "Recurring maintenance agreements"),
      seasonalContracts: DISABLED("Seasonal Contracts", "Pause/resume seasonal services"),
      trapMonitoring: DISABLED("Trap Monitoring", "Bait station and trap location tracking"),
      progressBilling: DISABLED("Progress Billing", "Milestone-based invoicing"),
      inventoryTracking: mod(true, "Inventory", "Parts and materials tracking per truck"),
      shiftManagement: DISABLED("Shifts", "Employee shift scheduling"),
      inspectionReports: DISABLED("Inspections", "Client-facing inspection reports"),
    },
    defaultWidgets: ["revenue", "openQuotes", "activeJobs", "overdueInvoices", "upcomingJobs", "recentRequests"],
    terminology: { worker: "Technician", workerPlural: "Technicians", job: "Service Call", jobPlural: "Service Calls", client: "Customer", clientPlural: "Customers", quote: "Estimate" },
  },
  plumbing: {
    slug: "plumbing",
    name: "Plumbing",
    modules: {
      ...BASE_MODULES,
      flatRatePricebook: mod(true, "Pricebook", "Flat-rate pricing for common repairs"),
      roomSurfaceEstimating: DISABLED("Room Estimating", "Room-by-room estimating"),
      areaEstimating: DISABLED("Area Estimating", "Square footage estimating"),
      aerialMeasurements: DISABLED("Aerial Measurements", "Satellite roof measurements"),
      recurringJobs: DISABLED("Recurring Jobs", "Scheduled recurring services"),
      routeOptimization: DISABLED("Route Optimization", "Optimize daily driving routes"),
      emergencyDispatch: mod(true, "Emergency Dispatch", "24/7 priority dispatch for emergencies"),
      crewScheduling: DISABLED("Crew Scheduling", "Multi-technician job assignment"),
      subcontractorMgmt: DISABLED("Subcontractors", "Manage subcontractor compliance"),
      beforeAfterPhotos: DISABLED("Before/After", "Side-by-side photo comparison"),
      chemicalTracking: DISABLED("Chemical Tracking", "Chemical usage logging"),
      refrigerantTracking: DISABLED("Refrigerant Log", "Refrigerant tracking"),
      waterChemistry: DISABLED("Water Chemistry", "Water chemistry readings"),
      permitTracking: mod(true, "Permits", "Plumbing permit tracking and inspections"),
      panelDocumentation: DISABLED("Panel Docs", "Electrical panel documentation"),
      colorFinishTracking: DISABLED("Color Tracking", "Paint color records"),
      warrantyManagement: DISABLED("Warranties", "Equipment warranty tracking"),
      maintenanceAgreements: mod(true, "Service Plans", "Preventive maintenance agreements"),
      seasonalContracts: DISABLED("Seasonal Contracts", "Seasonal service automation"),
      trapMonitoring: DISABLED("Trap Monitoring", "Trap location tracking"),
      progressBilling: DISABLED("Progress Billing", "Milestone-based invoicing"),
      inventoryTracking: mod(true, "Inventory", "Parts tracking per truck"),
      shiftManagement: DISABLED("Shifts", "Employee shift scheduling"),
      inspectionReports: DISABLED("Inspections", "Inspection reports"),
    },
    defaultWidgets: ["revenue", "openQuotes", "activeJobs", "overdueInvoices", "upcomingJobs", "recentRequests"],
    terminology: { worker: "Plumber", workerPlural: "Plumbers", job: "Service Call", jobPlural: "Service Calls", client: "Customer", clientPlural: "Customers", quote: "Estimate" },
  },
  electrical: {
    slug: "electrical",
    name: "Electrical",
    modules: {
      ...BASE_MODULES,
      flatRatePricebook: mod(true, "Pricebook", "Flat-rate pricing for common jobs"),
      roomSurfaceEstimating: DISABLED("Room Estimating", "Room-by-room estimating"),
      areaEstimating: DISABLED("Area Estimating", "Square footage estimating"),
      aerialMeasurements: DISABLED("Aerial Measurements", "Satellite measurements"),
      recurringJobs: DISABLED("Recurring Jobs", "Scheduled recurring services"),
      routeOptimization: DISABLED("Route Optimization", "Optimize daily routes"),
      emergencyDispatch: DISABLED("Emergency Dispatch", "Priority dispatch"),
      crewScheduling: DISABLED("Crew Scheduling", "Multi-tech job assignment"),
      subcontractorMgmt: DISABLED("Subcontractors", "Subcontractor management"),
      beforeAfterPhotos: DISABLED("Before/After", "Before/after photos"),
      chemicalTracking: DISABLED("Chemical Tracking", "Chemical logging"),
      refrigerantTracking: DISABLED("Refrigerant Log", "Refrigerant tracking"),
      waterChemistry: DISABLED("Water Chemistry", "Water chemistry"),
      permitTracking: mod(true, "Permits", "Electrical permit and inspection tracking"),
      panelDocumentation: mod(true, "Panel Docs", "Electrical panel documentation per property"),
      colorFinishTracking: DISABLED("Color Tracking", "Color records"),
      warrantyManagement: DISABLED("Warranties", "Warranty tracking"),
      maintenanceAgreements: mod(true, "Service Plans", "Maintenance agreements"),
      seasonalContracts: DISABLED("Seasonal Contracts", "Seasonal automation"),
      trapMonitoring: DISABLED("Trap Monitoring", "Trap tracking"),
      progressBilling: DISABLED("Progress Billing", "Milestone invoicing"),
      inventoryTracking: mod(true, "Inventory", "Parts and materials tracking"),
      shiftManagement: DISABLED("Shifts", "Shift scheduling"),
      inspectionReports: DISABLED("Inspections", "Inspection reports"),
    },
    defaultWidgets: ["revenue", "openQuotes", "activeJobs", "overdueInvoices", "upcomingJobs", "recentRequests"],
    terminology: { worker: "Electrician", workerPlural: "Electricians", job: "Job", jobPlural: "Jobs", client: "Customer", clientPlural: "Customers", quote: "Estimate" },
  },
  painting: {
    slug: "painting",
    name: "Painting",
    modules: {
      ...BASE_MODULES,
      flatRatePricebook: DISABLED("Pricebook", "Flat-rate pricing"),
      roomSurfaceEstimating: mod(true, "Room Estimating", "Room-by-room surface estimating with production rates"),
      areaEstimating: mod(true, "Area Estimating", "Square footage estimating"),
      aerialMeasurements: DISABLED("Aerial Measurements", "Satellite measurements"),
      recurringJobs: DISABLED("Recurring Jobs", "Recurring services"),
      routeOptimization: DISABLED("Route Optimization", "Route optimization"),
      emergencyDispatch: DISABLED("Emergency Dispatch", "Emergency dispatch"),
      crewScheduling: mod(true, "Crew Scheduling", "Assign multiple painters per job"),
      subcontractorMgmt: DISABLED("Subcontractors", "Subcontractor management"),
      beforeAfterPhotos: mod(true, "Before/After", "Before and after photo documentation"),
      chemicalTracking: DISABLED("Chemical Tracking", "Chemical logging"),
      refrigerantTracking: DISABLED("Refrigerant Log", "Refrigerant tracking"),
      waterChemistry: DISABLED("Water Chemistry", "Water chemistry"),
      permitTracking: DISABLED("Permits", "Permit tracking"),
      panelDocumentation: DISABLED("Panel Docs", "Panel documentation"),
      colorFinishTracking: mod(true, "Colors & Finishes", "Track paint colors, finishes, and brands per room"),
      warrantyManagement: DISABLED("Warranties", "Warranty tracking"),
      maintenanceAgreements: DISABLED("Service Plans", "Maintenance agreements"),
      seasonalContracts: DISABLED("Seasonal Contracts", "Seasonal automation"),
      trapMonitoring: DISABLED("Trap Monitoring", "Trap tracking"),
      progressBilling: DISABLED("Progress Billing", "Milestone invoicing"),
      inventoryTracking: DISABLED("Inventory", "Inventory tracking"),
      shiftManagement: mod(true, "Shifts", "Crew shift scheduling"),
      inspectionReports: DISABLED("Inspections", "Inspection reports"),
    },
    defaultWidgets: ["revenue", "openQuotes", "activeJobs", "overdueInvoices", "upcomingJobs"],
    terminology: { worker: "Painter", workerPlural: "Painters", job: "Project", jobPlural: "Projects", client: "Client", clientPlural: "Clients", quote: "Estimate" },
  },
  landscaping: {
    slug: "landscaping",
    name: "Landscaping",
    modules: {
      ...BASE_MODULES,
      flatRatePricebook: DISABLED("Pricebook", "Flat-rate pricing"),
      roomSurfaceEstimating: DISABLED("Room Estimating", "Room estimating"),
      areaEstimating: mod(true, "Area Estimating", "Square footage / lot size estimating"),
      aerialMeasurements: DISABLED("Aerial Measurements", "Satellite measurements"),
      recurringJobs: mod(true, "Recurring Jobs", "Weekly/bi-weekly mowing routes"),
      routeOptimization: mod(true, "Route Optimization", "Optimize daily crew routes"),
      emergencyDispatch: DISABLED("Emergency Dispatch", "Emergency dispatch"),
      crewScheduling: mod(true, "Crew Scheduling", "Multi-crew job assignment"),
      subcontractorMgmt: DISABLED("Subcontractors", "Subcontractor management"),
      beforeAfterPhotos: DISABLED("Before/After", "Before/after photos"),
      chemicalTracking: mod(true, "Chemical Log", "Fertilizer and chemical application tracking"),
      refrigerantTracking: DISABLED("Refrigerant Log", "Refrigerant tracking"),
      waterChemistry: DISABLED("Water Chemistry", "Water chemistry"),
      permitTracking: DISABLED("Permits", "Permit tracking"),
      panelDocumentation: DISABLED("Panel Docs", "Panel documentation"),
      colorFinishTracking: DISABLED("Color Tracking", "Color records"),
      warrantyManagement: DISABLED("Warranties", "Warranty tracking"),
      maintenanceAgreements: mod(true, "Service Plans", "Seasonal lawn care contracts"),
      seasonalContracts: mod(true, "Seasonal Contracts", "Auto pause/resume for winter"),
      trapMonitoring: DISABLED("Trap Monitoring", "Trap tracking"),
      progressBilling: DISABLED("Progress Billing", "Milestone invoicing"),
      inventoryTracking: DISABLED("Inventory", "Inventory tracking"),
      shiftManagement: mod(true, "Shifts", "Crew shift scheduling"),
      inspectionReports: DISABLED("Inspections", "Inspection reports"),
    },
    defaultWidgets: ["revenue", "activeJobs", "todaysRoute", "recurringJobs", "overdueInvoices"],
    terminology: { worker: "Crew Member", workerPlural: "Crew Members", job: "Job", jobPlural: "Jobs", client: "Property", clientPlural: "Properties", quote: "Estimate" },
  },
  roofing: {
    slug: "roofing",
    name: "Roofing",
    modules: {
      ...BASE_MODULES,
      flatRatePricebook: DISABLED("Pricebook", "Flat-rate pricing"),
      roomSurfaceEstimating: DISABLED("Room Estimating", "Room estimating"),
      areaEstimating: mod(true, "Area Estimating", "Roof area and pitch estimating"),
      aerialMeasurements: mod(true, "Aerial Measurements", "EagleView/HOVER satellite measurements"),
      recurringJobs: DISABLED("Recurring Jobs", "Recurring services"),
      routeOptimization: DISABLED("Route Optimization", "Route optimization"),
      emergencyDispatch: DISABLED("Emergency Dispatch", "Emergency dispatch"),
      crewScheduling: mod(true, "Crew Scheduling", "Multi-crew roofing job assignment"),
      subcontractorMgmt: mod(true, "Subcontractors", "Sub crew management and compliance"),
      beforeAfterPhotos: mod(true, "Before/After", "Roof condition documentation"),
      chemicalTracking: DISABLED("Chemical Tracking", "Chemical logging"),
      refrigerantTracking: DISABLED("Refrigerant Log", "Refrigerant tracking"),
      waterChemistry: DISABLED("Water Chemistry", "Water chemistry"),
      permitTracking: DISABLED("Permits", "Building permit tracking"),
      panelDocumentation: DISABLED("Panel Docs", "Panel documentation"),
      colorFinishTracking: DISABLED("Color Tracking", "Color records"),
      warrantyManagement: mod(true, "Warranties", "Roof warranty tracking and management"),
      maintenanceAgreements: DISABLED("Service Plans", "Maintenance agreements"),
      seasonalContracts: DISABLED("Seasonal Contracts", "Seasonal automation"),
      trapMonitoring: DISABLED("Trap Monitoring", "Trap tracking"),
      progressBilling: mod(true, "Progress Billing", "Milestone-based invoicing for large jobs"),
      inventoryTracking: mod(true, "Inventory", "Roofing materials tracking"),
      shiftManagement: DISABLED("Shifts", "Shift scheduling"),
      inspectionReports: DISABLED("Inspections", "Inspection reports"),
    },
    defaultWidgets: ["revenue", "openQuotes", "activeJobs", "overdueInvoices", "upcomingJobs"],
    terminology: { worker: "Roofer", workerPlural: "Roofers", job: "Project", jobPlural: "Projects", client: "Customer", clientPlural: "Customers", quote: "Proposal" },
  },
  "cleaning-residential": {
    slug: "cleaning-residential",
    name: "Residential Cleaning",
    modules: {
      ...BASE_MODULES,
      flatRatePricebook: DISABLED("Pricebook", "Flat-rate pricing"),
      roomSurfaceEstimating: DISABLED("Room Estimating", "Room estimating"),
      areaEstimating: DISABLED("Area Estimating", "Area estimating"),
      aerialMeasurements: DISABLED("Aerial Measurements", "Aerial measurements"),
      recurringJobs: mod(true, "Recurring Jobs", "Weekly/bi-weekly cleaning schedules"),
      routeOptimization: mod(true, "Route Optimization", "Optimize daily cleaning routes"),
      emergencyDispatch: DISABLED("Emergency Dispatch", "Emergency dispatch"),
      crewScheduling: DISABLED("Crew Scheduling", "Crew scheduling"),
      subcontractorMgmt: DISABLED("Subcontractors", "Subcontractor management"),
      beforeAfterPhotos: mod(true, "Before/After", "Cleaning verification photos"),
      chemicalTracking: DISABLED("Chemical Tracking", "Chemical logging"),
      refrigerantTracking: DISABLED("Refrigerant Log", "Refrigerant tracking"),
      waterChemistry: DISABLED("Water Chemistry", "Water chemistry"),
      permitTracking: DISABLED("Permits", "Permit tracking"),
      panelDocumentation: DISABLED("Panel Docs", "Panel documentation"),
      colorFinishTracking: DISABLED("Color Tracking", "Color records"),
      warrantyManagement: DISABLED("Warranties", "Warranty tracking"),
      maintenanceAgreements: DISABLED("Service Plans", "Service agreements"),
      seasonalContracts: DISABLED("Seasonal Contracts", "Seasonal automation"),
      trapMonitoring: DISABLED("Trap Monitoring", "Trap tracking"),
      progressBilling: DISABLED("Progress Billing", "Progress billing"),
      inventoryTracking: DISABLED("Inventory", "Inventory tracking"),
      shiftManagement: mod(true, "Shifts", "Cleaner shift scheduling"),
      inspectionReports: mod(true, "Inspections", "Post-cleaning inspection checklists"),
    },
    defaultWidgets: ["revenue", "todaysRoute", "recurringJobs", "overdueInvoices", "activeJobs"],
    terminology: { worker: "Cleaner", workerPlural: "Cleaners", job: "Cleaning", jobPlural: "Cleanings", client: "Client", clientPlural: "Clients", quote: "Quote" },
  },
  "cleaning-commercial": {
    slug: "cleaning-commercial",
    name: "Commercial Cleaning",
    modules: {
      ...BASE_MODULES,
      flatRatePricebook: DISABLED("Pricebook", "Flat-rate pricing"),
      roomSurfaceEstimating: DISABLED("Room Estimating", "Room estimating"),
      areaEstimating: DISABLED("Area Estimating", "Area estimating"),
      aerialMeasurements: DISABLED("Aerial Measurements", "Aerial measurements"),
      recurringJobs: mod(true, "Recurring Jobs", "Recurring cleaning contracts"),
      routeOptimization: DISABLED("Route Optimization", "Route optimization"),
      emergencyDispatch: DISABLED("Emergency Dispatch", "Emergency dispatch"),
      crewScheduling: mod(true, "Crew Scheduling", "Multi-crew facility assignment"),
      subcontractorMgmt: DISABLED("Subcontractors", "Subcontractor management"),
      beforeAfterPhotos: DISABLED("Before/After", "Before/after photos"),
      chemicalTracking: DISABLED("Chemical Tracking", "Chemical logging"),
      refrigerantTracking: DISABLED("Refrigerant Log", "Refrigerant tracking"),
      waterChemistry: DISABLED("Water Chemistry", "Water chemistry"),
      permitTracking: DISABLED("Permits", "Permit tracking"),
      panelDocumentation: DISABLED("Panel Docs", "Panel documentation"),
      colorFinishTracking: DISABLED("Color Tracking", "Color records"),
      warrantyManagement: DISABLED("Warranties", "Warranty tracking"),
      maintenanceAgreements: DISABLED("Service Plans", "Facility maintenance contracts"),
      seasonalContracts: DISABLED("Seasonal Contracts", "Seasonal automation"),
      trapMonitoring: DISABLED("Trap Monitoring", "Trap tracking"),
      progressBilling: DISABLED("Progress Billing", "Progress billing"),
      inventoryTracking: DISABLED("Inventory", "Supply tracking"),
      shiftManagement: mod(true, "Shifts", "Multi-shift janitorial scheduling"),
      inspectionReports: mod(true, "Inspections", "Supervisor inspection reports"),
    },
    defaultWidgets: ["revenue", "activeJobs", "recurringJobs", "overdueInvoices", "teamStatus"],
    terminology: { worker: "Janitor", workerPlural: "Staff", job: "Shift", jobPlural: "Shifts", client: "Facility", clientPlural: "Facilities", quote: "Proposal" },
  },
  "general-contracting": {
    slug: "general-contracting",
    name: "General Contracting",
    modules: {
      ...BASE_MODULES,
      flatRatePricebook: DISABLED("Pricebook", "Flat-rate pricing"),
      roomSurfaceEstimating: DISABLED("Room Estimating", "Room estimating"),
      areaEstimating: DISABLED("Area Estimating", "Area estimating"),
      aerialMeasurements: DISABLED("Aerial Measurements", "Aerial measurements"),
      recurringJobs: DISABLED("Recurring Jobs", "Recurring services"),
      routeOptimization: DISABLED("Route Optimization", "Route optimization"),
      emergencyDispatch: DISABLED("Emergency Dispatch", "Emergency dispatch"),
      crewScheduling: mod(true, "Crew Scheduling", "Multi-crew project assignment"),
      subcontractorMgmt: mod(true, "Subcontractors", "Sub management, compliance docs, W9s, insurance"),
      beforeAfterPhotos: mod(true, "Before/After", "Progress photo documentation"),
      chemicalTracking: DISABLED("Chemical Tracking", "Chemical logging"),
      refrigerantTracking: DISABLED("Refrigerant Log", "Refrigerant tracking"),
      waterChemistry: DISABLED("Water Chemistry", "Water chemistry"),
      permitTracking: mod(true, "Permits", "Multi-project permit and inspection tracking"),
      panelDocumentation: DISABLED("Panel Docs", "Panel documentation"),
      colorFinishTracking: DISABLED("Color Tracking", "Color records"),
      warrantyManagement: DISABLED("Warranties", "Warranty tracking"),
      maintenanceAgreements: DISABLED("Service Plans", "Maintenance agreements"),
      seasonalContracts: DISABLED("Seasonal Contracts", "Seasonal automation"),
      trapMonitoring: DISABLED("Trap Monitoring", "Trap tracking"),
      progressBilling: mod(true, "Progress Billing", "Milestone-based invoicing with retainage"),
      inventoryTracking: mod(true, "Inventory", "Materials tracking per project"),
      shiftManagement: DISABLED("Shifts", "Shift scheduling"),
      inspectionReports: DISABLED("Inspections", "Inspection reports"),
    },
    defaultWidgets: ["revenue", "openQuotes", "activeJobs", "overdueInvoices", "upcomingJobs"],
    terminology: { worker: "Crew Member", workerPlural: "Crew", job: "Project", jobPlural: "Projects", client: "Client", clientPlural: "Clients", quote: "Proposal" },
  },
  "pest-control": {
    slug: "pest-control",
    name: "Pest Control",
    modules: {
      ...BASE_MODULES,
      flatRatePricebook: DISABLED("Pricebook", "Flat-rate pricing"),
      roomSurfaceEstimating: DISABLED("Room Estimating", "Room estimating"),
      areaEstimating: DISABLED("Area Estimating", "Area estimating"),
      aerialMeasurements: DISABLED("Aerial Measurements", "Aerial measurements"),
      recurringJobs: mod(true, "Recurring Jobs", "Monthly/quarterly service routes"),
      routeOptimization: mod(true, "Route Optimization", "Optimize technician routes"),
      emergencyDispatch: DISABLED("Emergency Dispatch", "Emergency dispatch"),
      crewScheduling: DISABLED("Crew Scheduling", "Crew scheduling"),
      subcontractorMgmt: DISABLED("Subcontractors", "Subcontractor management"),
      beforeAfterPhotos: DISABLED("Before/After", "Before/after photos"),
      chemicalTracking: mod(true, "Chemical Log", "Chemical application logging for state compliance"),
      refrigerantTracking: DISABLED("Refrigerant Log", "Refrigerant tracking"),
      waterChemistry: DISABLED("Water Chemistry", "Water chemistry"),
      permitTracking: DISABLED("Permits", "Permit tracking"),
      panelDocumentation: DISABLED("Panel Docs", "Panel documentation"),
      colorFinishTracking: DISABLED("Color Tracking", "Color records"),
      warrantyManagement: DISABLED("Warranties", "Warranty tracking"),
      maintenanceAgreements: mod(true, "Service Plans", "Recurring pest control contracts"),
      seasonalContracts: DISABLED("Seasonal Contracts", "Seasonal automation"),
      trapMonitoring: mod(true, "Trap Monitoring", "Bait station and trap location tracking"),
      progressBilling: DISABLED("Progress Billing", "Progress billing"),
      inventoryTracking: DISABLED("Inventory", "Inventory tracking"),
      shiftManagement: DISABLED("Shifts", "Shift scheduling"),
      inspectionReports: mod(true, "Inspections", "Service inspection reports"),
    },
    defaultWidgets: ["revenue", "todaysRoute", "recurringJobs", "overdueInvoices", "chemicalUsage"],
    terminology: { worker: "Technician", workerPlural: "Technicians", job: "Service", jobPlural: "Services", client: "Account", clientPlural: "Accounts", quote: "Quote" },
  },
  "pool-service": {
    slug: "pool-service",
    name: "Pool Service",
    modules: {
      ...BASE_MODULES,
      flatRatePricebook: DISABLED("Pricebook", "Flat-rate pricing"),
      roomSurfaceEstimating: DISABLED("Room Estimating", "Room estimating"),
      areaEstimating: DISABLED("Area Estimating", "Pool area estimating"),
      aerialMeasurements: DISABLED("Aerial Measurements", "Aerial measurements"),
      recurringJobs: mod(true, "Recurring Jobs", "Weekly pool service routes"),
      routeOptimization: mod(true, "Route Optimization", "Optimize service routes"),
      emergencyDispatch: DISABLED("Emergency Dispatch", "Emergency dispatch"),
      crewScheduling: DISABLED("Crew Scheduling", "Crew scheduling"),
      subcontractorMgmt: DISABLED("Subcontractors", "Subcontractor management"),
      beforeAfterPhotos: DISABLED("Before/After", "Before/after photos"),
      chemicalTracking: mod(true, "Chemical Log", "Pool chemical application tracking"),
      refrigerantTracking: DISABLED("Refrigerant Log", "Refrigerant tracking"),
      waterChemistry: mod(true, "Water Chemistry", "pH, chlorine, alkalinity readings with dosing calculator"),
      permitTracking: DISABLED("Permits", "Permit tracking"),
      panelDocumentation: DISABLED("Panel Docs", "Panel documentation"),
      colorFinishTracking: DISABLED("Color Tracking", "Color records"),
      warrantyManagement: mod(true, "Warranties", "Pool equipment warranty tracking"),
      maintenanceAgreements: mod(true, "Service Plans", "Pool maintenance contracts"),
      seasonalContracts: DISABLED("Seasonal Contracts", "Seasonal automation"),
      trapMonitoring: DISABLED("Trap Monitoring", "Trap tracking"),
      progressBilling: DISABLED("Progress Billing", "Progress billing"),
      inventoryTracking: DISABLED("Inventory", "Chemical and parts inventory"),
      shiftManagement: DISABLED("Shifts", "Shift scheduling"),
      inspectionReports: DISABLED("Inspections", "Pool inspection reports"),
    },
    defaultWidgets: ["revenue", "todaysRoute", "recurringJobs", "overdueInvoices", "waterChemistry"],
    terminology: { worker: "Technician", workerPlural: "Technicians", job: "Service", jobPlural: "Services", client: "Pool", clientPlural: "Pools", quote: "Quote" },
  },
  "pressure-washing": {
    slug: "pressure-washing",
    name: "Pressure Washing",
    modules: {
      ...BASE_MODULES,
      flatRatePricebook: DISABLED("Pricebook", "Flat-rate pricing"),
      roomSurfaceEstimating: DISABLED("Room Estimating", "Room estimating"),
      areaEstimating: mod(true, "Area Estimating", "Square footage estimating for surfaces"),
      aerialMeasurements: DISABLED("Aerial Measurements", "Aerial measurements"),
      recurringJobs: mod(true, "Recurring Jobs", "Monthly/quarterly wash schedules"),
      routeOptimization: mod(true, "Route Optimization", "Optimize daily routes"),
      emergencyDispatch: DISABLED("Emergency Dispatch", "Emergency dispatch"),
      crewScheduling: mod(true, "Crew Scheduling", "Multi-crew job assignment"),
      subcontractorMgmt: DISABLED("Subcontractors", "Subcontractor management"),
      beforeAfterPhotos: mod(true, "Before/After", "Before and after documentation"),
      chemicalTracking: DISABLED("Chemical Tracking", "Chemical dilution tracking"),
      refrigerantTracking: DISABLED("Refrigerant Log", "Refrigerant tracking"),
      waterChemistry: DISABLED("Water Chemistry", "Water chemistry"),
      permitTracking: DISABLED("Permits", "Permit tracking"),
      panelDocumentation: DISABLED("Panel Docs", "Panel documentation"),
      colorFinishTracking: DISABLED("Color Tracking", "Color records"),
      warrantyManagement: DISABLED("Warranties", "Warranty tracking"),
      maintenanceAgreements: DISABLED("Service Plans", "Service agreements"),
      seasonalContracts: DISABLED("Seasonal Contracts", "Seasonal automation"),
      trapMonitoring: DISABLED("Trap Monitoring", "Trap tracking"),
      progressBilling: DISABLED("Progress Billing", "Progress billing"),
      inventoryTracking: DISABLED("Inventory", "Inventory tracking"),
      shiftManagement: DISABLED("Shifts", "Shift scheduling"),
      inspectionReports: DISABLED("Inspections", "Inspection reports"),
    },
    defaultWidgets: ["revenue", "openQuotes", "activeJobs", "todaysRoute", "overdueInvoices"],
    terminology: { worker: "Operator", workerPlural: "Operators", job: "Job", jobPlural: "Jobs", client: "Customer", clientPlural: "Customers", quote: "Quote" },
  },
  "window-cleaning": {
    slug: "window-cleaning",
    name: "Window Cleaning",
    modules: {
      ...BASE_MODULES,
      flatRatePricebook: DISABLED("Pricebook", "Flat-rate pricing"),
      roomSurfaceEstimating: DISABLED("Room Estimating", "Room estimating"),
      areaEstimating: mod(true, "Area Estimating", "Pane count and building size estimating"),
      aerialMeasurements: DISABLED("Aerial Measurements", "Aerial measurements"),
      recurringJobs: mod(true, "Recurring Jobs", "Monthly/quarterly cleaning schedules"),
      routeOptimization: mod(true, "Route Optimization", "Optimize cleaning routes"),
      emergencyDispatch: DISABLED("Emergency Dispatch", "Emergency dispatch"),
      crewScheduling: DISABLED("Crew Scheduling", "Crew scheduling"),
      subcontractorMgmt: DISABLED("Subcontractors", "Subcontractor management"),
      beforeAfterPhotos: mod(true, "Before/After", "Window cleaning verification"),
      chemicalTracking: DISABLED("Chemical Tracking", "Chemical logging"),
      refrigerantTracking: DISABLED("Refrigerant Log", "Refrigerant tracking"),
      waterChemistry: DISABLED("Water Chemistry", "Water chemistry"),
      permitTracking: DISABLED("Permits", "Permit tracking"),
      panelDocumentation: DISABLED("Panel Docs", "Panel documentation"),
      colorFinishTracking: DISABLED("Color Tracking", "Color records"),
      warrantyManagement: DISABLED("Warranties", "Warranty tracking"),
      maintenanceAgreements: DISABLED("Service Plans", "Recurring cleaning contracts"),
      seasonalContracts: DISABLED("Seasonal Contracts", "Seasonal automation"),
      trapMonitoring: DISABLED("Trap Monitoring", "Trap tracking"),
      progressBilling: DISABLED("Progress Billing", "Progress billing"),
      inventoryTracking: DISABLED("Inventory", "Inventory tracking"),
      shiftManagement: DISABLED("Shifts", "Shift scheduling"),
      inspectionReports: DISABLED("Inspections", "Inspection reports"),
    },
    defaultWidgets: ["revenue", "todaysRoute", "recurringJobs", "activeJobs", "overdueInvoices"],
    terminology: { worker: "Cleaner", workerPlural: "Cleaners", job: "Job", jobPlural: "Jobs", client: "Property", clientPlural: "Properties", quote: "Quote" },
  },
  handyman: {
    slug: "handyman",
    name: "Handyman",
    modules: {
      ...BASE_MODULES,
      flatRatePricebook: mod(true, "Pricebook", "Set prices for common repair types"),
      roomSurfaceEstimating: DISABLED("Room Estimating", "Room estimating"),
      areaEstimating: DISABLED("Area Estimating", "Area estimating"),
      aerialMeasurements: DISABLED("Aerial Measurements", "Aerial measurements"),
      recurringJobs: DISABLED("Recurring Jobs", "Recurring services"),
      routeOptimization: DISABLED("Route Optimization", "Route optimization"),
      emergencyDispatch: DISABLED("Emergency Dispatch", "Emergency dispatch"),
      crewScheduling: DISABLED("Crew Scheduling", "Crew scheduling"),
      subcontractorMgmt: DISABLED("Subcontractors", "Subcontractor management"),
      beforeAfterPhotos: mod(true, "Before/After", "Repair verification photos"),
      chemicalTracking: DISABLED("Chemical Tracking", "Chemical logging"),
      refrigerantTracking: DISABLED("Refrigerant Log", "Refrigerant tracking"),
      waterChemistry: DISABLED("Water Chemistry", "Water chemistry"),
      permitTracking: DISABLED("Permits", "Permit tracking"),
      panelDocumentation: DISABLED("Panel Docs", "Panel documentation"),
      colorFinishTracking: DISABLED("Color Tracking", "Color records"),
      warrantyManagement: DISABLED("Warranties", "Warranty tracking"),
      maintenanceAgreements: DISABLED("Service Plans", "Maintenance agreements"),
      seasonalContracts: DISABLED("Seasonal Contracts", "Seasonal automation"),
      trapMonitoring: DISABLED("Trap Monitoring", "Trap tracking"),
      progressBilling: DISABLED("Progress Billing", "Progress billing"),
      inventoryTracking: DISABLED("Inventory", "Inventory tracking"),
      shiftManagement: DISABLED("Shifts", "Shift scheduling"),
      inspectionReports: DISABLED("Inspections", "Inspection reports"),
    },
    defaultWidgets: ["revenue", "openQuotes", "activeJobs", "overdueInvoices", "upcomingJobs"],
    terminology: { worker: "Handyman", workerPlural: "Team", job: "Job", jobPlural: "Jobs", client: "Customer", clientPlural: "Customers", quote: "Quote" },
  },
};

/** Get the industry config for a given trade. Falls back to handyman (most generic). */
export function getIndustryConfig(slug: IndustrySlug): IndustryConfig {
  return INDUSTRY_CONFIGS[slug] ?? INDUSTRY_CONFIGS.handyman;
}

/** Get only the enabled modules for a given trade. */
export function getEnabledModules(slug: IndustrySlug) {
  const config = getIndustryConfig(slug);
  return Object.entries(config.modules)
    .filter(([, mod]) => mod.enabled)
    .map(([key, mod]) => ({ key, ...mod }));
}

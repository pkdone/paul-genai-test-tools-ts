/**
 * Reporting configuration
 */
export const reportingConfig = {
  APP_DESCRIPTION_KEY: "appdescription",
  APP_SUMMARY_ARRAY_FIELDS_TO_GENERATE_KEYS: [
    "technologies",
    "boundedcontexts",
    "busentities",
    "busprocesses"
  ] as const,
  CATEGORY_TITLES: {
    appdescription: "Application Description",
    technologies: "Technology Stack",
    boundedcontexts: "Bounded Contexts",
    busentities: "Business Entities",
    busprocesses: "Business Processes",
  } as const,
} as const;

export default reportingConfig; 
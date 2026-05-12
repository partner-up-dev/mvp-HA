export type AdminNavigationGroup = {
  id: string;
  labelKey: string;
  items: AdminNavigationItem[];
};

export type AdminNavigationItem = {
  id: string;
  labelKey: string;
  routeName: string;
  sectionId?: string;
  hash?: string;
};

const sectionHash = (sectionId: string): string => `#${sectionId}`;

export const adminNavigationGroups: AdminNavigationGroup[] = [
  {
    id: "anchor-event",
    labelKey: "adminCommon.navAnchorEventGroup",
    items: [
      {
        id: "anchor-event-basic",
        labelKey: "adminCommon.navAnchorEventBasic",
        routeName: "admin-anchor-events",
        sectionId: "anchor-event-basic",
        hash: sectionHash("anchor-event-basic"),
      },
      {
        id: "anchor-event-locations",
        labelKey: "adminCommon.navAnchorEventLocations",
        routeName: "admin-anchor-events",
        sectionId: "anchor-event-locations",
        hash: sectionHash("anchor-event-locations"),
      },
      {
        id: "anchor-event-time",
        labelKey: "adminCommon.navAnchorEventTime",
        routeName: "admin-anchor-events",
        sectionId: "anchor-event-time",
        hash: sectionHash("anchor-event-time"),
      },
      {
        id: "anchor-event-tags",
        labelKey: "adminCommon.navAnchorEventTags",
        routeName: "admin-anchor-events",
        sectionId: "anchor-event-tags",
        hash: sectionHash("anchor-event-tags"),
      },
      {
        id: "anchor-event-other",
        labelKey: "adminCommon.navAnchorEventOther",
        routeName: "admin-anchor-events",
        sectionId: "anchor-event-other",
        hash: sectionHash("anchor-event-other"),
      },
    ],
  },
  {
    id: "pr",
    labelKey: "adminCommon.navPRGroup",
    items: [
      {
        id: "pr-basic",
        labelKey: "adminCommon.navPRBasic",
        routeName: "admin-pr",
        sectionId: "pr-basic",
        hash: sectionHash("pr-basic"),
      },
      {
        id: "pr-messages",
        labelKey: "adminCommon.navPRMessages",
        routeName: "admin-pr",
        sectionId: "pr-messages",
        hash: sectionHash("pr-messages"),
      },
    ],
  },
  {
    id: "support-resources",
    labelKey: "adminCommon.navSupportResourcesGroup",
    items: [
      {
        id: "support-resource-config",
        labelKey: "adminCommon.navSupportResourceConfig",
        routeName: "admin-booking-support",
      },
      {
        id: "support-resource-execution",
        labelKey: "adminCommon.navSupportResourceExecution",
        routeName: "admin-booking-execution",
      },
    ],
  },
  {
    id: "pois",
    labelKey: "adminCommon.navPoisGroup",
    items: [
      {
        id: "poi-basic",
        labelKey: "adminCommon.navPoiBasic",
        routeName: "admin-pois",
        sectionId: "poi-basic",
        hash: sectionHash("poi-basic"),
      },
      {
        id: "poi-review",
        labelKey: "adminCommon.navPoiReview",
        routeName: "admin-pois",
        sectionId: "poi-review",
        hash: sectionHash("poi-review"),
      },
    ],
  },
  {
    id: "feedback-questionnaires",
    labelKey: "adminCommon.navFeedbackQuestionnairesGroup",
    items: [
      {
        id: "feedback-questionnaire-templates",
        labelKey: "adminCommon.navFeedbackQuestionnaireTemplates",
        routeName: "admin-feedback-questionnaires",
      },
    ],
  },
];

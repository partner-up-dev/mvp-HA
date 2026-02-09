export interface MessageSchema {
  app: {
    name: string;
    siteName: string;
  };
  common: {
    loading: string;
    loadingLong: string;
    cancel: string;
    confirm: string;
    save: string;
    create: string;
    close: string;
    backToHome: string;
    submit: string;
    copied: string;
    copyFailed: string;
    operationFailed: string;
  };
  status: {
    draft: string;
    open: string;
    active: string;
    closed: string;
    expired: string;
    full: string;
  };
  home: {
    title: string;
    subtitle: string;
    structuredEntryPrefix: string;
    naturalLanguageEntry: string;
    naturalLanguagePanelTitle: string;
    topics: {
      movie: {
        name: string;
        example: string;
      };
      sports: {
        name: string;
        example: string;
      };
      explore: {
        name: string;
        example: string;
      };
      hiking: {
        name: string;
        example: string;
      };
      study: {
        name: string;
        example: string;
      };
    };
  };
  createPage: {
    title: string;
    savePending: string;
    createPending: string;
    createFailed: string;
  };
  prPage: {
    join: string;
    joining: string;
    exit: string;
    exiting: string;
    editContent: string;
    modifyStatus: string;
    metaFallbackTitle: string;
    metaFallbackDescription: string;
    metaTitleWithName: string;
  };
  createdPRList: {
    title: string;
    empty: string;
    loading: string;
    loadFailed: string;
  };
  dateTimeRangePicker: {
    defaultLabel: string;
    defaultHint: string;
    startDatePlaceholder: string;
    startTimePlaceholder: string;
    endDatePlaceholder: string;
    endTimePlaceholder: string;
    clearTime: string;
    clear: string;
  };
  modifyStatusModal: {
    title: string;
    pinLabel: string;
    confirmAction: string;
    updateFailed: string;
  };
  editContentModal: {
    title: string;
    confirmAction: string;
    updateFailed: string;
  };
  share: {
    prevMethodAria: string;
    nextMethodAria: string;
    methods: {
      copyLink: string;
      wechat: string;
      xiaohongshu: string;
    };
    asLink: {
      previewTitle: string;
      copyButton: string;
      shareFailed: string;
    };
    wechat: {
      previewTitle: string;
      generating: string;
      guidanceLine1: string;
      guidanceLine2: string;
      switchStyle: string;
      defaultShareTitle: string;
      fallbackKeyText: string;
      thumbAlt: string;
      selfLabel: string;
    };
    xiaohongshu: {
      regenerateButton: string;
      generating: string;
      captionPlaceholder: string;
      posterAlt: string;
      saveHint: string;
      shareHint: string;
      posterGenerating: string;
      posterNotGenerated: string;
      copyCaptionButton: string;
      downloadButton: string;
      wechatDownloadHint: string;
      openAppButton: string;
      generatePosterFirst: string;
      downloadFailed: string;
      defaultPosterStylePrompt: string;
    };
  };
  prInput: {
    label: string;
    placeholder: string;
  };
  pinInput: {
    label: string;
    hint: string;
    placeholder: string;
    regenerateTitle: string;
    info: string;
  };
  nlForm: {
    submit: string;
    parsing: string;
    createFailed: string;
  };
  partnerRequestForm: {
    title: string;
    titlePlaceholder: string;
    type: string;
    typePlaceholder: string;
    location: string;
    locationPlaceholder: string;
    minPartners: string;
    minPartnersPlaceholder: string;
    maxPartners: string;
    maxPartnersPlaceholder: string;
    budget: string;
    budgetPlaceholder: string;
    preferences: string;
    preferencesPlaceholder: string;
    removePreference: string;
    notes: string;
    notesPlaceholder: string;
    pin: string;
    pinPlaceholder: string;
    requiredMark: string;
    advancedShow: string;
    advancedHide: string;
  };
  prCard: {
    type: string;
    time: string;
    location: string;
    partners: string;
    budget: string;
    preferences: string;
    notes: string;
    rawText: string;
    partnersCurrentWithMax: string;
    partnersCurrentOnly: string;
    partnersAtLeastClause: string;
    partnersExact: string;
    partnersRange: string;
    partnersAtLeast: string;
    partnersAtMost: string;
  };
  validation: {
    pinMustBeFourDigits: string;
    typeRequired: string;
    naturalLanguageRequired: string;
    naturalLanguageWordLimit: string;
  };
  errors: {
    createRequestFailed: string;
    updateStatusFailed: string;
    updateContentFailed: string;
    missingPartnerRequestId: string;
    fetchRequestFailed: string;
    fetchCreatedRequestsFailed: string;
    joinRequestFailed: string;
    exitRequestFailed: string;
    generateCaptionFailed: string;
    generateXhsPosterHtmlFailed: string;
    generateWechatThumbHtmlFailed: string;
    uploadFailed: string;
    clipboardCopyFailed: string;
    canvasBlobFailed: string;
    posterElementMissing: string;
    thumbnailElementMissing: string;
    posterGenerationFailed: string;
    unsafeHtml: string;
    iframeBodyUnavailable: string;
    iframeDocumentUnavailable: string;
    iframeLoadTimeout: string;
    wechatSdkNotLoaded: string;
    wechatInitFailed: string;
    wechatInitTimeout: string;
    wechatInitError: string;
    initializeFailed: string;
  };
  posterStyles: {
    fresh: string;
    minimal: string;
    warm: string;
    modern: string;
    elegant: string;
  };
}

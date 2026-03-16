/*
Review Schema alignment helpers for the canonical knowledge contract.

This module intentionally focuses on low-risk schema alignment and adapters:
- Canonical ReviewStatus.state normalization.
- Canonical ProvenanceRecord normalization.
- Transitional workflow metadata alignment (TextAnchor, Work, Person, glossary terms).
*/
(function (globalScope) {
  const CANONICAL_REVIEW_STATES = Object.freeze({
    DRAFT: "draft",
    IN_REVIEW: "in_review",
    CHANGES_REQUESTED: "changes_requested",
    APPROVED: "approved",
    REJECTED: "rejected",
    PUBLISHED: "published",
    ARCHIVED: "archived",
  });

  const LEGACY_TO_CANONICAL_REVIEW_STATE = Object.freeze({
    draft: CANONICAL_REVIEW_STATES.DRAFT,
    pending: CANONICAL_REVIEW_STATES.IN_REVIEW,
    under_review: CANONICAL_REVIEW_STATES.IN_REVIEW,
    in_review: CANONICAL_REVIEW_STATES.IN_REVIEW,
    needs_revision: CANONICAL_REVIEW_STATES.CHANGES_REQUESTED,
    changes_requested: CANONICAL_REVIEW_STATES.CHANGES_REQUESTED,
    approved: CANONICAL_REVIEW_STATES.APPROVED,
    accepted: CANONICAL_REVIEW_STATES.APPROVED,
    rejected: CANONICAL_REVIEW_STATES.REJECTED,
    denied: CANONICAL_REVIEW_STATES.REJECTED,
    published: CANONICAL_REVIEW_STATES.PUBLISHED,
    archived: CANONICAL_REVIEW_STATES.ARCHIVED,
  });

  const CANONICAL_TO_LEGACY_REVIEW_STATE = Object.freeze({
    [CANONICAL_REVIEW_STATES.DRAFT]: "draft",
    [CANONICAL_REVIEW_STATES.IN_REVIEW]: "under_review",
    [CANONICAL_REVIEW_STATES.CHANGES_REQUESTED]: "needs_revision",
    [CANONICAL_REVIEW_STATES.APPROVED]: "approved",
    [CANONICAL_REVIEW_STATES.REJECTED]: "rejected",
    [CANONICAL_REVIEW_STATES.PUBLISHED]: "published",
    [CANONICAL_REVIEW_STATES.ARCHIVED]: "archived",
  });

  const CANONICAL_PROVENANCE_SOURCE_TYPES = Object.freeze({
    IMPORT: "import",
    HUMAN_EDIT: "human_edit",
    MODEL_SUGGESTION: "model_suggestion",
    REVIEW_DECISION: "review_decision",
    UNKNOWN: "unknown",
  });

  function normalizeState(state) {
    if (!state || typeof state !== "string") {
      return CANONICAL_REVIEW_STATES.DRAFT;
    }

    const normalized = state.trim().toLowerCase();
    return LEGACY_TO_CANONICAL_REVIEW_STATE[normalized] || normalized;
  }

  function normalizeReviewStatus(input) {
    const value = typeof input === "string" ? { state: input } : (input || {});
    const canonicalState = normalizeState(value.state || value.status);

    return {
      state: canonicalState,
      reviewerId: value.reviewerId || value.reviewedBy || "",
      reviewedAt: value.reviewedAt || value.timestamp || "",
      notes: value.notes || value.reason || "",
      legacyState:
        value.state && value.state !== canonicalState
          ? value.state
          : value.status && value.status !== canonicalState
            ? value.status
            : "",
    };
  }

  function toLegacyReviewStatus(canonicalReviewStatus) {
    const normalized = normalizeReviewStatus(canonicalReviewStatus);
    return {
      status: CANONICAL_TO_LEGACY_REVIEW_STATE[normalized.state] || normalized.state,
      reviewedBy: normalized.reviewerId,
      timestamp: normalized.reviewedAt,
      reason: normalized.notes,
    };
  }

  function normalizeProvenanceRecord(input) {
    const value = input || {};

    const sourceType = value.sourceType || value.type || value.origin || CANONICAL_PROVENANCE_SOURCE_TYPES.UNKNOWN;

    return {
      sourceType,
      sourceId: value.sourceId || value.id || value.sourceRef || "",
      sourceUrl: value.sourceUrl || value.url || value.source || "",
      capturedAt: value.capturedAt || value.createdAt || value.timestamp || "",
      capturedBy: value.capturedBy || value.createdBy || value.authorId || "",
      confidence:
        typeof value.confidence === "number"
          ? value.confidence
          : typeof value.score === "number"
            ? value.score
            : null,
      notes: value.notes || value.comment || "",
      legacy: {
        origin: value.origin || "",
        provider: value.provider || "",
      },
    };
  }

  function normalizeAsArray(value) {
    if (!value) {
      return [];
    }
    return Array.isArray(value) ? value.filter(Boolean) : [value];
  }

  function alignReviewWorkflowMetadata(input) {
    const value = input || {};

    return {
      textAnchors: normalizeAsArray(value.textAnchors || value.textAnchor),
      works: normalizeAsArray(value.works || value.work),
      persons: normalizeAsArray(value.persons || value.person || value.reviewers),
      glossaryTerms: normalizeAsArray(value.glossaryTerms || value.glossaryTerm || value.tags),
      transitional: {
        hasLegacyTextAnchor: Boolean(value.textAnchor),
        hasLegacyWork: Boolean(value.work),
        hasLegacyPerson: Boolean(value.person || value.reviewers),
        hasLegacyGlossaryTag: Boolean(value.tags),
      },
    };
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      CANONICAL_REVIEW_STATES,
      CANONICAL_PROVENANCE_SOURCE_TYPES,
      LEGACY_TO_CANONICAL_REVIEW_STATE,
      normalizeReviewStatus,
      toLegacyReviewStatus,
      normalizeProvenanceRecord,
      alignReviewWorkflowMetadata,
    };
  }

  globalScope.CANONICAL_REVIEW_STATES = CANONICAL_REVIEW_STATES;
  globalScope.CANONICAL_PROVENANCE_SOURCE_TYPES = CANONICAL_PROVENANCE_SOURCE_TYPES;
  globalScope.LEGACY_TO_CANONICAL_REVIEW_STATE = LEGACY_TO_CANONICAL_REVIEW_STATE;
  globalScope.normalizeReviewStatus = normalizeReviewStatus;
  globalScope.toLegacyReviewStatus = toLegacyReviewStatus;
  globalScope.normalizeProvenanceRecord = normalizeProvenanceRecord;
  globalScope.alignReviewWorkflowMetadata = alignReviewWorkflowMetadata;
})(typeof globalThis !== "undefined" ? globalThis : this);

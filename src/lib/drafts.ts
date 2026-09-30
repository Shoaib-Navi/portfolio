/**
 * Draft content (unverified case studies, notes) is visible in `next dev` and in the
 * admin so it can be reviewed, and is left out of every production build.
 */
export const SHOW_DRAFTS = process.env.NODE_ENV !== "production";

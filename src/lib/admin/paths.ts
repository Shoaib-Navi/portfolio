/** URL the admin uses to show a /public file, including ones that exist only in the draft. */
export const adminSrc = (publicPath: string) => `/admin/file?p=${encodeURIComponent(publicPath)}`;

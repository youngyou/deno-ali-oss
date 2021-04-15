import { Buffer, HMAC, SHA1 } from "./deps.ts";

type SubResourceTag = "acl" | "uploads" | "location" | "cors" | "logging" | "website" | "referer" | "lifecycle" | "delete" | "append" | "tagging" | "objectMeta" | "uploadId" | "partNumber" | "security-token" | "position" | "img" | "style" | "styleName" | "replication" | "replicationProgress" | "replicationLocation" | "cname" | "bucketInfo" | "comp" | "qos" | "live" | "status" | "vod" | "startTime" | "endTime" | "symlink"; // prettier-ignore
type SubResourceHeader =
  | "response-content-type"
  | "response-content-language"
  | "response-expires"
  | "response-cache-control"
  | "response-content-disposition"
  | "response-content-encoding";
type SubResourceProcess = "x-oss-process";

export type SubResource =
  | SubResourceHeader
  | SubResourceTag
  | SubResourceProcess;

// function buildCanonicalizedOSSHeaders(headers: Record<string, string>) {
//   const str = Object.keys(headers)
//     .map((k) => {
//       const lower = k.trim().toLowerCase();
//       if (!k.startsWith("x-oss-")) return;
//       return `${lower}:${headers[k].trim()}`;
//     })
//     .filter(Boolean)
//     .join("\n");
//   return str ? `${str}\n` : str;
// }

/**
 *
 * @param {String} resourcePath
 * @param {Object} subResource subResource
 * @return
 */
export function buildCanonicalizedResource(
  resourcePath: string,
  subResource: Record<string, string | void> = {}
) {
  const q = Object.keys(subResource)
    .map((k) => {
      const val = subResource[k];
      return val ? `${k}=${val}` : k;
    })
    .sort()
    .join("&");
  return q ? `${resourcePath}?${q}` : resourcePath;
}

/**
 * @param {String} method
 * @param {String} resourcePath
 * @param {Object} request
 * @param {String} expires
 * @return {String} canonicalString
 */
export function buildCanonicalString(
  method: string,
  resourcePath: string,
  request: {
    headers: Record<string, string>;
    parameters: Record<string, string | void>;
  },
  expires?: string
) {
  const headers = Object.keys(request.headers).reduce(
    (prev: Record<string, string>, key: string) => {
      prev[key.toLowerCase()] = request.headers[key].trim();
      return prev;
    },
    {} as Record<string, string>
  );

  let signContent = [
    method.toUpperCase(),
    headers["content-md5"] || "",
    headers["content-type"],
    expires || headers["x-oss-date"],
  ];

  const ossHeaders = Object.keys(headers)
    .filter((k) => k.startsWith("x-oss-"))
    .sort()
    .map((k) => `${k}:${headers[k].trim()}`);

  signContent = signContent.concat(ossHeaders);

  signContent.push(
    buildCanonicalizedResource(resourcePath, request.parameters)
  );

  return signContent.join("\n");
}

/**
 * @param {String} accessKeySecret
 * @param {String} canonicalString
 */
export function computeSignature(
  accessKeySecret: string,
  canonicalString: string,
  headerEncoding = "utf-8"
) {
  const signature = new HMAC(new SHA1()).init(accessKeySecret);
  return signature
    .update(Buffer.from(canonicalString, headerEncoding))
    .digest("base64");
}

/**
 * @param {String} accessKeyId
 * @param {String} accessKeySecret
 * @param {String} canonicalString
 */
export function authorization(
  accessKeyId: string,
  accessKeySecret: string,
  canonicalString: string,
  headerEncoding?: string
) {
  return `OSS ${accessKeyId}:${computeSignature(
    accessKeySecret,
    canonicalString,
    headerEncoding
  )}`;
}

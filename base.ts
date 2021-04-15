import { request as _req, xmlParse } from "./deps.ts";
import * as signUtils from "./sign-util.ts";

class Base {
  constructor(
    protected region: string,
    protected keyId: string,
    protected secret: string,
    protected bucketName?: string
  ) {}
  buildHeaders(headers: Record<string, string>) {
    return {
      "x-oss-date": new Date().toUTCString(),
      ...headers,
    };
  }
  get host() {
    if (this.bucketName) {
      return `https://${this.bucketName}.${this.region}.aliyuncs.com`;
    }
    return `https://${this.region}.aliyuncs.com`;
  }
  signature(
    method = "GET",
    resource: string,
    headers: Record<string, string>,
    subres: Record<string, string | void> = {}
  ) {
    const stringToSign = signUtils.buildCanonicalString(
      method.toUpperCase(),
      resource,
      {
        headers,
        parameters: subres,
      }
    );
    return signUtils.authorization(this.keyId, this.secret, stringToSign);
  }
  buildUrl(objectName: string, query: Record<string, string | undefined> = {}) {
    const qs = Object.keys(query)
      .filter((k) => query[k] !== undefined && query[k] !== "")
      .map((k) => `${k}=${query![k]}`)
      .join("&");
    return this.host + objectName + (qs ? `?${qs}` : qs);
  }
  buildResource(objectName: string) {
    const oName = objectName.startsWith("/")
      ? objectName.substr(1)
      : objectName;
    return this.bucketName
      ? oName
        ? `/${this.bucketName}/${oName}`
        : `/${this.bucketName}`
      : "/";
  }
  async request(
    method: string,
    objectName: string,
    req: {
      headers?: Record<string, string>;
      query?: Record<string, string | undefined>;
      body?: BodyInit;
    } = {}
  ) {
    const _headers = this.buildHeaders(req.headers || {});
    const url = this.buildUrl(objectName, req.query);
    const resource = this.buildResource(objectName);
    const res = await fetch(url, {
      method,
      headers: {
        ..._headers,
        Authorization: this.signature(method, resource, _headers),
      },
      body: req.body,
    });
    const xml = await res.text();
    if (!res.ok) {
      throw { code: res.status, message: res.statusText, body: xml };
    }
    return xmlParse(xml);
  }
  get = this.request.bind(this, "GET");
  put = this.request.bind(this, "PUT");
  delete = this.request.bind(this, "DELETE");
  post = this.request.bind(this, "POST");
}

export default Base;

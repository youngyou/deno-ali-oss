import Base from "./base.ts";
import Bucket from "./bucket.ts";

class Client extends Base {
  constructor(
    protected region: string,
    protected keyId: string,
    protected secret: string
  ) {
    super(region, keyId, secret);
  }
  async listBuckets(prefix?: string, marker?: string, maxKeys?: number) {
    const res = await this.get("/", {
      query: { marker, prefix, "max-keys": maxKeys ? `${maxKeys}` : undefined },
    });
    return res.ListAllMyBucketsResult;
  }
  bucket(bucketName: string) {
    return new Bucket(this.region, this.keyId, this.secret, bucketName);
  }
}

export default Client;

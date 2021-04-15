import { lookup } from "https://deno.land/x/media_types@v2.7.1/mod.ts";
import Base from "./base.ts";
interface ClientOption {
  region: string;
  accessKeyId: string;
  accessSecret: string;
  bucket?: string;
  headerEncoding?: string;
}

class Bucket extends Base {
  async putObject(name: string, body: BodyInit, contentType?: string) {
    await this.put(`/${name}`, {
      body,
      headers: {
        "Content-Type": contentType ?? lookup(name) ?? "",
      },
    });
    return this.buildUrl(`/${name}`);
  }
  async putLocalFile(name: string, filePath: string, contentType?: string) {
    const file = await Deno.open(filePath);
    const stream = new ReadableStream({
      async pull(controller) {
        try {
          const b = new Uint8Array(1024 * 32);
          const result = await file.read(b);
          if (result === null) {
            controller.close();
            return file.close();
          }
          controller.enqueue(b.subarray(0, result));
        } catch (e) {
          controller.error(e);
          controller.close();
          file.close();
        }
      },
      cancel() {
        file.close(); // When reader.cancel() is called
      },
    });
    await this.put(`/${name}`, {
      body: stream,
      headers: {
        "Content-Type": contentType ?? lookup(name) ?? "",
      },
    });
    return this.buildUrl(`/${name}`);
  }
}

export default Bucket;

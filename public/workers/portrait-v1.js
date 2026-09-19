// Same-origin only. A fresh dedicated worker per job permits real cancellation.
import * as ort from "/vendor/onnxruntime-1.30.0/ort.wasm.min.mjs";

globalThis.onmessage = async ({ data }) => {
  let session;
  try {
    if (!(data?.pixels instanceof Float32Array) || data.pixels.length !== 3 * 320 * 320) throw new Error("invalid-input");
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.proxy = false;
    ort.env.wasm.wasmPaths = new URL("/vendor/onnxruntime-1.30.0/", globalThis.location.origin).href;
    globalThis.postMessage({ phase: "loading" });
    session = await ort.InferenceSession.create("/models/portrait/u2netp-v1/model.onnx", { executionProviders: ["wasm"], graphOptimizationLevel: "all" });
    globalThis.postMessage({ phase: "processing" });
    const input = new ort.Tensor("float32", data.pixels, [1, 3, 320, 320]);
    const output = await session.run({ [session.inputNames[0]]: input });
    const result = output[session.outputNames[0]];
    if (!(result.data instanceof Float32Array) || result.data.length !== 320 * 320) throw new Error("invalid-output");
    const mask = new Float32Array(result.data);
    input.dispose();
    for (const tensor of Object.values(output)) tensor.dispose();
    globalThis.postMessage({ mask }, [mask.buffer]);
  } catch {
    // Do not echo input, file metadata, internal URLs or raw runtime errors.
    globalThis.postMessage({ error: "暂时无法完成抠图，请重试或换一张照片。" });
  } finally {
    if (session) await session.release();
    globalThis.close();
  }
};

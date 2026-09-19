# U²-Net small — local feasibility candidate

Not yet quality-approved for production. General salient-object segmentation, not face reconstruction or hair matting. No user photos transmitted to upstream services.

- Original authors: Xuebin Qin, Zichen Zhang, Chenyang Huang, Masood Dehghan, Osmar R. Zaiane, Martin Jagersand.
- Upstream: https://github.com/xuebinqin/U-2-Net (Apache-2.0, LICENSE alongside).
- ONNX distribution used by rembg: https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2netp.onnx
- Verified upstream rembg MD5: `8e83ca70e441ab06c318d82300c84806`.
- SHA-256: `309c8469258dda742793dce0ebea8e6dd393174f89934733ecc8b14c76f4ddd8`.
- Retrieved 2026-09-16. Input RGB NCHW 1×3×320×320; first output saliency mask.
- Browser implementation preserves colour and multiplies original alpha; one inference worker per job, terminated on cancel/timeout. Weights hosted same-origin, not runtime CDN.

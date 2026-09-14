# Offline models

Build resources for desktop. Model weights and the compiled executable are deliberately excluded from Git and included in the DMG under Resources.

- Whisper.cpp v1.9.2 (MIT), compiled static for Apple Silicon, CPU + Accelerate. Model: OpenAI Whisper Base multilingual, converted by ggerganov/whisper.cpp. English, Spanish and automatic language selection. No network calls during use.
- Audio events: Xenova/ast-finetuned-audioset-10-10-0.4593, quantized ONNX conversion of MIT AST AudioSet, BSD-3-Clause. Runs locally through Transformers.js/ONNX Runtime in a worker. Top class is a suggestion, not ground truth; feedback is recorded rather than automatic fine-tuning.
- Reproduce resources with `scripts/prepare-whisper.sh` (requires CMake and Apple command-line tools). Pin model weights with MODEL_CHECKSUMS.txt when reproducing this release.

Sources: https://github.com/ggml-org/whisper.cpp ; https://github.com/openai/whisper ; https://huggingface.co/ggerganov/whisper.cpp ; https://huggingface.co/Xenova/ast-finetuned-audioset-10-10-0.4593 .

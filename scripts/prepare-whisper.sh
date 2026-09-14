#!/bin/sh
# Reproduce the offline resources for the Apple Silicon desktop package.
set -eu
cd "$(dirname "$0")/.."
mkdir -p work native/whisper native/audioset/onnx
if [ ! -d work/whisper.cpp ]; then
  git clone --depth 1 --branch v1.9.2 https://github.com/ggml-org/whisper.cpp.git work/whisper.cpp
fi
cmake -S work/whisper.cpp -B work/whisper-build -DCMAKE_BUILD_TYPE=Release -DBUILD_SHARED_LIBS=OFF -DGGML_METAL=OFF -DGGML_BLAS=OFF -DGGML_BACKEND_DL=OFF -DWHISPER_BUILD_TESTS=OFF -DWHISPER_BUILD_SERVER=OFF
cmake --build work/whisper-build --target whisper-cli -j 4
cp work/whisper-build/bin/whisper-cli native/whisper/whisper-cli
cp work/whisper.cpp/LICENSE native/whisper/LICENSE
codesign --force --sign - native/whisper/whisper-cli
[ -f native/whisper/ggml-base.bin ] || curl -L --fail --retry 2 https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin -o native/whisper/ggml-base.bin
for resource in config.json preprocessor_config.json onnx/model_quantized.onnx; do
  [ -f "native/audioset/$resource" ] || curl -L --fail --retry 2 "https://huggingface.co/Xenova/ast-finetuned-audioset-10-10-0.4593/resolve/main/$resource" -o "native/audioset/$resource"
done
shasum -a 256 native/whisper/ggml-base.bin native/audioset/onnx/model_quantized.onnx

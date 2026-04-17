# Local AI Setup

This project now uses free local AI components for the Bedrock and Rekognition replacement path.

## What changed
- Identity verification now uses local computer-vision heuristics backed by JavaCV.
- Interview question generation and assessment analysis now use a local Ollama endpoint.
- If Ollama is unavailable, the app falls back to safe built-in logic.

## Ollama quick setup
1. Install Ollama on your machine.
2. Pull a model such as:
   - llama3.1
3. Start the Ollama service.
4. Optional environment values:
   - LOCAL_AI_PROVIDER=ollama
   - OLLAMA_BASE_URL=http://localhost:11434
   - OLLAMA_MODEL=llama3.1

## Notes
- S3 storage is still separate from this change.
- If you later want a fully AWS-free runtime, the next step would be replacing S3 with local storage or MinIO.

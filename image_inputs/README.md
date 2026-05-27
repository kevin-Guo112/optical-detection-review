# Image Question Inputs

Put screenshots or photos of extra exam questions in this folder.

Supported workflow:

```powershell
npm.cmd run import:images -- image_inputs
```

The importer creates `image_inputs/imported-image-questions.json`.

If OCR tooling is not installed, the importer still records the image files and marks them as `needs_transcription`, so the questions can be transcribed and classified manually without losing the file references.

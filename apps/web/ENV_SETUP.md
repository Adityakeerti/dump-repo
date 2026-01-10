# Environment Variables Setup

## HuggingFace API Key

The VBoard voice assistant requires a HuggingFace API key. This key should be stored in a `.env` file and **never committed to git**.

### Setup Instructions

1. Create a `.env` file in the `frontend/web` directory:
   ```bash
   cd frontend/web
   ```

2. Add the following content to `.env`:
   ```
   HF_KEY=your_huggingface_api_key_here
   ```

3. Replace `your_huggingface_api_key_here` with your actual HuggingFace API key.

4. Get your API key from: https://huggingface.co/settings/tokens

### How It Works

- The `server.py` in `public/vboard/` automatically loads the `HF_KEY` from the `.env` file
- The key is injected into `env.js` dynamically when the server serves the file
- The static `env.js` file no longer contains the hardcoded key

### Security Notes

- ✅ `.env` is already in `.gitignore` - it will not be committed
- ✅ The key is only loaded server-side and injected at runtime
- ✅ Never share your `.env` file or commit it to version control


# My Team Site

A modern, dark-themed website showcasing team members with smooth animations and transitions.

## Features

- **Front Page**: Authorization page with animated bird
- **Landing Page**: Main showcase with video and modules
- **Team Page**: Interactive ID cards for team members

## Tech Stack

- React 19
- Vite
- React Router (HashRouter for GitHub Pages)
- Tailwind CSS
- Framer Motion
- Lucide React Icons

## Local Development

```bash
npm install
npm run dev
```

## Deployment to GitHub Pages

1. **Create a GitHub repository** (if you haven't already)

2. **Initialize git and push your code**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/099Aditya/Angry.git
   git push -u origin main
   ```

3. **Enable GitHub Pages**:
   - Go to your repository on GitHub
   - Click on **Settings**
   - Scroll down to **Pages** section
   - Under **Source**, select **GitHub Actions**

4. **The GitHub Action will automatically deploy** when you push to main branch

5. **Your site will be available at**:
   - `https://099Aditya.github.io/Angry/`

## Important Notes

- This project uses **HashRouter** instead of BrowserRouter for GitHub Pages compatibility
- URLs will have `#` in them (e.g., `/#/landing`, `/#/team`)
- The GitHub Action workflow will automatically build and deploy on every push to main branch

## Building for Production

```bash
npm run build
```

The built files will be in the `dist` folder.

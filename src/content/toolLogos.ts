/**
 * Official marks for the skills list. Brand glyphs come from Simple Icons (each mark as published by its owner);
 * Playwright and Matplotlib use their full-colour logos from playwright.dev and the Matplotlib repository;
 * Power BI uses Microsoft's glyph (Simple Icons 9, source: Microsoft Power Platform icon guidance).
 * Concepts that are not brands (REST APIs, datasets…) get a neutral line icon, never an invented logo.
 */
import {
  siJavascript, siTypescript, siPython, siHtml5, siCss3, siReact, siThreedotjs, siGreensock, siVite, siTailwindcss, siStreamlit,
  siNodedotjs, siCloudflareworkers, siVercel, siRender, siNetlify, siPostgresql, siSqlite, siCloudflare, siSupabase, siFirebase, siMysql,
  siRazorpay, siDocker, siKubernetes, siLinux, siGit, siGithub, siClaude, siOpenai, siGithubcopilot, siNumpy, siPandas, siOpencv,
  siScikitlearn, siTensorflow, siPytorch, siFlask, siRos, siArduino, siN8n,
} from 'simple-icons';

export type ToolLogo = { path: string; hex: string } | { src: string } | { icon: string };
const g = (i: { path: string; hex: string }) => ({ path: i.path, hex: i.hex });
const POWER_BI = { path: 'M10 12a1 1 0 0 1 1 1v11H4a1 1 0 0 1-1-1V13a1 1 0 0 1 1-1h6Zm-2-.5V7a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v17h-4.5V13a1.5 1.5 0 0 0-1.5-1.5H8Zm5-6V1a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v22a1 1 0 0 1-1 1h-3.5V7A1.5 1.5 0 0 0 15 5.5h-2Z', hex: 'F2C811' };

export const toolLogos: Record<string, ToolLogo> = {
  JavaScript: g(siJavascript), TypeScript: g(siTypescript), Python: g(siPython), HTML: g(siHtml5), CSS: g(siCss3), SQL: { icon: 'db' },
  React: g(siReact), 'Three.js': g(siThreedotjs), GSAP: g(siGreensock), Vite: g(siVite), 'Tailwind CSS': g(siTailwindcss), Streamlit: g(siStreamlit),
  WebGL: { icon: 'cube' }, 'GLSL shaders': { icon: 'infer' }, 'Scroll animation': { icon: 'motion' }, '3D lighting & materials': { icon: 'cube' },
  'Node.js': g(siNodedotjs), 'Cloudflare Workers': g(siCloudflareworkers), Vercel: g(siVercel), Render: g(siRender), Netlify: g(siNetlify),
  PostgreSQL: g(siPostgresql), SQLite: g(siSqlite), 'Cloudflare D1': g(siCloudflare), Supabase: g(siSupabase), Firebase: g(siFirebase), MySQL: g(siMysql), 'Cloudflare R2': g(siCloudflare),
  'REST APIs': { icon: 'api' }, Razorpay: g(siRazorpay), 'AI APIs': { icon: 'ai' }, Webhooks: { icon: 'hook' }, 'Email (SMTP)': { icon: 'mail' }, ipstack: { icon: 'globe' },
  Docker: g(siDocker), Kubernetes: g(siKubernetes), 'CI/CD pipelines': { icon: 'cicd' }, Linux: g(siLinux), Networking: { icon: 'net' }, Git: g(siGit), GitHub: g(siGithub),
  Cloudflared: g(siCloudflare), Playwright: { src: '/brand/tools/playwright.svg' },
  Claude: g(siClaude), 'Claude Code': g(siClaude), Codex: g(siOpenai), Antigravity: { icon: 'ai' }, 'GitHub Copilot': g(siGithubcopilot),
  RAG: { icon: 'ai' }, 'n8n workflows': g(siN8n),
  'Data analysis': { icon: 'train' }, 'Data cleaning': { icon: 'check' }, 'Exploratory data analysis': { icon: 'eye' }, 'Data visualisation': { icon: 'train' },
  'Power BI': POWER_BI, 'Model training': { icon: 'train' }, Inference: { icon: 'infer' }, Validation: { icon: 'check' }, Datasets: { icon: 'db' },
  NumPy: g(siNumpy), pandas: g(siPandas), Matplotlib: { src: '/brand/tools/matplotlib.svg' }, OpenCV: g(siOpencv), 'scikit-learn': g(siScikitlearn),
  TensorFlow: g(siTensorflow), PyTorch: g(siPytorch), Flask: g(siFlask),
  ROS: g(siRos), RViz: { icon: 'cube' }, 'Sensor integrations': { icon: 'sensor' }, 'Arduino Nano': g(siArduino), 'Vision-based navigation models': { icon: 'eye' },
};

/**
 * Technical skills from the owner's portfolio and additions requested by the owner.
 * Items added from that site without a note there have short descriptive notes written here: review them.
 * Existing level values are retained; new skills need no proficiency rating. Ratings are not displayed.
 */
export interface SkillItem { name: string; code: string; color: string; level?: number; note: string }
export interface SkillCategory { name: string; blurb: string; items: SkillItem[] }

export const skillCategories: SkillCategory[] = [
  {
    "name": "Languages",
    "blurb": "The foundations for interactive websites, application logic and structured data.",
    "items": [
      {
        "name": "JavaScript",
        "code": "JS",
        "color": "#F7DF1E",
        "level": 4,
        "note": "Interactive behaviour and application logic"
      },
      {
        "name": "TypeScript",
        "code": "TS",
        "color": "#3178C6",
        "level": 4,
        "note": "Typed components and application code"
      },
      {
        "name": "Python",
        "code": "Py",
        "color": "#3776AB",
        "level": 3,
        "note": "Automation, data processing and scripting"
      },
      {
        "name": "HTML",
        "code": "HT",
        "color": "#E34F26",
        "level": 4,
        "note": "Semantic structure and accessible content"
      },
      {
        "name": "CSS",
        "code": "CSS",
        "color": "#1572B6",
        "level": 4,
        "note": "Responsive layouts and visual styling"
      },
      {
        "name": "SQL",
        "code": "SQL",
        "color": "#CC8A3B",
        "level": 3,
        "note": "Queries and relational data modelling"
      }
    ]
  },
  {
    "name": "Frontend",
    "blurb": "Responsive interfaces and interactive applications for the web.",
    "items": [
      {
        "name": "React",
        "code": "Re",
        "color": "#61DAFB",
        "level": 4,
        "note": "Components, hooks and state"
      },
      {
        "name": "Vite",
        "code": "Vi",
        "color": "#646CFF",
        "level": 4,
        "note": "Builds and dev tooling"
      },
      {
        "name": "Tailwind CSS",
        "code": "Tw",
        "color": "#38BDF8",
        "level": 3,
        "note": "Utility-first styling"
      },
      {
        "name": "Streamlit",
        "code": "St",
        "color": "#FF4B4B",
        "level": 3,
        "note": "Quick data apps and internal tools in Python"
      }
    ]
  },
  {
    "name": "3D & animation",
    "blurb": "Interactive 3D, custom shaders and motion that responds to the page.",
    "items": [
      {
        "name": "Three.js",
        "code": "3D",
        "color": "#FFFFFF",
        "level": 4,
        "note": "WebGL scenes and shaders"
      },
      {
        "name": "GSAP",
        "code": "Gs",
        "color": "#88CE02",
        "level": 4,
        "note": "Timeline animation"
      },
      {
        "name": "WebGL",
        "code": "GL",
        "color": "#E99090",
        "note": "GPU-rendered graphics and interactive 3D scenes in the browser"
      },
      {
        "name": "GLSL shaders",
        "code": "Sh",
        "color": "#C792FF",
        "note": "Custom lighting, colour and visual effects through shader code"
      },
      {
        "name": "Scroll animation",
        "code": "Sc",
        "color": "#88CE02",
        "note": "Scroll-driven sequences, reveals and coordinated motion"
      },
      {
        "name": "3D lighting & materials",
        "code": "3D",
        "color": "#7FD4FF",
        "note": "Shaping depth with light, glass, reflections and surface materials"
      }
    ]
  },
  {
    "name": "Backend",
    "blurb": "APIs, background tasks and deployment for the systems behind the interface.",
    "items": [
      {
        "name": "Node.js",
        "code": "No",
        "color": "#5FA04E",
        "level": 4,
        "note": "APIs, jobs and servers"
      },
      {
        "name": "Cloudflare Workers",
        "code": "Cf",
        "color": "#F38020",
        "level": 3,
        "note": "Edge functions and R2 storage"
      },
      {
        "name": "Vercel",
        "code": "Vc",
        "color": "#EDEBE8",
        "level": 3,
        "note": "Serverless deploys"
      },
      {
        "name": "Render",
        "code": "Rn",
        "color": "#46E3B7",
        "level": 3,
        "note": "Hosted services and background workers"
      },
      {
        "name": "Netlify",
        "code": "Nf",
        "color": "#32E6E2",
        "level": 3,
        "note": "Static sites and serverless functions"
      }
    ]
  },
  {
    "name": "Database",
    "blurb": "Structured storage and connected data for websites and applications.",
    "items": [
      {
        "name": "PostgreSQL",
        "code": "Pg",
        "color": "#4169E1",
        "level": 3,
        "note": "Relational storage and structured queries"
      },
      {
        "name": "SQLite",
        "code": "Sq",
        "color": "#0F80CC",
        "level": 3,
        "note": "Lightweight databases for local applications"
      },
      {
        "name": "Cloudflare D1",
        "code": "D1",
        "color": "#F38020",
        "level": 3,
        "note": "SQL storage for edge applications"
      },
      {
        "name": "Supabase",
        "code": "Sb",
        "color": "#3ECF8E",
        "level": 3,
        "note": "Postgres-backed data and authentication"
      },
      {
        "name": "Firebase",
        "code": "Fb",
        "color": "#FFCA28",
        "level": 3,
        "note": "Realtime data and application services"
      },
      {
        "name": "MySQL",
        "code": "My",
        "color": "#4479A1",
        "level": 3,
        "note": "Relational storage for web applications"
      },
      {
        "name": "Cloudflare R2",
        "code": "R2",
        "color": "#F38020",
        "level": 3,
        "note": "Object storage for files and media"
      }
    ]
  },
  {
    "name": "APIs",
    "blurb": "Connecting payments, AI and communication to the rest of your product.",
    "items": [
      {
        "name": "REST APIs",
        "code": "API",
        "color": "#8B8BFF",
        "level": 4,
        "note": "Designing and consuming JSON APIs"
      },
      {
        "name": "Razorpay",
        "code": "Rp",
        "color": "#3395FF",
        "level": 4,
        "note": "Payments, webhooks and refunds"
      },
      {
        "name": "AI APIs",
        "code": "AI",
        "color": "#D97757",
        "level": 4,
        "note": "Gemini and Claude assistants"
      },
      {
        "name": "Webhooks",
        "code": "Wh",
        "color": "#C73A63",
        "level": 3,
        "note": "Signed event delivery"
      },
      {
        "name": "Email (SMTP)",
        "code": "@",
        "color": "#9AA3AF",
        "level": 3,
        "note": "Receipts, alerts and auto-replies"
      },
      {
        "name": "ipstack",
        "code": "ip",
        "color": "#5A8DEE",
        "level": 3,
        "note": "IP geolocation lookups"
      }
    ]
  },
  {
    "name": "DevOps & tools",
    "blurb": "Shipping, running and testing software reliably, from the repository to production.",
    "items": [
      {
        "name": "Docker",
        "code": "Dk",
        "color": "#2496ED",
        "level": 3,
        "note": "Containerised, reproducible environments"
      },
      {
        "name": "Kubernetes",
        "code": "K8",
        "color": "#326CE5",
        "level": 3,
        "note": "Orchestrating containers at scale"
      },
      {
        "name": "CI/CD pipelines",
        "code": "CI",
        "color": "#9AA3AF",
        "level": 3,
        "note": "Automated builds, tests and deploys"
      },
      {
        "name": "Linux",
        "code": "Lx",
        "color": "#FCC624",
        "level": 3,
        "note": "Servers, shells and system administration"
      },
      {
        "name": "Networking",
        "code": "Nw",
        "color": "#7FD4FF",
        "level": 3,
        "note": "Ports, DNS, proxies and secure tunnels"
      },
      {
        "name": "Git",
        "code": "Gt",
        "color": "#F05032",
        "level": 3,
        "note": "Version control and branching"
      },
      {
        "name": "GitHub",
        "code": "GH",
        "color": "#E6EDF3",
        "level": 3,
        "note": "Repositories, reviews and Actions"
      },
      {
        "name": "Cloudflared",
        "code": "Ct",
        "color": "#F38020",
        "level": 3,
        "note": "Tunnels that expose local services safely"
      },
      {
        "name": "Playwright",
        "code": "Pw",
        "color": "#2EAD33",
        "level": 3,
        "note": "End-to-end browser testing and screenshots"
      }
    ]
  },
  {
    "name": "AI tools",
    "blurb": "AI assistants woven into how we design, write and ship code.",
    "items": [
      {
        "name": "Claude",
        "code": "Cl",
        "color": "#D97757",
        "level": 3,
        "note": "Reasoning, writing and code assistance"
      },
      {
        "name": "Claude Code",
        "code": "CC",
        "color": "#D97757",
        "level": 3,
        "note": "Agentic coding in the terminal"
      },
      {
        "name": "Codex",
        "code": "Cx",
        "color": "#E6EDF3",
        "level": 3,
        "note": "AI pair programming"
      },
      {
        "name": "Antigravity",
        "code": "Ag",
        "color": "#8AB4F8",
        "level": 3,
        "note": "Agent-first development environment"
      },
      {
        "name": "GitHub Copilot",
        "code": "Co",
        "color": "#8957E5",
        "level": 3,
        "note": "Inline code suggestions"
      }
    ]
  },
  {
    "name": "AI & automation",
    "blurb": "Connecting knowledge and applications through AI and automated workflows.",
    "items": [
      {
        "name": "RAG",
        "code": "RAG",
        "color": "#C792FF",
        "note": "Retrieval-augmented generation: answers grounded in relevant documents"
      },
      {
        "name": "n8n workflows",
        "code": "n8n",
        "color": "#EA4B71",
        "note": "Connecting apps, triggers and actions into automated workflows"
      }
    ]
  },
  {
    "name": "Data & analytics",
    "blurb": "Turning raw data into clear findings, visualisations and useful reports.",
    "items": [
      {
        "name": "Data analysis",
        "code": "DA",
        "color": "#7FD4FF",
        "note": "Interpreting data to answer questions and support decisions"
      },
      {
        "name": "Data cleaning",
        "code": "DC",
        "color": "#46E3B7",
        "note": "Handling missing values, duplicates and inconsistent formats"
      },
      {
        "name": "Exploratory data analysis",
        "code": "EDA",
        "color": "#FFB347",
        "note": "Exploring patterns, distributions and outliers in datasets"
      },
      {
        "name": "Data visualisation",
        "code": "DV",
        "color": "#9CDCFE",
        "note": "Communicating findings through clear charts and dashboards"
      },
      {
        "name": "Power BI",
        "code": "BI",
        "color": "#F2C811",
        "level": 3,
        "note": "Dashboards and reports from live data"
      }
    ]
  },
  {
    "name": "Data & ML",
    "blurb": "Preparing training data, building models and evaluating their performance.",
    "items": [
      {
        "name": "Model training",
        "code": "Mt",
        "color": "#C792FF",
        "level": 3,
        "note": "Training and evaluating machine-learning models"
      },
      {
        "name": "Inference",
        "code": "In",
        "color": "#C792FF",
        "level": 3,
        "note": "Running trained models on real inputs"
      },
      {
        "name": "Validation",
        "code": "Va",
        "color": "#9CDCFE",
        "level": 3,
        "note": "Measuring model accuracy before deployment"
      },
      {
        "name": "Datasets",
        "code": "Ds",
        "color": "#FFB347",
        "level": 3,
        "note": "Collecting, labelling and preparing training data"
      }
    ]
  },
  {
    "name": "Python libraries",
    "blurb": "The scientific Python stack for data, vision and machine learning.",
    "items": [
      {
        "name": "NumPy",
        "code": "Np",
        "color": "#4DABCF",
        "level": 3,
        "note": "Numerical arrays and maths"
      },
      {
        "name": "pandas",
        "code": "pd",
        "color": "#E70488",
        "level": 3,
        "note": "Tabular data wrangling"
      },
      {
        "name": "Matplotlib",
        "code": "Mp",
        "color": "#11557C",
        "level": 3,
        "note": "Charts and plots"
      },
      {
        "name": "OpenCV",
        "code": "CV",
        "color": "#5C3EE8",
        "level": 3,
        "note": "Image and video processing"
      },
      {
        "name": "scikit-learn",
        "code": "sk",
        "color": "#F7931E",
        "level": 3,
        "note": "Classical machine learning"
      },
      {
        "name": "TensorFlow",
        "code": "TF",
        "color": "#FF6F00",
        "level": 3,
        "note": "Deep learning models"
      },
      {
        "name": "PyTorch",
        "code": "PT",
        "color": "#EE4C2C",
        "level": 3,
        "note": "Deep learning research and training"
      },
      {
        "name": "Flask",
        "code": "Fl",
        "color": "#E6EDF3",
        "level": 3,
        "note": "Lightweight Python web services"
      }
    ]
  },
  {
    "name": "Robotics",
    "blurb": "Bringing software into the physical world through sensors, firmware and vision.",
    "items": [
      {
        "name": "ROS",
        "code": "ROS",
        "color": "#8FA8CC",
        "level": 3,
        "note": "Robot Operating System nodes, topics and tooling"
      },
      {
        "name": "RViz",
        "code": "Rv",
        "color": "#8FA8CC",
        "level": 3,
        "note": "3D visualisation of robot state and sensor data"
      },
      {
        "name": "Sensor integrations",
        "code": "Se",
        "color": "#7FD4FF",
        "level": 3,
        "note": "Wiring, reading and calibrating robot sensors"
      },
      {
        "name": "Arduino Nano",
        "code": "An",
        "color": "#00A3AD",
        "level": 3,
        "note": "Compact microcontroller builds and firmware"
      },
      {
        "name": "Vision-based navigation models",
        "code": "Vn",
        "color": "#FFB347",
        "level": 3,
        "note": "Camera-driven models that guide a robot"
      }
    ]
  }
];

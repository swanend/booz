import {
  intro,
  select,
  text,
  confirm,
  isCancel,
  cancel,
  outro,
  spinner,
} from "@clack/prompts";
import figlet from "figlet";
import fs from "fs-extra";
import path from "path";
import Handlebars from "handlebars";
import { execSync } from "child_process";
import chalk from "chalk";
import gradient from "gradient-string";
import { fileURLToPath } from "url";

type FrontendStack = "react" | "vue" | "nextjs";
type BackendStack = "node-ts" | "hono";
type PackageManager = "pnpm" | "npm" | "yarn";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE_DIR = fs.existsSync(path.join(__dirname, "../templates"))
  ? path.join(__dirname, "../templates")
  : path.join(__dirname, "templates");

async function renderTemplates(
  templatePath: string,
  destinationPath: string,
  context: Record<string, any>
) {
  await fs.ensureDir(destinationPath);
  const entries = await fs.readdir(templatePath, { withFileTypes: true });

  for (const entry of entries) {
    const src = path.join(templatePath, entry.name);
    const dest = path.join(destinationPath, entry.name.replace(/\.hbs$/, ""));

    if (entry.isDirectory()) {
      await renderTemplates(src, dest, context);
    } else if (entry.name.endsWith(".hbs")) {
      try {
        const content = await fs.readFile(src, "utf8");
        const template = Handlebars.compile(content);
        const rendered = template(context);
        await fs.outputFile(dest, rendered);
      } catch (err) {
        console.log(`❌ Failed to compile template: ${src}`);
        throw err;
      }
    } else {
      await fs.copy(src, dest);
    }
  }
}

async function main() {
  const banner = figlet.textSync("BOOZ", { font: "ANSI Shadow" });
  console.log(chalk.hex("#ff69b4")(banner));
  intro("Welcome to BOOZ! 🐐");

  const projectType = await select({
    message: "What type of project do you want to create?",
    options: [
      {
        label: gradient(["#4facfe", "#00f2fe"])("Frontend"),
        value: "frontend",
      },
      {
        label: gradient(["#43e97b", "#38f9d7"])("Backend"),
        value: "backend",
      },
      {
        label: chalk.cyan("Fullstack (Frontend + Backend)"),
        value: "fullstack",
      },
    ],
  });
  if (isCancel(projectType)) return cancel("Operation cancelled.");

  let frontend: FrontendStack | null = null;
  let backend: BackendStack | null = null;

  if (projectType === "frontend" || projectType === "fullstack") {
    const frontendChoice = await select({
      message: "Choose a frontend framework:",
      options: [
        {
          label: chalk.hex("#1dc4e9")("React"),
          value: "react",
          hint: "(vite+ts)",
        },
        {
          label: gradient(["#00ff7f", "#00d084"])("Vue"),
          value: "vue",
        },
        {
          label: chalk.white("Next.js"),
          value: "nextjs",
        },
      ],
    });
    if (isCancel(frontendChoice)) return cancel("Operation cancelled.");
    frontend = frontendChoice as FrontendStack;
  }

  if (projectType === "backend" || projectType === "fullstack") {
    const backendChoice = await select({
      message: "Choose a backend framework:",
      options: [
        {
          label: chalk.hex("#ff6a00")("Hono🔥"),
          value: "hono",
        },
        {
          label: chalk.green("node-ts"),
          value: "node-ts",
          hint: "Node + Express + TypeScript",
        },
      ],
    });
    if (isCancel(backendChoice)) return cancel("Operation cancelled.");
    backend = backendChoice as BackendStack;
  }

  const name = await text({
    message: "Enter the project name:",
    placeholder: "my-app",
    initialValue: "my-app",
  });
  if (isCancel(name)) return cancel("Operation cancelled.");

  const installDeps = await confirm({
    message: "Install dependencies after setup?",
    initialValue: true,
  });
  if (isCancel(installDeps)) return cancel("Operation cancelled.");

  let packageManager: PackageManager = "npm";
  if (installDeps) {
    const pm = await select({
      message: "Choose a package manager:",
      options: [
        { label: chalk.yellow("pnpm"), value: "pnpm" },
        { label: chalk.red("npm"), value: "npm" },
        { label: chalk.cyan("yarn"), value: "yarn" },
      ],
      initialValue: "pnpm",
    });
    if (isCancel(pm)) return cancel("Operation cancelled.");
    packageManager = pm as PackageManager;
  }

  const context = { name };
  const sanitizedName = name.replace(/\s+/g, "-");
  const projectPath = path.join(process.cwd(), sanitizedName);

  try {
    if (projectType === "frontend") {
      const src = path.join(TEMPLATE_DIR, "frontend", frontend!);
      if (!(await fs.pathExists(src)))
        return cancel(`❌ Template not found: ${src}`);
      const s = spinner();
      s.start("📦 Rendering frontend template...");
      await renderTemplates(src, projectPath, context);
      s.stop("✅ Frontend template rendered.");
    } else if (projectType === "backend") {
      const src = path.join(TEMPLATE_DIR, "backend", backend!);
      if (!(await fs.pathExists(src)))
        return cancel(`❌ Template not found: ${src}`);
      const s = spinner();
      s.start("📦 Rendering backend template...");
      await renderTemplates(src, projectPath, context);
      s.stop("✅ Backend template rendered.");
    } else if (projectType === "fullstack") {
      const frontendSrc = path.join(TEMPLATE_DIR, "frontend", frontend!);
      const backendSrc = path.join(TEMPLATE_DIR, "backend", backend!);
      const frontendDest = path.join(projectPath, "client");
      const backendDest = path.join(projectPath, "server");

      if (!(await fs.pathExists(frontendSrc)))
        return cancel(`❌ Frontend template not found: ${frontendSrc}`);
      if (!(await fs.pathExists(backendSrc)))
        return cancel(`❌ Backend template not found: ${backendSrc}`);

      const s = spinner();
      s.start("📦 Rendering frontend and backend templates...");
      await renderTemplates(frontendSrc, frontendDest, context);
      await renderTemplates(backendSrc, backendDest, context);
      s.stop("✅ Fullstack templates rendered.");
    }

    const sGit = spinner();
    sGit.start("🔧 Initializing git repository...");
    execSync(`git init`, { stdio: "ignore", cwd: projectPath });
    sGit.stop("✅ Git repository initialized.");

    if (installDeps) {
      if (projectType === "fullstack") {
        const clientDir = path.join(projectPath, "client");
        const serverDir = path.join(projectPath, "server");

        const frontSpin = spinner();
        frontSpin.start("📦 Installing frontend dependencies...");
        execSync(`${packageManager} install`, {
          stdio: "inherit",
          cwd: clientDir,
        });
        frontSpin.stop("✅ Frontend dependencies installed.");

        const backSpin = spinner();
        backSpin.start("📦 Installing backend dependencies...");
        execSync(`${packageManager} install`, {
          stdio: "inherit",
          cwd: serverDir,
        });
        backSpin.stop("✅ Backend dependencies installed.");
      } else {
        const depSpin = spinner();
        depSpin.start("📦 Installing dependencies...");
        execSync(`${packageManager} install`, {
          stdio: "inherit",
          cwd: projectPath,
        });
        depSpin.stop("✅ Dependencies installed.");
      }
    }

    outro("🚀 Project setup complete!");
  } catch (err) {
    cancel("❌ Setup failed.");
    console.error(err);
  }
}

main();

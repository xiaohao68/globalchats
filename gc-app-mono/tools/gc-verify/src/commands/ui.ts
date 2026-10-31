import { Command } from "commander";
import { spawn } from "child_process";
import { join } from "path";
import chalk from "chalk";

const APP_DIR = join(process.cwd(), "apps/global-chat-desktop");

export const uiCommand = new Command("ui").description("UI 测试命令");

uiCommand
  .command("test")
  .description("运行 Playwright UI 测试")
  .option("--grep <pattern>", "过滤测试")
  .option("--debug", "调试模式")
  .option("--ui", "使用 Playwright UI 模式")
  .action(async (options) => {
    const args = ["playwright", "test"];

    if (options.grep) {
      args.push("--grep", options.grep);
    }
    if (options.debug) {
      args.push("--debug");
    }
    if (options.ui) {
      args.push("--ui");
    }

    console.log(chalk.blue(`运行 UI 测试...`));
    console.log(chalk.dim(`目录: ${APP_DIR}`));

    const proc = spawn("bunx", args, {
      cwd: APP_DIR,
      stdio: "inherit",
    });

    proc.on("close", (code) => {
      process.exit(code || 0);
    });
  });

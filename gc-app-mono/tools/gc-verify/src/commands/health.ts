import { Command } from "commander";
import chalk from "chalk";

const APP_PORT = 1420;
const APP_URL = `http://localhost:${APP_PORT}`;

async function checkPort(port: number): Promise<boolean> {
  try {
    const response = await fetch(`http://localhost:${port}`, {
      method: "HEAD",
      signal: AbortSignal.timeout(2000),
    });
    return response.ok || response.status < 500;
  } catch {
    return false;
  }
}

async function checkHealth(options: {
  wait?: boolean;
  timeout?: number;
}): Promise<void> {
  const timeout = options.timeout || 30000;
  const startTime = Date.now();

  console.log(chalk.blue(`检查 Global Chats 应用状态...`));
  console.log(chalk.dim(`目标: ${APP_URL}\n`));

  if (options.wait) {
    console.log(chalk.yellow(`等待应用就绪 (超时: ${timeout / 1000}s)...`));

    while (Date.now() - startTime < timeout) {
      const isHealthy = await checkPort(APP_PORT);
      if (isHealthy) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(chalk.green(`\n应用已就绪! (耗时: ${elapsed}s)`));
        process.exit(0);
      }
      process.stdout.write(".");
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.log(chalk.red(`\n超时: 应用在 ${timeout / 1000}s 内未就绪`));
    process.exit(1);
  } else {
    const isHealthy = await checkPort(APP_PORT);

    if (isHealthy) {
      console.log(chalk.green("状态: 运行中"));
      console.log(chalk.green(`端口 ${APP_PORT}: 可访问`));
      process.exit(0);
    } else {
      console.log(chalk.red("状态: 未运行"));
      console.log(chalk.red(`端口 ${APP_PORT}: 不可访问`));
      console.log(chalk.yellow("\n提示: 请启动 Global Chats 应用"));
      console.log(chalk.dim("  cd apps/global-chat-desktop && task dev"));
      process.exit(1);
    }
  }
}

export const healthCommand = new Command("health")
  .description("检查应用健康状态")
  .option("-w, --wait", "等待应用就绪")
  .option("-t, --timeout <ms>", "等待超时时间 (毫秒)", "30000")
  .action(async (options) => {
    await checkHealth({
      wait: options.wait,
      timeout: parseInt(options.timeout, 10),
    });
  });

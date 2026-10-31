#!/usr/bin/env node
import { Command } from "commander";
import { logCommand } from "./commands/log.js";
import { healthCommand } from "./commands/health.js";
import { uiCommand } from "./commands/ui.js";

const program = new Command();

program
  .name("gc-verify")
  .description("Global Chats 验证工具")
  .version("0.0.0");

program.addCommand(logCommand);
program.addCommand(healthCommand);
program.addCommand(uiCommand);

program.parse();

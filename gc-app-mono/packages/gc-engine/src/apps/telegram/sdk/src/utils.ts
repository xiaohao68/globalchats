class Logger {
  recv(...args: any[]) {
    console.log(
      "%c Recv ",
      "background: #4CAF50; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold;",
      ...args,
    );
  }

  warning(...args: any[]) {
    console.log(
      "%c Warning ",
      "background: #FF9800; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold;",
      ...args,
    );
  }

  error(...args: any[]) {
    console.log(
      "%c Error ",
      "background: #f44336; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold;",
      ...args,
    );
  }
}

export const log = new Logger();

import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import input from "input"; // npm i input
// fill this later with the value from session.save()

class TelegramSDKClient {
  apiId = 2496;
  apiHash = "8da85b0d5bfe62527e5b244c209159c3";
  stringSession = new StringSession("");
  async mount() {
    console.log("Loading interactive example...");
    const client = new TelegramClient(
      this.stringSession,
      this.apiId,
      this.apiHash,
      {
        connectionRetries: 5,
      },
    );
    await client.start({
      phoneNumber: async () => await input.text("Please enter your number: "),
      password: async () => await input.text("Please enter your password: "),
      phoneCode: async () =>
        await input.text("Please enter the code you received: "),
      onError: (err) => console.log(err),
    });
    console.log("You should now be connected.");
    console.log(client.session.save()); // Save this string to avoid logging in again
    await client.sendMessage("me", { message: "Hello!" });
  }
}

export const telegramSdkClient = new TelegramSDKClient();
